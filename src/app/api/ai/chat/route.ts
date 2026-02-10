import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { OpenRouter } from "@openrouter/sdk";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { buildAssistantContext } from "@/lib/llm/assistant-context";
import { buildAssistantSystemPrompt } from "@/lib/llm/prompts";
import { isAIEnabled, getAIProviderType } from "@/lib/llm/provider";
import { z } from "zod";

import type { NextRequest } from "next/server";
import type { LanguageModel } from "ai";

const chatSchema = z.object({
  message: z.string().min(1, "message es requerido").max(2000),
});

function getModel(): LanguageModel | null {
  const providerType = getAIProviderType();

  if (providerType === "openrouter") {
    // OpenRouter uses its own SDK, not Vercel AI SDK
    return null;
  }

  if (providerType === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google("gemini-1.5-flash");
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  return anthropic("claude-3-5-haiku-latest");
}

async function streamWithOpenRouter(systemPrompt: string, userPrompt: string) {
  const client = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const stream = await client.chat.send({
    chatGenerationParams: {
      model: "openrouter/auto",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    },
  });

  return stream;
}

/**
 * POST /api/ai/chat
 * Streaming chat endpoint for the AI assistant.
 * Returns a text stream for real-time UI updates.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    if (!isAIEnabled()) {
      return new Response(
        JSON.stringify({ error: "AI features not configured. Set OPENROUTER_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const body: unknown = await request.json();
    const validation = chatSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error.errors[0]?.message ?? "Invalid input" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message } = validation.data;

    // Build context from household data
    const context = await buildAssistantContext(member.householdId, member.name);

    const contextText = `
## Usuario actual
${context.currentUser}

## Miembros del hogar
${context.members}

## Tareas del hogar
${context.tasks}

## Actividad reciente
${context.recentActivity}

## Estadísticas por miembro (esta semana)
${context.memberStats}
`.trim();

    const fullPrompt = `${contextText}\n\n## Pregunta del usuario\n${message}`;
    const providerType = getAIProviderType();
    const systemPrompt = buildAssistantSystemPrompt(context.regionalBlock);

    // Handle OpenRouter streaming separately
    if (providerType === "openrouter") {
      const stream = await streamWithOpenRouter(systemPrompt, fullPrompt);

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // Use Vercel AI SDK for Gemini/Anthropic
    const model = getModel();
    if (!model) {
      return new Response(
        JSON.stringify({ error: "No model available" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: fullPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/chat", method: "POST" });
  }
}
