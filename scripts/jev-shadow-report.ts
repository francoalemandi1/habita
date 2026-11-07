/**
 * Print agreement stats between the DeepSeek curator and the Jev shadow
 * curator, per task. Read-only — loads AiShadowJudgment rows and runs the
 * pure report helpers over them.
 *
 * Usage:
 *   pnpm exec tsx scripts/jev-shadow-report.ts                        # both curator tasks
 *   pnpm exec tsx scripts/jev-shadow-report.ts --task events.curator  # one task
 */

import { PrismaClient } from "@prisma/client";

import { buildCuratorShadowReport } from "../src/lib/events/pipeline/curator-shadow-report";

import type { CuratorShadowRow } from "../src/lib/events/pipeline/curator-shadow-report";

const prisma = new PrismaClient();

const DEFAULT_TASKS = ["events.curator", "events.curator.backfill"];

function parseTasks(argv: string[]): string[] {
  const index = argv.indexOf("--task");
  const value = index === -1 ? undefined : argv[index + 1];
  if (!value) return DEFAULT_TASKS;
  return value
    .split(",")
    .map((task) => task.trim())
    .filter(Boolean);
}

/** Json columns are untyped — coerce defensively instead of trusting the stored shape. */
function toCuratorShadowRow(primary: unknown, shadow: unknown): CuratorShadowRow | null {
  if (typeof primary !== "object" || primary === null) return null;
  if (typeof shadow !== "object" || shadow === null) return null;

  const p = primary as Record<string, unknown>;
  const s = shadow as Record<string, unknown>;

  if (typeof p.category !== "string" || typeof s.category !== "string") return null;
  if (typeof p.culturalScore !== "number" || typeof p.originalityScore !== "number") return null;
  if (typeof s.categoryConfidence !== "number") return null;
  if (typeof s.culturalBand !== "number" || typeof s.originalityBand !== "number") return null;

  return {
    primary: {
      category: p.category,
      culturalScore: p.culturalScore,
      originalityScore: p.originalityScore,
    },
    shadow: {
      category: s.category,
      categoryConfidence: s.categoryConfidence,
      culturalBand: s.culturalBand,
      originalityBand: s.originalityBand,
    },
  };
}

async function loadRows(task: string): Promise<CuratorShadowRow[]> {
  const dbRows = await prisma.aiShadowJudgment.findMany({
    where: { task },
    select: { primary: true, shadow: true },
  });

  const rows: CuratorShadowRow[] = [];
  for (const row of dbRows) {
    const mapped = toCuratorShadowRow(row.primary, row.shadow);
    if (mapped) rows.push(mapped);
  }
  return rows;
}

function printReport(task: string, rows: CuratorShadowRow[]): void {
  console.log(`\n[jev-report] task=${task}`);

  if (rows.length === 0) {
    console.log("  No shadow rows found for this task.");
    return;
  }

  const report = buildCuratorShadowReport(rows);

  console.table({
    n: report.n,
    "category agreement %": report.categoryAgreementPct.toFixed(1),
    "cultural band exact %": report.culturalBandAgreement.exactPct.toFixed(1),
    "cultural band within-1 %": report.culturalBandAgreement.within1Pct.toFixed(1),
    "originality band exact %": report.originalityBandAgreement.exactPct.toFixed(1),
    "originality band within-1 %": report.originalityBandAgreement.within1Pct.toFixed(1),
  });

  console.table(
    report.categoryAgreementByConfidence.map((bucket) => ({
      bucket: bucket.bucket,
      count: bucket.count,
      "agreement %": bucket.agreementPct.toFixed(1),
    })),
  );

  if (report.topCategoryDisagreements.length > 0) {
    console.log("  Top category disagreements (DeepSeek → Jev):");
    console.table(report.topCategoryDisagreements);
  }
}

async function main(): Promise<void> {
  const tasks = parseTasks(process.argv.slice(2));

  for (const task of tasks) {
    const rows = await loadRows(task);
    printReport(task, rows);
  }
}

main()
  .catch((error) => {
    console.error("[jev-report] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
