export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_TLL: "15m",
  REFRESH_TOKEN_TLL: "7d",
  REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

export const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
} as const;
