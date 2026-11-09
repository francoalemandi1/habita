import { getClient } from "./clients";
import { redirectUriMatches } from "./redirect-uri";
import { normalizeResource } from "./urls";
import { OAUTH_SCOPE } from "./constants";

import type { McpOAuthClient } from "@prisma/client";

type AuthorizeParamsSource = URLSearchParams | Record<string, string | undefined>;

interface AuthorizeParams {
  responseType: string | null;
  clientId: string | null;
  redirectUri: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  scope: string | null;
  resource: string | null;
  state: string | null;
}

function readParams(source: AuthorizeParamsSource): AuthorizeParams {
  const get = (key: string): string | null =>
    source instanceof URLSearchParams ? source.get(key) : source[key] ?? null;

  return {
    responseType: get("response_type"),
    clientId: get("client_id"),
    redirectUri: get("redirect_uri"),
    codeChallenge: get("code_challenge"),
    codeChallengeMethod: get("code_challenge_method"),
    scope: get("scope"),
    resource: get("resource"),
    state: get("state"),
  };
}

export type AuthorizeRedirectError =
  | "unsupported_response_type"
  | "invalid_request"
  | "invalid_scope"
  | "invalid_target";

export type ValidateAuthorizeRequestResult =
  | { kind: "fatal"; message: string }
  | { kind: "redirect-error"; redirectUrl: string }
  | {
      kind: "ok";
      client: McpOAuthClient;
      redirectUri: string;
      codeChallenge: string;
      scope: string;
      resource: string;
      state: string | null;
    };

/** Appends query params to a redirect URI, preserving any existing query string. */
export function buildRedirectUrl(redirectUri: string, params: Record<string, string | null | undefined>): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildErrorRedirect(
  redirectUri: string,
  error: AuthorizeRedirectError,
  description: string,
  state: string | null,
): ValidateAuthorizeRequestResult {
  return {
    kind: "redirect-error",
    redirectUrl: buildRedirectUrl(redirectUri, { error, error_description: description, state }),
  };
}

function validateAuthorizeParams(
  params: AuthorizeParams,
  client: McpOAuthClient,
  redirectUri: string,
): ValidateAuthorizeRequestResult {
  if (params.responseType !== "code") {
    return buildErrorRedirect(
      redirectUri,
      "unsupported_response_type",
      "Solo se admite response_type=code.",
      params.state,
    );
  }

  if (!params.codeChallenge || params.codeChallengeMethod !== "S256") {
    return buildErrorRedirect(
      redirectUri,
      "invalid_request",
      "Se requiere code_challenge con code_challenge_method=S256.",
      params.state,
    );
  }

  if (params.scope !== null && params.scope !== OAUTH_SCOPE) {
    return buildErrorRedirect(redirectUri, "invalid_scope", `El único scope admitido es "${OAUTH_SCOPE}".`, params.state);
  }

  const resource = normalizeResource(params.resource);
  if (!resource) {
    return buildErrorRedirect(redirectUri, "invalid_target", "El parámetro resource no es válido.", params.state);
  }

  return {
    kind: "ok",
    client,
    redirectUri,
    codeChallenge: params.codeChallenge,
    scope: OAUTH_SCOPE,
    resource,
    state: params.state,
  };
}

/**
 * Validates an `/oauth/authorize` request (RFC 6749 §4.1).
 * Unknown client or unmatched redirect_uri must NOT redirect (§4.1.2.1) — they are fatal.
 * Every other validation failure redirects back to the client with an error.
 */
export async function validateAuthorizeRequest(source: AuthorizeParamsSource): Promise<ValidateAuthorizeRequestResult> {
  const params = readParams(source);

  if (!params.clientId) {
    return { kind: "fatal", message: "Falta el parámetro client_id." };
  }

  const client = await getClient(params.clientId);
  if (!client) {
    return { kind: "fatal", message: "No reconocemos esta aplicación." };
  }

  if (!params.redirectUri || !redirectUriMatches(client.redirectUris, params.redirectUri)) {
    return { kind: "fatal", message: "La URL de redirección no coincide con la registrada." };
  }

  return validateAuthorizeParams(params, client, params.redirectUri);
}
