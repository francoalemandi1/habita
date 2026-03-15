/**
 * Safely extract typed fields from the household's onboardingProfile JSON.
 * Platform-agnostic — works in both web and mobile.
 */

export interface TaskReason {
  taskName: string;
  reason: string;
}

export interface ParsedOnboardingProfile {
  dietaryHints: string[];
  shoppingContext: string[];
  insights: string[];
  rawDescription: string | null;
  taskReasons: TaskReason[];
}

const EMPTY_PROFILE: ParsedOnboardingProfile = {
  dietaryHints: [],
  shoppingContext: [],
  insights: [],
  rawDescription: null,
  taskReasons: [],
};

export function parseOnboardingProfile(
  raw: unknown,
): ParsedOnboardingProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return EMPTY_PROFILE;
  }

  const obj = raw as Record<string, unknown>;

  return {
    dietaryHints: extractStringArray(obj.dietaryHints, 100, 10),
    shoppingContext: extractStringArray(obj.shoppingContext, 200, 10),
    insights: extractStringArray(obj.insights, 500, 5),
    rawDescription: typeof obj.rawDescription === "string" ? obj.rawDescription.slice(0, 2000) : null,
    taskReasons: extractTaskReasons(obj.taskReasons),
  };
}

export interface OnboardingProfilePayload {
  dietaryHints: string[];
  shoppingContext: string[];
  insights: string[];
  rawDescription: string;
  taskReasons: TaskReason[];
}

/**
 * Build the onboardingProfile JSON payload from an AI setup response.
 * Used by both web and mobile onboarding flows.
 */
export function buildOnboardingProfilePayload(
  aiResult: {
    dietaryHints: string[];
    shoppingContext: string[];
    insights: string[];
    tasks: ReadonlyArray<{ name: string; reason?: string }>;
  },
  rawDescription: string,
): OnboardingProfilePayload {
  return {
    dietaryHints: aiResult.dietaryHints,
    shoppingContext: aiResult.shoppingContext,
    insights: aiResult.insights,
    rawDescription,
    taskReasons: aiResult.tasks
      .filter((t) => t.reason)
      .map((t) => ({ taskName: t.name, reason: t.reason! })),
  };
}

function extractTaskReasons(value: unknown): TaskReason[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is { taskName: string; reason: string } =>
      typeof v === "object" && v !== null &&
      typeof (v as Record<string, unknown>).taskName === "string" &&
      typeof (v as Record<string, unknown>).reason === "string"
    )
    .map((v) => ({
      taskName: v.taskName.slice(0, 100),
      reason: v.reason.slice(0, 200),
    }))
    .slice(0, 20);
}

export function extractStringArray(value: unknown, maxItemLength: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.slice(0, maxItemLength))
    .slice(0, maxItems);
}
