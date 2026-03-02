/**
 * Bank slug → display name mapping for promoarg.com bank IDs.
 */

const BANK_DISPLAY_NAMES: Record<string, string> = {
  // Billeteras virtuales
  mercadopago: "Mercado Pago",
  cuentadni: "Cuenta DNI",
  modo: "MODO",
  naranjax: "Naranja X",
  personalpay: "Personal Pay",
  uala: "Ualá",
  reba: "Reba",
  // Bancos tradicionales
  galicia: "Galicia",
  santander: "Santander",
  bbva: "BBVA",
  macro: "Macro",
  nacion: "Nación",
  icbc: "ICBC",
  supervielle: "Supervielle",
  credicoop: "Credicoop",
  patagonia: "Patagonia",
  ciudad: "Ciudad",
  bancor: "Bancor",
  brubank: "Brubank",
  hipotecario: "Hipotecario",
  comafi: "Comafi",
  bancodelsol: "Banco del Sol",
  btf: "Tierra del Fuego",
  hsbc: "HSBC",
  provincia: "Provincia",
  // Otros
  clublanacion: "Club La Nación",
  clarin365: "Clarín 365",
  shell_box: "Shell Box",
  axion_on: "Axion ON",
  ypf_serviclub: "YPF Serviclub",
};

/** Resolve a promoarg bank slug to a human-readable name. */
export function getBankDisplayName(bankSlug: string): string {
  return BANK_DISPLAY_NAMES[bankSlug] ?? capitalize(bankSlug);
}

function capitalize(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================
// Payment network resolution
// ============================================

/** Slugs that are payment networks, not issuing banks. */
export const PAYMENT_NETWORKS = new Set([
  "modo",
  "mercadopago",
  "naranjax",
  "personalpay",
  "uala",
  "reba",
  "cuentadni",
]);

/**
 * Text tokens that identify a traditional bank within a promo title.
 * Key = real bankSlug; value = tokens to match (word-boundary, case-insensitive).
 */
const BANK_TITLE_TOKENS: Record<string, string[]> = {
  ciudad:      ["ciudad"],
  galicia:     ["galicia"],
  santander:   ["santander"],
  bbva:        ["bbva", "frances"],
  macro:       ["macro"],
  nacion:      ["nacion", "bna"],
  icbc:        ["icbc"],
  supervielle: ["supervielle"],
  credicoop:   ["credicoop"],
  patagonia:   ["patagonia"],
  bancor:      ["bancor"],
  brubank:     ["brubank"],
  hipotecario: ["hipotecario"],
  comafi:      ["comafi"],
  hsbc:        ["hsbc"],
  provincia:   ["provincia"],
  btf:         ["tierra del fuego"],
};

/**
 * Maps participatingBanks display names from promoarg.com API to internal bank slugs.
 * e.g. "Banco Ciudad" → "ciudad", "Banco Nación" → "nacion"
 */
const PARTICIPATING_BANK_NAME_MAP: Record<string, string> = {
  "banco ciudad":      "ciudad",
  "ciudad":            "ciudad",
  "banco galicia":     "galicia",
  "galicia":           "galicia",
  "santander":         "santander",
  "banco santander":   "santander",
  "bbva":              "bbva",
  "frances":           "bbva",
  "banco macro":       "macro",
  "macro":             "macro",
  "banco nación":      "nacion",
  "banco nacion":      "nacion",
  "bna":               "nacion",
  "icbc":              "icbc",
  "supervielle":       "supervielle",
  "banco supervielle": "supervielle",
  "credicoop":         "credicoop",
  "banco credicoop":   "credicoop",
  "patagonia":         "patagonia",
  "banco patagonia":   "patagonia",
  "bancor":            "bancor",
  "brubank":           "brubank",
  "hipotecario":       "hipotecario",
  "banco hipotecario": "hipotecario",
  "comafi":            "comafi",
  "banco comafi":      "comafi",
  "hsbc":              "hsbc",
  "provincia":         "provincia",
  "banco provincia":   "provincia",
};

/**
 * When bankId is a payment network, resolves the real issuing bank using:
 * 1. participatingBanks array (structured, most reliable)
 * 2. title text as fallback (less reliable, for older promos)
 *
 * Returns null when no bank is found (keep network as-is).
 */
export function resolvePromoBank(
  bankId: string,
  title: string | null,
  participatingBanks: string[] | null,
): { bankSlug: string; bankDisplayName: string; networkLabel: string } | null {
  if (!PAYMENT_NETWORKS.has(bankId)) return null;

  // Strategy 1: use participatingBanks (structured field, most accurate)
  if (participatingBanks && participatingBanks.length > 0) {
    for (const bankName of participatingBanks) {
      const slug = PARTICIPATING_BANK_NAME_MAP[bankName.toLowerCase()];
      if (slug) {
        return {
          bankSlug: slug,
          bankDisplayName: getBankDisplayName(slug),
          networkLabel: getBankDisplayName(bankId),
        };
      }
    }
  }

  // Strategy 2: scan title for known bank tokens (fallback)
  if (title) {
    for (const [slug, tokens] of Object.entries(BANK_TITLE_TOKENS)) {
      for (const token of tokens) {
        if (new RegExp(`\\b${token}\\b`, "i").test(title)) {
          return {
            bankSlug: slug,
            bankDisplayName: getBankDisplayName(slug),
            networkLabel: getBankDisplayName(bankId),
          };
        }
      }
    }
  }

  return null;
}
