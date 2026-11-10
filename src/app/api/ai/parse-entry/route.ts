// Cost: ~5.4k calls/month at 20 active users ≈ $0.40/mo on the fast tier; re-evaluate at 1,000 DAU. See REWORK_PLAN.md R8 cost check.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { isAIEnabled } from "@/lib/llm/provider";
import { generateStructured } from "@/lib/ai/generate";
import { BadRequestError } from "@/lib/errors";
import { applyRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { normalizeProductTerm } from "@habita/prices";
import { expenseCategorySchema, taskFrequencySchema, parseEntryInputSchema, parseEntryResponseSchema } from "@habita/contracts";

import type { NextRequest } from "next/server";
import type { ParseEntryResponse } from "@habita/contracts";

const EXPENSE_CATEGORIES = expenseCategorySchema.options;
const TASK_FREQUENCIES = taskFrequencySchema.options;

const aiResultSchema = z.object({
  kind: z.enum(["expense", "task", "item", "unknown"]).describe("the entry type detected in the text"),
  expense: z
    .object({
      title: z.string(),
      amount: z.number(),
      currency: z.string().describe("ISO currency code, default ARS"),
      category: z.string().describe(`one of: ${EXPENSE_CATEGORIES.join(", ")}`),
      paidByName: z.string().nullable().describe("first name of who paid, or null"),
      splitWithNames: z.array(z.string()).describe("first names to split the expense with"),
      date: z.string().nullable().describe("ISO date (YYYY-MM-DD) resolved from relative mentions, or null"),
      notes: z.string().nullable(),
    })
    .nullable(),
  task: z
    .object({
      name: z.string(),
      frequency: z.string().describe(`one of: ${TASK_FREQUENCIES.join(", ")}`),
      dueDate: z.string().nullable().describe("ISO date (YYYY-MM-DD), or null"),
      assigneeName: z.string().nullable().describe("first name of who should do it, or null"),
      estimatedMinutes: z.number().nullable(),
    })
    .nullable(),
  items: z.array(z.object({ name: z.string(), quantity: z.number() })).nullable(),
});

type AiParseResult = z.infer<typeof aiResultSchema>;

function normalizeFirstName(name: string): string {
  return normalizeProductTerm(name.trim().split(/\s+/)[0] ?? "");
}

/** Maps normalized first name -> memberId; ambiguous (shared first name) maps to null. */
function buildFirstNameIndex(members: Array<{ id: string; name: string }>): Map<string, string | null> {
  const index = new Map<string, string | null>();
  for (const member of members) {
    const key = normalizeFirstName(member.name);
    if (!key) continue;
    index.set(key, index.has(key) ? null : member.id);
  }
  return index;
}

function resolveMemberId(name: string | null, index: Map<string, string | null>): string | null {
  if (!name) return null;
  return index.get(normalizeFirstName(name)) ?? null;
}

function resolveMemberIds(names: string[], index: Map<string, string | null>): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const id = resolveMemberId(name, index);
    if (id) ids.push(id);
  }
  return ids;
}

