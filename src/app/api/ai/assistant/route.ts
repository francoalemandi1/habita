import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { getLLMProvider } from "@/lib/llm/provider";
import { buildAssistantPrompt } from "@/lib/llm/prompts";
import { buildAssistantContext } from "@/lib/llm/assistant-context";
import { z } from "zod";

import type { AssistantOutput } from "@/lib/llm/types";
import type { NextRequest } from "next/server";

const assistantSchema = z.object({
  question: z.string().min(1, "question es requerido").max(2000),
});

const OUTPUT_SCHEMA = {
  answer: "string (respuesta principal)",
  suggestion: "string opcional (sugerencia accionable)",
};

/**
 * POST /api/ai/assistant
 * Asistente de preguntas (spec §4). Responde en el idioma de la pregunta.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const body: unknown = await request.json();
    const validation = assistantSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { question } = validation.data;

    const context = await buildAssistantContext(
      member.householdId,
      member.name
    );
    const prompt = buildAssistantPrompt({ ...context, question });

    const provider = getLLMProvider();
    let result: AssistantOutput;

    try {
      result = await provider.completeWithSchema<AssistantOutput>({
        prompt: `${prompt}\n\nResponde en JSON con "answer" y opcionalmente "suggestion".`,
        outputSchema: OUTPUT_SCHEMA,
        modelVariant: "standard",
      });
    } catch {
      result = {
        answer:
          "No pude procesar esa pregunta. Intenta de nuevo o reformula.",
        suggestion: undefined,
      };
    }

    if (!result.answer) {
      result.answer =
        "No pude generar una respuesta. Asegúrate de tener tareas y miembros configurados.";
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/assistant", method: "POST" });
  }
}
