import { NextResponse } from "next/server";
import { requireMember } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";
import { getEligibleMembers, getAllActiveMembers } from "@/lib/roulette";

import type { NextRequest } from "next/server";

/**
 * GET /api/roulette/members?taskId=xxx
 * Get eligible members for a roulette spin on a specific task.
 * Omit taskId or pass "__custom__" to get all active non-absent members.
 */
export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    const taskId = request.nextUrl.searchParams.get("taskId");

    if (!taskId || taskId === "__custom__") {
      const members = await getAllActiveMembers(member.householdId);
      return NextResponse.json({ members });
    }

    const eligibleMembers = await getEligibleMembers(
      member.householdId,
      taskId,
    );

    return NextResponse.json({ members: eligibleMembers });
  } catch (error) {
    return handleApiError(error, { route: "/api/roulette/members", method: "GET" });
  }
}