function todayInTimezone(timezone: string | null): string {
  const tz = timezone ?? "America/Argentina/Buenos_Aires";
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

function buildPrompt(params: { text: string; firstNames: string[]; today: string }): string {
  const { text, firstNames, today } = params;
  return `Sos un asistente que clasifica texto libre en español argentino sobre el hogar en una de estas categorías: gasto, tarea, item de lista de compras, o desconocido.

Hoy es ${today} (formato YYYY-MM-DD). Usá esta fecha para resolver menciones relativas como "ayer", "el viernes", "mañana".

Miembros del hogar (nombres): ${firstNames.length > 0 ? firstNames.join(", ") : "(sin miembros registrados)"}

El usuario escribió: "${text}"

Reglas:
- kind "expense": el texto describe un gasto de dinero (ej: "Sofi pagó 5000 de luz"). Completá "expense" y dejá "task"/"items" en null.
- kind "task": el texto describe una tarea del hogar a realizar (ej: "que lo haga Tomi el viernes"). Completá "task" y dejá "expense"/"items" en null.
- kind "item": el texto describe uno o más productos para la lista de compras (ej: "comprar 2 leches y pan"). Completá "items" y dejá "expense"/"task" en null.
- kind "unknown": el texto no encaja en ninguna de las anteriores. Dejá los tres campos en null.
- Para nombres de personas, usá el primer nombre tal como aparece en la lista de miembros cuando coincida.
- currency por defecto "ARS" si no se menciona otra.

Respondé SOLO con JSON válido, sin texto adicional.`;
}

function buildResponse(result: AiParseResult, nameIndex: Map<string, string | null>): ParseEntryResponse {
  if (result.kind === "expense" && result.expense) {
    const categoryResult = expenseCategorySchema.safeParse(result.expense.category);
    const category = categoryResult.success ? categoryResult.data : "OTHER";

    return {
      kind: "expense",
      expense: {
        title: result.expense.title,
        amount: result.expense.amount,
        currency: result.expense.currency || "ARS",
        category,
        paidByName: result.expense.paidByName,
        paidByMemberId: resolveMemberId(result.expense.paidByName, nameIndex),
        splitWithNames: result.expense.splitWithNames,
        splitWithMemberIds: resolveMemberIds(result.expense.splitWithNames, nameIndex),
        date: result.expense.date,
        notes: result.expense.notes,
      },
    };
  }

  if (result.kind === "task" && result.task) {
    const frequencyResult = taskFrequencySchema.safeParse(result.task.frequency);
    const frequency = frequencyResult.success ? frequencyResult.data : "ONCE";

    return {
      kind: "task",
      task: {
        name: result.task.name,
        frequency,
        dueDate: result.task.dueDate,
        assigneeName: result.task.assigneeName,
        assigneeMemberId: resolveMemberId(result.task.assigneeName, nameIndex),
        estimatedMinutes: result.task.estimatedMinutes,
      },
    };
  }

  const validItems = (result.items ?? []).filter((item) => Number.isFinite(item.quantity));
  if (result.kind === "item" && validItems.length > 0) {
    return {
      kind: "item",
      items: validItems.slice(0, 20).map((item) => ({
        name: item.name,
        quantity: Math.min(99, Math.max(1, Math.round(item.quantity))),
      })),
    };
  }

  return { kind: "unknown" };
}

/**
 * POST /api/ai/parse-entry
 * Classifies free-text household input (Spanish AR) into an expense, a task,
 * shopping-list items, or unknown, resolving mentioned names to member ids.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const limited = await applyRateLimit(request, "parse", member.id);
    if (limited) return limited;

    if (!isAIEnabled()) {
      return NextResponse.json({ error: "ai_disabled" }, { status: 503 });
    }

    const body: unknown = await request.json();
    const parsed = parseEntryInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError("text es requerido (3-200 caracteres)");
    }
    const { text } = parsed.data;

    const members = await prisma.member.findMany({
      where: { householdId: member.householdId, isActive: true },
      select: { id: true, name: true },
    });
    const nameIndex = buildFirstNameIndex(members);
    const firstNames = [...new Set(members.map((m) => normalizeFirstName(m.name)).filter(Boolean))];

    const today = todayInTimezone(member.household.timezone);
    const prompt = buildPrompt({ text, firstNames, today });

    let result: AiParseResult;
    try {
      result = await generateStructured({
        task: "parse-entry",
        schema: aiResultSchema,
        prompt,
        tier: "fast",
        timeoutMs: 10_000,
      });
    } catch (error) {
      console.error("[parse-entry] AI provider failed:", error);
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }

    const response = parseEntryResponseSchema.parse(buildResponse(result, nameIndex));

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/parse-entry", method: "POST" });
  }
}
