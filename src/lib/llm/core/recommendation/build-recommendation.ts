/**
 * Recommendation Builder
 *
 * Deterministic, template-based recommendation engine.
 * Generates structured recommendations with confidence levels
 * based on basket coverage thresholds.
 *
 * Confidence thresholds (based on coverage ratio of best store):
 *   high   — coverage >= 60%  (9+ of 15 items)
 *   medium — coverage >= 33%  (5+ of 15 items)
 *   low    — coverage < 33%
 */

import type { StoreScore } from "@/lib/llm/core/scoring/store-scorer";
import type { StoreCluster } from "@/lib/llm/grocery-advisor";

// ============================================
// Types
// ============================================

export type ConfidenceLevel = "high" | "medium" | "low";

export interface StoreRecommendation {
  /** Human-readable recommendation text */
  text: string;
  /** Confidence in the recommendation */
  confidence: ConfidenceLevel;
  /** Top store name (if any) */
  topStore: string | null;
  /** Number of basket items covered by top store */
  topStoreCoverage: number;
}

// ============================================
// Thresholds
// ============================================

const HIGH_CONFIDENCE_THRESHOLD = 0.6;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.33;

// ============================================
// Main function
// ============================================

/**
 * Build a structured recommendation from store scores and clusters.
 * The recommendation is fully deterministic — no LLM involved.
 */
export function buildStoreRecommendation(
  storeScores: StoreScore[],
  clusters: StoreCluster[]
): StoreRecommendation {
  if (storeScores.length === 0) {
    return {
      text: "No se encontraron precios suficientes para recomendar una tienda.",
      confidence: "low",
      topStore: null,
      topStoreCoverage: 0,
    };
  }

  const best = storeScores[0]!;
  const confidence = resolveConfidence(best.coverageScore);

  const bestCluster = clusters.find((c) => c.storeName === best.storeName);
  const savingsAmount = bestCluster?.totalEstimatedSavings ?? 0;

  const text = buildText(best, storeScores, savingsAmount, confidence);

  return {
    text,
    confidence,
    topStore: best.storeName,
    topStoreCoverage: best.coverageCount,
  };
}

// ============================================
// Internal
// ============================================

function resolveConfidence(coverageScore: number): ConfidenceLevel {
  if (coverageScore >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (coverageScore >= MEDIUM_CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}

function buildText(
  best: StoreScore,
  allScores: StoreScore[],
  savingsAmount: number,
  confidence: ConfidenceLevel
): string {
  const savingsPart = savingsAmount > 0
    ? `, ahorro estimado ~$${Math.round(savingsAmount).toLocaleString("es-AR")}`
    : "";

  if (confidence === "low") {
    return `Pocos productos encontrados. ${best.storeName} cubre ${best.coverageCount} items de la canasta básica. Intentá actualizar más tarde para mejores resultados.`;
  }

  if (allScores.length === 1) {
    return `${best.storeName} cubre ${best.coverageCount} productos de tu canasta básica${savingsPart}.`;
  }

  const second = allScores[1]!;
  const scoreDiff = best.finalScore - second.finalScore;

  // Clear winner
  if (scoreDiff > 0.15) {
    return `Mejor opción: ${best.storeName} (${best.coverageCount} productos de tu canasta${savingsPart}). Le sigue ${second.storeName} con ${second.coverageCount} productos.`;
  }

  // Close competition
  return `${best.storeName} y ${second.storeName} están muy parejos. ${best.storeName} cubre ${best.coverageCount} productos${savingsPart}, ${second.storeName} cubre ${second.coverageCount}.`;
}
