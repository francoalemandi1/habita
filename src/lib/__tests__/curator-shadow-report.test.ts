import { describe, expect, it } from "vitest";

import { buildCuratorShadowReport } from "../events/pipeline/curator-shadow-report";

import type { CuratorShadowRow } from "../events/pipeline/curator-shadow-report";

describe("buildCuratorShadowReport", () => {
  const rows: CuratorShadowRow[] = [
    {
      // Exact category match, high confidence, exact band agreement on both scores.
      primary: { category: "MUSICA", culturalScore: 7, originalityScore: 6 },
      shadow: { category: "MUSICA", categoryConfidence: 0.95, culturalBand: 3, originalityBand: 2 },
    },
    {
      // Category mismatch, medium confidence; cultural band off by 1 (within-1 only).
      primary: { category: "TEATRO", culturalScore: 4, originalityScore: 5 },
      shadow: { category: "DANZA", categoryConfidence: 0.75, culturalBand: 2, originalityBand: 2 },
    },
    {
      // Category mismatch, low confidence; cultural band off by 2 (outside within-1).
      primary: { category: "CINE", culturalScore: 9, originalityScore: 1 },
      shadow: { category: "FERIA", categoryConfidence: 0.4, culturalBand: 2, originalityBand: 3 },
    },
  ];

  it("computes n and overall category agreement", () => {
    const report = buildCuratorShadowReport(rows);
    expect(report.n).toBe(3);
    expect(report.categoryAgreementPct).toBeCloseTo((1 / 3) * 100, 5);
  });

  it("buckets category agreement by Jev confidence", () => {
    const report = buildCuratorShadowReport(rows);
    const high = report.categoryAgreementByConfidence.find((b) => b.bucket === "high")!;
    const medium = report.categoryAgreementByConfidence.find((b) => b.bucket === "medium")!;
    const low = report.categoryAgreementByConfidence.find((b) => b.bucket === "low")!;

    expect(high).toMatchObject({ count: 1, agreementPct: 100 });
    expect(medium).toMatchObject({ count: 1, agreementPct: 0 });
    expect(low).toMatchObject({ count: 1, agreementPct: 0 });
  });

  it("computes cultural band exact and within-1 agreement", () => {
    const report = buildCuratorShadowReport(rows);
    expect(report.culturalBandAgreement.exactPct).toBeCloseTo((1 / 3) * 100, 5);
    expect(report.culturalBandAgreement.within1Pct).toBeCloseTo((2 / 3) * 100, 5);
  });

  it("computes originality band exact and within-1 agreement", () => {
    const report = buildCuratorShadowReport(rows);
    expect(report.originalityBandAgreement.exactPct).toBeCloseTo((2 / 3) * 100, 5);
    expect(report.originalityBandAgreement.within1Pct).toBeCloseTo((2 / 3) * 100, 5);
  });

  it("lists the top category disagreement pairs", () => {
    const report = buildCuratorShadowReport(rows);
    expect(report.topCategoryDisagreements).toEqual([
      { primaryCategory: "TEATRO", shadowCategory: "DANZA", count: 1 },
      { primaryCategory: "CINE", shadowCategory: "FERIA", count: 1 },
    ]);
  });

  it("returns zeroed stats for an empty input", () => {
    const report = buildCuratorShadowReport([]);
    expect(report.n).toBe(0);
    expect(report.categoryAgreementPct).toBe(0);
    expect(report.culturalBandAgreement).toEqual({ exactPct: 0, within1Pct: 0 });
    expect(report.topCategoryDisagreements).toEqual([]);
  });
});
