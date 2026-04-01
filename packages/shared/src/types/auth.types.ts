import type { UserRole } from "../validators/auth.schema.js";

export interface JWTPayload {
  sub: string;
  email: string;
  roles: UserRole[];
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
