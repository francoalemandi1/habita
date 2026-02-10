import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { generateAndApplyPlan } from "@/lib/llm/ai-planner";
import { isAIEnabled } from "@/lib/llm/provider";

/**
 * POST /api/ai/generate-plan
 * Generate and apply an AI-powered task distribution plan.
 * This creates actual assignments in the database.
 */
export async function POST() {
  try {
    const member = await requirePermission("task:assign");

    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: "AI features not configured. Set GOOGLE_GENERATIVE_AI_API_KEY or ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    const result = await generateAndApplyPlan(member.householdId);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/generate-plan", method: "POST" });
  }
}
