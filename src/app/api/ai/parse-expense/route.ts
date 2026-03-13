import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { getLLMProvider, isAIEnabled } from "@/lib/llm/provider";
import { BadRequestError } from "@/lib/errors";

const inputSchema = z.object({
  text: z.string().min(3).max(200),
});

const EXPENSE_CATEGORIES = [
  "GROCERIES",
  "UTILITIES",
  "RENT",
  "FOOD",
  "TRANSPORT",
  "HEALTH",
  "ENTERTAINMENT",
  "EDUCATION",
  "HOME",
  "OTHER",
] as const;

const outputSchema = {
  title: "string — short descriptive name for the expense (2-5 words, title case, Spanish)",
  amount: "number — the amount in ARS (just the number, no currency symbol)",
  category: `string — one of: ${EXPENSE_CATEGORIES.join(", ")}`,
  notes: "string or null — any extra context mentioned",
  parsed: "boolean — true if successfully parsed, false if the input doesn't describe an expense",
};

/**
 * POST /api/ai/parse-expense
 * Parses a natural language expense description in Spanish AR.
 * e.g. "Gasté 1500 en el super" → { title: "Supermercado", amount: 1500, category: "GROCERIES" }
 */
export async function POST(request: Request) {
  try {
    await requireMember();

    if (!isAIEnabled()) {
      return NextResponse.json({ error: "ai_disabled" }, { status: 503 });
    }

    const body = await request.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError("text is required (3-200 chars)");
    }

    const { text } = parsed.data;

    const prompt = `Sos un asistente que extrae datos de gastos del hogar desde texto en español argentino.

El usuario escribió: "${text}"

Extraé los campos del gasto. Reglas:
- title: nombre corto del gasto (ej: "Supermercado", "Nafta", "Delivery pizza", "Electricidad")
- amount: el monto numérico en pesos argentinos (sin símbolo ni puntos de miles)
- category: la categoría más apropiada
- notes: contexto adicional si mencionó algo relevante (ej: nombre del local, quién pagó), o null
- parsed: true si el texto describe claramente un gasto, false si no se entiende

Categorías disponibles:
- GROCERIES: supermercado, almacén, verdulería, carnicería, lácteos
- FOOD: restaurant, delivery, café, bar, pizza, facturas
- TRANSPORT: nafta, taxi, UBER, colectivo, tren, peaje, estacionamiento
- UTILITIES: luz, gas, agua, internet, teléfono, cable
- RENT: alquiler, expensas
- HEALTH: farmacia, médico, dentista, gimnasio, veterinario
- ENTERTAINMENT: cine, teatro, streaming, juegos, libros
- EDUCATION: colegio, universidad, cursos, útiles
- HOME: ferretería, muebles, electrodomésticos, limpieza del hogar
- OTHER: cualquier otra cosa

Respondé SOLO con JSON válido, sin texto adicional.`;

    const llm = await getLLMProvider();
    const result = await llm.completeWithSchema<{
      title: string;
      amount: number;
      category: string;
      notes: string | null;
      parsed: boolean;
    }>({
      prompt,
      outputSchema,
      modelVariant: "fast",
      timeoutMs: 10_000,
    });

    if (!result.parsed) {
      return NextResponse.json({ error: "no_parse" }, { status: 422 });
    }

    // Validate category is one of the allowed values
    const category = EXPENSE_CATEGORIES.includes(result.category as (typeof EXPENSE_CATEGORIES)[number])
      ? result.category
      : "OTHER";

    return NextResponse.json({
      title: result.title,
      amount: result.amount,
      category,
      notes: result.notes ?? undefined,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/parse-expense", method: "POST" });
  }
}
