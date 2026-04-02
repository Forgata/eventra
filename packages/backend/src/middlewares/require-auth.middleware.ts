import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../modules/auth/auth.service.js";
import type { JwtPayload } from "@eventra/shared";

/**
 * A middleware that checks if the user is authenticated by verifying the access token.
 * If the authorization header is missing or does not start with "Bearer ", it returns a 401 response with the code "MISSING_TOKEN".
 * If the token is invalid or expired, it returns a 401 response with the code "INVALID_TOKEN".
 * If the token is valid, it sets req.user with the decoded user data and calls next() to continue the request.
 *
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function to call.
 * @returns {Promise<void>} - A promise that resolves when the middleware has finished executing.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      code: "MISSING_TOKEN",
      message: "Authentication required",
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = await AuthService.verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Invalid or expired token",
    });
  }
}
/**
 * A middleware that checks if the user has at least one of the specified roles.
 * If the user is not authenticated, it returns a 401 response with the code "MISSING_TOKEN".
 * If the user does not have the required role, it returns a 403 response with the code "FORBIDDEN".
 * Otherwise, it calls next() to continue the request.
 *
 * @param {JwtPayload["roles"][]} roles - The roles to check for.
 * @returns {(req: Request, res: Response, next: NextFunction) => void} - A middleware function that checks the user's roles.
 */

export function requireRole(...roles: JwtPayload["roles"]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        code: "MISSING_TOKEN",
        message: "Authentication required",
      });
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource",
      });
      return;
    }

    next();
  };
}
