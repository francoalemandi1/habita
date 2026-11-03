/**
 * Jev (TypeSafe AI System One) client — typed discriminative decisions.
 *
 * Shadow-mode only today: callers must never let a missing key or a
 * request failure change production behavior. `askJev` always resolves,
 * never rejects.
 */

import { TypeSafeClient } from "@typesafe-ai/sdk";

import type { EntryType, Questions, SystemOneResult } from "@typesafe-ai/sdk";

export const JEV_MODEL = "jev-1.14.0";

const JEV_TIMEOUT_MS = 15_000;

let client: TypeSafeClient | null = null;

export function isJevEnabled(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY?.trim());
}

function getClient(): TypeSafeClient {
  if (!client) {
    client = new TypeSafeClient({ timeout: JEV_TIMEOUT_MS });
  }
  return client;
}

export interface AskJevParams<Q extends Questions> {
  task: string;
  state: NonNullable<EntryType>;
  questions: Q;
}

/**
 * Ask Jev a set of typed questions about some state.
 * Returns null when Jev is disabled or the request fails — never throws.
 */
export async function askJev<Q extends Questions>(
  params: AskJevParams<Q>,
): Promise<SystemOneResult<Q> | null> {
  if (!isJevEnabled()) return null;

  const { task, state, questions } = params;
  const start = Date.now();

  try {
    const result = await getClient().systemOne({
      model: JEV_MODEL,
      state,
      questions,
    });

    console.info("[ai]", {
      task,
      provider: "jev",
      model: result.model,
      inputTokens: result.usage.input_tokens,
      durationMs: Date.now() - start,
      ok: true,
    });

    return result;
  } catch (error) {
    console.error(`[ai] ${task} failed:`, error instanceof Error ? error.message : error);
    console.info("[ai]", {
      task,
      provider: "jev",
      model: JEV_MODEL,
      inputTokens: null,
      durationMs: Date.now() - start,
      ok: false,
    });

    return null;
  }
}
