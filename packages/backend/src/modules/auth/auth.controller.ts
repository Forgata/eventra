import type { Request, Response, NextFunction } from "express";
import { AuthService, AuthError } from "./auth.service.js";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
} from "@eventra/shared";

/**
 * Sets a refresh token cookie on the response.
 * The cookie is set to be httpOnly, secure in production, and sameSite strict.
 * The cookie is set to expire in 7 days.
 * The cookie path is set to /api/public/auth/refresh.
 * @param res The response to set the cookie on.
 * @param token The value of the refresh token cookie.
 */
function setRefreshCookie(res: Response, token: string): void {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/public/auth/refresh",
  });
}

export const AuthController = {
  /**
   * Registers a new user
   * @param req The request containing the user's name, email and password
   * @param res The response to be sent back to the client
   * @param next The next function to be called in the middleware chain
   * @returns A promise that resolves when the registration has been successfully completed
   * @throws {AuthError} If an account with the same email already exists
   */
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { accessToken, refreshToken } = await AuthService.register(
        parsed.data,
      );
      setRefreshCookie(res, refreshToken);

      res.status(201).json({ success: true, data: { accessToken } });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          code: err.code,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  },

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * Logs in an existing user
   * @param req The request containing the user's email and password
   * @param res The response to be sent back to the client
   * @param next The next function to be called in the middleware chain
   * @returns A promise that resolves when the login has been successfully completed
   * @throws {AuthError} If the email or password are invalid, or if the account is disabled
   */
  /*******  6fecddda-1e63-4978-9cec-bc6c196d9ca0  *******/
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { accessToken, refreshToken } = await AuthService.login(
        parsed.data,
      );
      setRefreshCookie(res, refreshToken);

      res.status(200).json({ success: true, data: { accessToken } });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          code: err.code,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  },

  /**
   * Refreshes an access token and a refresh token for a user
   * using a valid refresh token.
   * @param req The request containing the refresh token
   * @param res The response to be sent back to the client
   * @param next The next function to be called in the middleware chain
   * @returns A promise that resolves when the refresh token has been successfully refreshed
   * @throws {AuthError} If the refresh token is invalid, expired, or if the associated user account is disabled
   */
  async refresh(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const tokenFromCookie = req.cookies?.refreshToken as string | undefined;
      const parsed = RefreshTokenSchema.safeParse({
        refreshToken: tokenFromCookie ?? req.body?.refreshToken,
      });

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          code: "VALIDATION_ERROR",
          message: "Refresh token required",
        });
        return;
      }

      const { accessToken, refreshToken } = await AuthService.refresh(
        parsed.data.refreshToken,
      );
      setRefreshCookie(res, refreshToken);

      res.status(200).json({ success: true, data: { accessToken } });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({
          success: false,
          code: err.code,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  },

  /**
   * Clears the refresh token cookie and returns a 200 response with a message indicating that the user has been logged out.
   * @param _req The request object (not used).
   * @param res The response object.
   * @returns A promise that resolves when the response has been sent.
   */
  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie("refreshToken", { path: "/api/public/auth/refresh" });
    res.status(200).json({ success: true, message: "Logged out" });
  },

  /**
   * Returns the current user from the request object.
   * @returns A promise that resolves when the response has been sent.
   */
  async me(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: req.user });
  },
};
