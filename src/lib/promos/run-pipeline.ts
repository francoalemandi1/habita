/**
 * Pipeline orchestrator — fetches promos from promoarg.com API and persists.
 *
 * 1. Per-store API fetch (promoarg.com/api/promotions?search={store})
 * 2. Filter: only promos with discountPercentage > 0
 * 3. Dedup: merge variants that differ only in eligiblePlans
 * 4. Persist to DB (delete + recreate for clean snapshot)
 */

import { prisma } from "@/lib/prisma";
import { KNOWN_STORE_NAMES, STALE_PIPELINE_TIMEOUT_MS } from "./constants";
import { fetchAllStorePromos } from "./promoarg-client";
import { normalizeStorePromos } from "./normalize";

import type { Prisma } from "@prisma/client";
import type { NormalizedPromo } from "./normalize";
import type { PromosPipelineOutcome, StorePromosResult } from "./types";

// ============================================
// Main function
// ============================================

interface PipelineOptions {
  householdId: string;
  /** Pre-created RUNNING log ID (fire-and-forget flow). */
  runningLogId: string;
}

/**
 * Run the full promos pipeline: fetch → dedup → persist.
 */
export async function runPromosPipeline(options: PipelineOptions): Promise<PromosPipelineOutcome> {
  const startTime = Date.now();
  const { householdId, runningLogId } = options;

  try {
    console.log(`[promos-pipeline] Starting for household ${householdId}`);

    // Stage 1: Fetch promos from promoarg.com API
    const storeResults = await fetchAllStorePromos(KNOWN_STORE_NAMES);
    const totalRaw = storeResults.reduce((sum, r) => sum + r.promos.length, 0);

    if (totalRaw === 0) {
      const outcome = buildOutcome("PARTIAL", startTime, {
        errorMessage: "promoarg.com returned no promos for any store",
      });
      await completePipelineLog(runningLogId, outcome);
      return outcome;
    }

    // Stage 2: Filter + dedup + map to DB rows
    const rows = buildDatabaseRows(householdId, storeResults);

    if (rows.length === 0) {
      const outcome = buildOutcome("PARTIAL", startTime, {
        promosFound: totalRaw,
        errorMessage: "No promos with discount > 0 after filtering",
      });
      await completePipelineLog(runningLogId, outcome);
      return outcome;
    }

    // Stage 3: Persist (delete + recreate in transaction)
    await prisma.$transaction([
      prisma.bankPromo.deleteMany({ where: { householdId } }),
      prisma.bankPromo.createMany({ data: rows }),
    ]);

    const outcome = buildOutcome("SUCCESS", startTime, {
      promosFound: totalRaw,
      promosCreated: rows.length,
    });
    await completePipelineLog(runningLogId, outcome);

    console.log(
      `[promos-pipeline] Done: ${rows.length} promos saved (${totalRaw} raw → ${rows.length} deduped) in ${outcome.durationMs}ms`,
    );
    return outcome;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[promos-pipeline] Pipeline failed:", errorMessage);

    const outcome = buildOutcome("FAILED", startTime, { errorMessage });
    await completePipelineLog(runningLogId, outcome);
    return outcome;
  }
}

// ============================================
// Mapping to DB rows
// ============================================

/** Map normalized promos to Prisma rows for one household, JSON-encoding array fields. */
function buildDatabaseRows(
  householdId: string,
  storeResults: StorePromosResult[],
): Prisma.BankPromoCreateManyInput[] {
  const normalized = normalizeStorePromos(storeResults);
  return normalized.map((promo) => toDatabaseRow(householdId, promo));
}

function toDatabaseRow(householdId: string, promo: NormalizedPromo): Prisma.BankPromoCreateManyInput {
  return {
    householdId,
    promoargId: promo.promoargId,
    bankSlug: promo.bankSlug,
    bankDisplayName: promo.bankDisplayName,
    storeName: promo.storeName,
    title: promo.title,
    description: promo.description,
    discountPercent: promo.discountPercent,
    daysOfWeek: JSON.stringify(promo.daysOfWeek),
    paymentMethods: promo.paymentMethods.length > 0 ? JSON.stringify(promo.paymentMethods) : null,
    eligiblePlans: promo.eligiblePlans.length > 0 ? JSON.stringify(promo.eligiblePlans) : null,
    capAmount: promo.capAmount,
    categories: promo.categories.length > 0 ? JSON.stringify(promo.categories) : null,
    validUntil: promo.validUntil,
    sourceUrl: promo.sourceUrl,
  };
}

// ============================================
// Pipeline log management
// ============================================

/** Create a RUNNING log entry. Returns the log ID. */
export async function markPipelineRunning(householdId: string): Promise<string> {
  const log = await prisma.promoPipelineLog.create({
    data: { householdId, status: "RUNNING" },
  });
  return log.id;
}

/** Find a currently running pipeline for this household. */
export async function findRunningPipeline(householdId: string) {
  const cutoff = new Date(Date.now() - STALE_PIPELINE_TIMEOUT_MS);

  // Clean up stale RUNNING entries
  await prisma.promoPipelineLog.updateMany({
    where: {
      status: "RUNNING",
      householdId,
      startedAt: { lt: cutoff },
    },
    data: { status: "FAILED", errorMessage: "Pipeline timed out (stale RUNNING entry)" },
  });

  return prisma.promoPipelineLog.findFirst({
    where: { status: "RUNNING", householdId, startedAt: { gte: cutoff } },
    orderBy: { startedAt: "desc" },
    select: { id: true, startedAt: true },
  });
}

/** Complete a RUNNING log entry with the final outcome. */
async function completePipelineLog(
  logId: string,
  outcome: PromosPipelineOutcome,
): Promise<void> {
  await prisma.promoPipelineLog.update({
    where: { id: logId },
    data: {
      status: outcome.status,
      promosFound: outcome.promosFound,
      promosCreated: outcome.promosCreated,
      promosUpdated: 0,
      durationMs: outcome.durationMs,
      errorMessage: outcome.errorMessage ?? null,
      completedAt: new Date(),
    },
  });
}

// ============================================
// Helpers
// ============================================

function buildOutcome(
  status: PromosPipelineOutcome["status"],
  startTime: number,
  overrides: Partial<PromosPipelineOutcome> = {},
): PromosPipelineOutcome {
  return {
    status,
    promosFound: 0,
    promosCreated: 0,
    durationMs: Date.now() - startTime,
    ...overrides,
  };
}
