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

/** A canonical route, optionally with a query string selecting a view inside it (e.g. `/plata?v=fondo`). */
export type LegacyAliasTarget = AppRoute | `${AppRoute}?${string}`;

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
  "/notifications": APP_ROUTES.avisos,
  "/profile": APP_ROUTES.perfil,
  // Never existed as a page; older notifications were sent with it.
  "/settings": APP_ROUTES.perfil,
};

/**
 * Mobile-only aliases. On mobile `/tasks` was the Tasks tab; on web it is the
 * task management page, which keeps its URL until the Tareas place is rebuilt.
 */
export const MOBILE_LEGACY_ROUTE_ALIASES: Readonly<Record<string, LegacyAliasTarget>> = {
  ...LEGACY_ROUTE_ALIASES,
  "/tasks": APP_ROUTES.tareas,
};

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
