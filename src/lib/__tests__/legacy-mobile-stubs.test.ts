import { afterEach, describe, expect, it, vi } from "vitest";

const { requireMemberMock } = vi.hoisted(() => ({
  requireMemberMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireMember: requireMemberMock }));

import { GET as getBriefing } from "@/app/api/(legacy-mobile)/briefing/route";
import { GET as getHealthScore } from "@/app/api/(legacy-mobile)/household/health-score/route";
import { POST as postCocina } from "@/app/api/(legacy-mobile)/ai/cocina/route";
import {
  GET as getSavedRecipes,
  POST as postSavedRecipes,
  DELETE as deleteSavedRecipes,
} from "@/app/api/(legacy-mobile)/saved-items/recipes/route";
import { POST as postPlanFeedback } from "@/app/api/(legacy-mobile)/plans/[planId]/feedback/route";

function buildMember() {
  return { id: "member-1", householdId: "household-1", memberType: "ADULT", name: "Tomi" };
}

describe("legacy mobile compat stubs", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/briefing returns a null-safe briefing object", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await getBriefing();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ greeting: "", summary: "", highlights: [], suggestion: "" });
  });

  it("GET /api/briefing requires auth", async () => {
    requireMemberMock.mockRejectedValue(new Error("Unauthorized"));

    const response = await getBriefing();

    expect(response.status).toBe(401);
  });

  it("GET /api/household/health-score returns a valid neutral score payload", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await getHealthScore();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.score).toBe(70);
    expect(json.components.tasks.total).toBe(40);
    expect(json.components.expenses.total).toBe(30);
    expect(json.components.balance.total).toBe(30);
  });

  it("POST /api/ai/cocina returns 410 with a user-facing message", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await postCocina();

    expect(response.status).toBe(410);
    const json = await response.json();
    expect(json.code).toBe("feature_removed");
    expect(json.error).toBe("Esta función ya no está disponible. Actualizá la app.");
  });

  it("GET /api/saved-items/recipes returns an empty list", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await getSavedRecipes();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("POST /api/saved-items/recipes returns 410", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await postSavedRecipes();

    expect(response.status).toBe(410);
    const json = await response.json();
    expect(json.code).toBe("feature_removed");
  });

  it("DELETE /api/saved-items/recipes returns 410", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await deleteSavedRecipes();

    expect(response.status).toBe(410);
    const json = await response.json();
    expect(json.code).toBe("feature_removed");
  });

  it("POST /api/plans/[planId]/feedback returns 410", async () => {
    requireMemberMock.mockResolvedValue(buildMember());

    const response = await postPlanFeedback();

    expect(response.status).toBe(410);
    const json = await response.json();
    expect(json.code).toBe("feature_removed");
  });
});
