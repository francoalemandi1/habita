export const OAUTH_SCOPES = ["ahorra", "habita"] as const;
export type OAuthScope = (typeof OAUTH_SCOPES)[number];

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const AUTHORIZATION_CODE_TTL_SECONDS = 60;

export const ACCESS_TOKEN_PREFIX = "hmat_";
export const REFRESH_TOKEN_PREFIX = "hmrt_";
export const AUTHORIZATION_CODE_PREFIX = "hmcd_";

export const MAX_REDIRECT_URIS = 10;
export const MAX_CLIENT_NAME_LENGTH = 200;
