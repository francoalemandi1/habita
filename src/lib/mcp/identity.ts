/**
 * Identity resolved from a verified OAuth access token. `null` means the
 * request authenticated with an `hmcp_` API key, which only ever gets the
 * price tools (no household scope, no user to attribute writes to).
 */
export interface McpIdentity {
  userId: string;
  scopes: ReadonlySet<string>;
}

function parseScopes(scope: string): ReadonlySet<string> {
  return new Set(
    scope
      .split(" ")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function buildMcpIdentity(userId: string, scope: string): McpIdentity {
  return { userId, scopes: parseScopes(scope) };
}
