import "dotenv/config";
import * as argon2 from "argon2";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import {
  AUTH_CONSTANTS,
  TOKEN_TYPES,
  type AuthTokens,
  type JwtPayload,
  type LoginInput,
  type RegisterInput,
} from "@eventra/shared";
import { User } from "../users/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT_SECRET and JWT_REFRESH_SECRET must be defined in environment variables",
  );
}

const ACCESS_SECRET = new TextEncoder().encode(JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(JWT_REFRESH_SECRET);

async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({
    sub: payload.sub!,
    type: TOKEN_TYPES.ACCESS,
    email: payload.email,
    roles: payload.roles,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(AUTH_CONSTANTS.ACCESS_TOKEN_TLL)
    .sign(ACCESS_SECRET);
}

async function signRefreshToken(
  payload: Pick<JwtPayload, "sub">,
): Promise<string> {
  return new SignJWT({ sub: payload.sub!, type: TOKEN_TYPES.REFRESH })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(AUTH_CONSTANTS.REFRESH_TOKEN_TLL)
    .sign(REFRESH_SECRET);
}

// -----Auth servive -----

export const AuthService = {
  /**
   * Registers a new user
   * @param input The input containing the user's name, email and password
   * @returns A promise that resolves with an object containing the access token and refresh token
   * @throws {AuthError} If an account with the same email already exists
   */
  async register(input: RegisterInput): Promise<AuthTokens> {
    const existingUser = await User.findOne({ email: input.email }).lean();

    if (existingUser)
      throw new AuthError(
        "EMAIL_TAKEN",
        " An account with this email already exists",
        409,
      );

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      ...(input.phone && { phone: input.phone }),
      roles: ["user"],
      isActive: true,
    });

    const jwtPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
    };

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(jwtPayload),
      signRefreshToken({ sub: jwtPayload.sub }),
    ]);

    return { accessToken, refreshToken };
  },

  /**
   * Logs in an existing user
   * @param input The input containing the user's email and password
   * @returns A promise that resolves with an object containing the access token and refresh token
   * @throws {AuthError} If the email or password are invalid, or if the account is disabled
   */
  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await User.findOne({ email: input.email })
      .select("+passwordHash")
      .lean();

    const dummyHash =
      "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const passwordHash = user?.passwordHash ?? dummyHash;

    const valid = await argon2.verify(passwordHash, input.password);

    if (!valid || !user)
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    if (!user.isActive)
      throw new AuthError(
        "ACCOUNT_DISABLED",
        "This account has been disabled",
        403,
      );

    const jwtPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles as JwtPayload["roles"],
    };

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(jwtPayload),
      signRefreshToken({ sub: jwtPayload.sub }),
    ]);

    return { accessToken, refreshToken };
  },

  /**
   * Refreshes an access token and a refresh token for a user
   * using a valid refresh token.
   * @param token The refresh token
   * @returns A promise that resolves with an object containing the access token and refresh token
   * @throws {AuthError} If the token is invalid, expired, or if the associated user account is disabled
   */
  async refresh(token: string): Promise<AuthTokens> {
    let payload: JWTPayload;

    try {
      const result = await jwtVerify(token, REFRESH_SECRET);
      payload = result.payload;
    } catch {
      throw new AuthError(
        "INVALID_TOKEN",
        "Invalid or expired refresh token",
        401,
      );
    }

    if (payload["type"] !== TOKEN_TYPES.REFRESH || !payload.sub) {
      throw new AuthError("INVALID_TOKEN", "Invalid token type", 401);
    }

    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) {
      throw new AuthError(
        "ACCOUNT_DISABLED",
        "User not found or disabled",
        403,
      );
    }

    const jwtPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles as JwtPayload["roles"],
    };

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(jwtPayload),
      signRefreshToken({ sub: jwtPayload.sub }),
    ]);

    return { accessToken, refreshToken };
  },

  /**
   * Verifies an access token and returns the payload.
   * @throws {AuthError} If the token is invalid or expired
   * @returns The payload of the access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);

      if (payload["type"] !== TOKEN_TYPES.ACCESS || !payload.sub) {
        throw new Error("Invalid token type");
      }

      return {
        sub: payload.sub,
        email: payload["email"] as string,
        roles: payload["roles"] as JwtPayload["roles"],
        ...(payload.iat !== undefined && { iat: payload.iat }),
        ...(payload.exp !== undefined && { exp: payload.exp }),
      };
    } catch {
      throw new AuthError(
        "INVALID_TOKEN",
        "Invalid or expired access token",
        401,
      );
    }
  },
};

// ---- AuthError ----
export class AuthError extends Error {
  /**
   * Creates an instance of AuthError.
   * @param {string} code - The error code
   * @param {string} message - The error message
   * @param {number} statusCode - The HTTP status code associated with the error
   */
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
