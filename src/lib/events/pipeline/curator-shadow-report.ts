/**
 * Pure report helpers over AiShadowJudgment rows produced by the Jev curator
 * shadow run. No I/O here — callers (scripts) load rows and pass them in.
 */

import { scoreToBand } from "./curator-shadow";

// ============================================
// Row shape (subset of AiShadowJudgment actually needed for the report)
// ============================================

export interface CuratorShadowRow {
  primary: {
    category: string;
    culturalScore: number;
    originalityScore: number;
  };
  shadow: {
    category: string;
    categoryConfidence: number;
    culturalBand: number;
    originalityBand: number;
  };
}

// ============================================
// Confidence buckets
// ============================================

export type ConfidenceBucket = "high" | "medium" | "low";

function bucketForConfidence(confidence: number): ConfidenceBucket {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}

export interface ConfidenceBucketStats {
  bucket: ConfidenceBucket;
  count: number;
  agreementPct: number;
}

// ============================================
// Band agreement (exact + within-1)
// ============================================

export interface BandAgreement {
  exactPct: number;
  within1Pct: number;
}

function computeBandAgreement(
  rows: CuratorShadowRow[],
  primaryScore: (row: CuratorShadowRow) => number,
  shadowBand: (row: CuratorShadowRow) => number,
): BandAgreement {
  if (rows.length === 0) return { exactPct: 0, within1Pct: 0 };

  let exact = 0;
  let within1 = 0;

  for (const row of rows) {
    const primaryBand = scoreToBand(primaryScore(row));
    const diff = Math.abs(primaryBand - shadowBand(row));
    if (diff === 0) exact += 1;
    if (diff <= 1) within1 += 1;
  }

  return {
    exactPct: (exact / rows.length) * 100,
    within1Pct: (within1 / rows.length) * 100,
  };
}

// ============================================
// Category disagreement pairs
// ============================================

export interface CategoryDisagreement {
  primaryCategory: string;
  shadowCategory: string;
  count: number;
}

function computeTopCategoryDisagreements(rows: CuratorShadowRow[], limit: number): CategoryDisagreement[] {
  const counts = new Map<string, CategoryDisagreement>();

  for (const row of rows) {
    if (row.primary.category === row.shadow.category) continue;
    const key = `${row.primary.category}→${row.shadow.category}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        primaryCategory: row.primary.category,
        shadowCategory: row.shadow.category,
        count: 1,
      });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ============================================
// Full report
// ============================================

export interface CuratorShadowReport {
  n: number;
  categoryAgreementPct: number;
  categoryAgreementByConfidence: ConfidenceBucketStats[];
  culturalBandAgreement: BandAgreement;
  originalityBandAgreement: BandAgreement;
  topCategoryDisagreements: CategoryDisagreement[];
}

const TOP_DISAGREEMENTS_LIMIT = 5;

export function buildCuratorShadowReport(rows: CuratorShadowRow[]): CuratorShadowReport {
  const n = rows.length;

  const categoryMatches = rows.filter((row) => row.primary.category === row.shadow.category);
  const categoryAgreementPct = n === 0 ? 0 : (categoryMatches.length / n) * 100;

  const buckets: ConfidenceBucket[] = ["high", "medium", "low"];
  const categoryAgreementByConfidence = buckets.map((bucket): ConfidenceBucketStats => {
    const bucketRows = rows.filter((row) => bucketForConfidence(row.shadow.categoryConfidence) === bucket);
    const bucketMatches = bucketRows.filter((row) => row.primary.category === row.shadow.category);
    return {
      bucket,
      count: bucketRows.length,
      agreementPct: bucketRows.length === 0 ? 0 : (bucketMatches.length / bucketRows.length) * 100,
    };
  });

  const culturalBandAgreement = computeBandAgreement(
    rows,
    (row) => row.primary.culturalScore,
    (row) => row.shadow.culturalBand,
  );
  const originalityBandAgreement = computeBandAgreement(
    rows,
    (row) => row.primary.originalityScore,
    (row) => row.shadow.originalityBand,
  );

  const topCategoryDisagreements = computeTopCategoryDisagreements(rows, TOP_DISAGREEMENTS_LIMIT);

  return {
    n,
    categoryAgreementPct,
    categoryAgreementByConfidence,
    culturalBandAgreement,
    originalityBandAgreement,
    topCategoryDisagreements,
  };
}
