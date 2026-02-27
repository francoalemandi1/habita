// ─── Gmail query builder ────────────────────────────────────────────
// Builds Gmail search queries grouped by category, using service names
// from the catalog as keywords instead of sender domains.

import { ALL_PRESETS, detectProvince } from "@/lib/service-catalog";

import type { ServicePreset, ServiceSection } from "@/lib/service-catalog";

export interface ServiceQuery {
  /** Category label for logging */
  categoryLabel: string;
  /** Typed section from the service catalog */
  section: ServiceSection;
  /** Gmail search query string */
  query: string;
  /** Service names included in this query (for matching results back) */
  serviceNames: string[];
}

/** Keywords that signal a billing/service email in Spanish */
const BILLING_KEYWORDS_BY_CATEGORY: Record<string, string> = {
  local: "factura OR vencimiento OR cuenta OR cobro OR liquidación",
  telecom: "factura OR cuenta OR resumen OR cobro",
  streaming: "cobro OR cargo OR suscripción OR factura OR receipt OR payment",
  salud: "factura OR cuota OR estado de cuenta OR cobro",
  impuestos: "vencimiento OR boleta OR liquidación OR pago",
};

/** Generic services that won't produce meaningful Gmail results */
const SKIP_TITLES = new Set([
  "Alquiler", "Expensas", "Seguro hogar", "Prepaga",
  "Seguro auto", "Cochera", "Cuota colegio", "Cuota jardín",
  "Inmobiliario", "Patente", "Ingresos Brutos",
]);

/**
 * Build Gmail search queries grouped by category.
 * Local utilities are filtered by the user's province.
 */
export function buildServiceQueries(householdCity: string | null, newerThan = "6m"): ServiceQuery[] {
  const province = detectProvince(householdCity);
  const timeClause = newerThan ? ` newer_than:${newerThan}` : "";

  // Group scannable presets by section
  const grouped = new Map<string, ServicePreset[]>();

  for (const preset of ALL_PRESETS) {
    if (SKIP_TITLES.has(preset.title)) continue;

    // Local services: only include if province matches
    if (preset.section === "local") {
      if (!province) continue;
      if (preset.provinces.length > 0 && !preset.provinces.includes(province)) continue;
    }

    const existing = grouped.get(preset.section) ?? [];
    existing.push(preset);
    grouped.set(preset.section, existing);
  }

  const queries: ServiceQuery[] = [];

  for (const [section, presets] of grouped) {
    if (presets.length === 0) continue;

    const billingKeywords = BILLING_KEYWORDS_BY_CATEGORY[section] ?? "factura OR cobro OR cuenta";

    // Build the names clause: ("EPEC" OR "Ecogas" OR "Aguas Cordobesas")
    const nameTerms = presets.map((p) => {
      // Use quotes for multi-word names, bare word for single-word
      const name = p.title;
      return name.includes(" ") ? `"${name}"` : name;
    });

    const namesClause = `(${nameTerms.join(" OR ")})`;
    const query = `${namesClause} (${billingKeywords})${timeClause}`;

    queries.push({
      categoryLabel: section,
      section: section as ServiceSection,
      query,
      serviceNames: presets.map((p) => p.title),
    });
  }

  return queries;
}
