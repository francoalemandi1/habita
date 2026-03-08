import { NextResponse, after } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/session";
import { compareProducts } from "@/lib/supermarket-search";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { findRunningJob, markJobRunning, completeJob } from "@/lib/ai-jobs";

import type { NextRequest } from "next/server";
import type { AiJobTriggerResponse } from "@habita/contracts";

export const maxDuration = 60;

// ============================================
// Schema
// ============================================

const bodySchema = z.object({
  searchTerms: z.array(z.string().min(1).max(100)).max(100).optional(),
  searchItems: z.array(
    z.object({
      term: z.string().min(1).max(100),
      quantity: z.number().int().min(1).max(99),
    }),
  ).max(100).optional(),
  preferredBankSlugs: z.array(z.string().max(50)).max(10).optional(),
}).refine(
  (body) => (body.searchItems?.length ?? 0) > 0 || (body.searchTerms?.length ?? 0) > 0,
  { message: "Agregá al menos un producto" },
);

// ============================================
// Route
// ============================================

/**
 * POST /api/ai/shopping-plan
 * Fire-and-forget: validates input, returns immediately, price comparison runs in background.
 */
export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    const body: unknown = await request.json();
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const searchInput = validation.data.searchItems ?? validation.data.searchTerms ?? [];
    const city = member.household.city ?? null;
    const preferredBankSlugs = validation.data.preferredBankSlugs ?? [];

    // Prevent duplicate concurrent runs
    const existing = await findRunningJob(member.householdId, "SHOPPING_PLAN");
    if (existing) {
      const response: AiJobTriggerResponse = {
        started: false,
        alreadyRunning: true,
        jobId: existing.id,
      };
      return NextResponse.json(response);
    }

    const jobId = await markJobRunning(
      member.householdId,
      member.id,
      "SHOPPING_PLAN",
      { searchInput, city, preferredBankSlugs },
    );

    // Schedule background work
    after(async () => {
      const startTime = Date.now();
      try {
        // Resolve promo stores inside after() to keep the response fast
        let promoStores: Set<string> | null = null;
        if (preferredBankSlugs.length > 0) {
          const promos = await prisma.bankPromo.findMany({
            where: { householdId: member.householdId, bankSlug: { in: preferredBankSlugs } },
            select: { storeName: true },
          });
          promoStores = new Set(promos.map((p) => p.storeName));
        }

        const result = await compareProducts(searchInput, city, promoStores);

        await completeJob(jobId, {
          status: "SUCCESS",
          resultData: result,
          durationMs: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[shopping-plan] Background job failed:", errorMessage);
        await completeJob(jobId, {
          status: "FAILED",
          errorMessage,
          durationMs: Date.now() - startTime,
        });
      }
    });

    const response: AiJobTriggerResponse = {
      started: true,
      alreadyRunning: false,
      jobId,
    };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/shopping-plan", method: "POST" });
  }
}
