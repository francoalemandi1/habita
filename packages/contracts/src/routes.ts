/**
 * Canonical app routes after the "four places" navigation rework, plus the
 * legacy paths that must keep resolving: push notifications already delivered
 * to phones, bookmarks and old emails still point at the old URLs.
 *
 * Most aliases are 1:1 moves. A few (e.g. /fund → /plata?v=fondo) point at a
 * view inside a place instead — see `LegacyAliasTarget`.
 */

export const APP_ROUTES = {
  casa: "/casa",
  tareas: "/tareas",
  plata: "/plata",
  super: "/super",
  avisos: "/avisos",
  perfil: "/perfil",
} as const;

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];

/** Screens inside the Tareas place (handoff §5.2). */
export const TAREAS_ROUTES = {
  plan: "/tareas/plan",
  planHistory: "/tareas/plan/historial",
  rotations: "/tareas/rotaciones",
  add: "/tareas/sumar",
} as const;

/** Settings screens opened from Perfil (handoff §5.3 Global). */
export const PERFIL_ROUTES = {
  notificationSettings: "/perfil/avisos",
  availability: "/perfil/disponibilidad",
} as const;

/** Screens inside the Plata place (handoff §5.2 / §5.3 "Servicios", "Cómo venimos"). */
export const PLATA_ROUTES = {
  servicios: "/plata/servicios",
  comoVenimos: "/plata/como-venimos",
} as const;

/**
 * A canonical route or a screen nested under it, optionally with a query string
 * selecting a view inside it (e.g. `/plata?v=fondo`, `/tareas/rotaciones?sorteo=1`).
 */
type CanonicalPath = AppRoute | `${AppRoute}/${string}`;
export type LegacyAliasTarget = CanonicalPath | `${CanonicalPath}?${string}`;

/** Legacy path → canonical path (or canonical path + view query), shared by web redirects and mobile deep links. */
export const LEGACY_ROUTE_ALIASES: Readonly<Record<string, LegacyAliasTarget>> = {
  "/dashboard": APP_ROUTES.casa,
  "/my-tasks": APP_ROUTES.tareas,
  "/balance": APP_ROUTES.plata,
  // Never existed as a page; older notifications were sent with it.
  "/expenses": APP_ROUTES.plata,
  // The Fondo view now lives inside Plata (handoff §5.2).
  "/fund": `${APP_ROUTES.plata}?v=fondo`,
  "/compras": APP_ROUTES.super,
  "/tasks": APP_ROUTES.tareas,
  "/plan": TAREAS_ROUTES.plan,
  "/plans": TAREAS_ROUTES.planHistory,
  "/rotations": TAREAS_ROUTES.rotations,
  "/roulette": `${TAREAS_ROUTES.rotations}?sorteo=1`,
  "/progress": `${APP_ROUTES.tareas}?v=reparto`,
  "/suggest-tasks": TAREAS_ROUTES.add,
  "/task-catalog": TAREAS_ROUTES.add,
  // Transfer requests are answered from Avisos; their state shows inline on the task.
  "/transfers": APP_ROUTES.avisos,
  "/notifications": APP_ROUTES.avisos,
  "/profile": APP_ROUTES.perfil,
  // Never existed as a page; older notifications were sent with it.
  "/settings": APP_ROUTES.perfil,
  // Preferences grew into Disponibilidad (7 days × 3 slots + preferences + absences).
  "/preferences": PERFIL_ROUTES.availability,
  "/notification-settings": PERFIL_ROUTES.notificationSettings,
  "/services": PLATA_ROUTES.servicios,
  "/expense-insights": PLATA_ROUTES.comoVenimos,
};

/** Mobile deep-link aliases; identical to web now that Tareas absorbed `/tasks`. */
export const MOBILE_LEGACY_ROUTE_ALIASES: Readonly<Record<string, LegacyAliasTarget>> = LEGACY_ROUTE_ALIASES;

/**
 * Rewrites a legacy in-app path to its canonical route, keeping the query
 * string and hash. Unknown paths and sub-paths are returned unchanged.
 */
export function normalizeAppPath(
  path: string,
  aliases: Readonly<Record<string, LegacyAliasTarget>> = LEGACY_ROUTE_ALIASES,
): string {
  const suffixStart = path.search(/[?#]/);
  const pathname = suffixStart === -1 ? path : path.slice(0, suffixStart);
  const suffix = suffixStart === -1 ? "" : path.slice(suffixStart);
  const trimmedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const canonical = aliases[trimmedPathname];
  return canonical ? mergeAliasTarget(canonical, suffix) : path;
}

/**
 * Merges a path's own `?query#hash` suffix into an alias target that may
 * already carry its own query string (e.g. `/fund` → `/plata?v=fondo`).
 */
function mergeAliasTarget(target: LegacyAliasTarget, suffix: string): string {
  const targetQueryStart = target.indexOf("?");
  if (targetQueryStart === -1) return `${target}${suffix}`;

  const targetBase = target.slice(0, targetQueryStart);
  const targetQuery = target.slice(targetQueryStart + 1);

  const suffixHashStart = suffix.search(/#/);
  const suffixHash = suffixHashStart === -1 ? "" : suffix.slice(suffixHashStart);
  const suffixQuery = suffix.startsWith("?")
    ? suffix.slice(1, suffixHashStart === -1 ? undefined : suffixHashStart)
    : "";

  const mergedQuery = suffixQuery ? `${targetQuery}&${suffixQuery}` : targetQuery;
  return `${targetBase}?${mergedQuery}${suffixHash}`;
}
