/**
 * Canonical app routes after the "four places" navigation rework, plus the
 * legacy paths that must keep resolving: push notifications already delivered
 * to phones, bookmarks and old emails still point at the old URLs.
 *
 * Only 1:1 moves live here. Routes whose new home is a view inside a place
 * (e.g. /fund → /plata?v=fondo) are added when that place is rebuilt.
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

/** Legacy path → canonical path, shared by web redirects and mobile deep links. */
export const LEGACY_ROUTE_ALIASES: Readonly<Record<string, AppRoute>> = {
  "/dashboard": APP_ROUTES.casa,
  "/my-tasks": APP_ROUTES.tareas,
  "/balance": APP_ROUTES.plata,
  // Never existed as a page; older notifications were sent with it.
  "/expenses": APP_ROUTES.plata,
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
export const MOBILE_LEGACY_ROUTE_ALIASES: Readonly<Record<string, AppRoute>> = {
  ...LEGACY_ROUTE_ALIASES,
  "/tasks": APP_ROUTES.tareas,
};

/**
 * Rewrites a legacy in-app path to its canonical route, keeping the query
 * string and hash. Unknown paths and sub-paths are returned unchanged.
 */
export function normalizeAppPath(
  path: string,
  aliases: Readonly<Record<string, AppRoute>> = LEGACY_ROUTE_ALIASES,
): string {
  const suffixStart = path.search(/[?#]/);
  const pathname = suffixStart === -1 ? path : path.slice(0, suffixStart);
  const suffix = suffixStart === -1 ? "" : path.slice(suffixStart);
  const trimmedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const canonical = aliases[trimmedPathname];
  return canonical ? `${canonical}${suffix}` : path;
}
