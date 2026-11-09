const DEFAULT_ISSUER = "http://localhost:3000";

/** Origin of NEXTAUTH_URL, no trailing slash. Falls back to localhost for dev. */
export function getOAuthIssuer(): string {
  const configured = process.env.NEXTAUTH_URL;
  if (!configured) return DEFAULT_ISSUER;

  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_ISSUER;
  }
}

/** Canonical resource URL (RFC 8707 audience) for the Ahorrá MCP endpoint. */
export function getMcpResourceUrl(): string {
  return `${getOAuthIssuer()}/api/mcp`;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Normalizes an OAuth `resource` parameter. Missing/empty defaults to the MCP
 * resource URL. Returns `null` when it doesn't match the MCP resource URL.
 */
export function normalizeResource(value: string | null | undefined): string | null {
  if (!value) return getMcpResourceUrl();

  const normalized = stripTrailingSlash(value);
  return normalized === getMcpResourceUrl() ? normalized : null;
}
