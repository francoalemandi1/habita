const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function parseUrl(uri: string): URL | null {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

function isLoopbackHttp(url: URL): boolean {
  return url.protocol === "http:" && LOOPBACK_HOSTNAMES.has(url.hostname);
}

/** Loopback http (any port, for Claude Code's ephemeral port) or https (any host). No fragments. */
export function isAllowedRedirectUri(uri: string): boolean {
  const url = parseUrl(uri);
  if (!url) return false;
  if (url.hash) return false;

  if (url.protocol === "https:") return true;
  return isLoopbackHttp(url);
}

/**
 * Exact match, or for loopback http URIs: same scheme/hostname/path/query with
 * the port ignored. `localhost` and `127.0.0.1` are distinct hosts, both allowed.
 */
export function redirectUriMatches(registered: string[], requested: string): boolean {
  if (registered.includes(requested)) return true;

  const requestedUrl = parseUrl(requested);
  if (!requestedUrl || !isLoopbackHttp(requestedUrl)) return false;

  return registered.some((candidate) => {
    const candidateUrl = parseUrl(candidate);
    if (!candidateUrl || !isLoopbackHttp(candidateUrl)) return false;

    return (
      candidateUrl.hostname === requestedUrl.hostname &&
      candidateUrl.pathname === requestedUrl.pathname &&
      candidateUrl.search === requestedUrl.search
    );
  });
}

/** Host to display on the consent screen. */
export function getRedirectHost(uri: string): string {
  const url = parseUrl(uri);
  return url ? url.host : uri;
}
