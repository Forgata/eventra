import type { JwtPayload } from "@eventra/shared";
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
