import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("../../modules/auth/auth.service.js", () => ({
  AuthService: {
    verifyAccessToken: vi.fn(),
  },
  AuthError: class AuthError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

import { requireAuth, requireRole } from "../require-auth.middleware.js";
import { AuthService } from "../../modules/auth/auth.service.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockNext(): NextFunction {
  return vi.fn();
}

const fakeUser = {
  sub: "user123",
  email: "test@eventra.com",
  roles: ["user"] as ["user"],
};

// ─── requireAuth ──────────────────────────────────────────────────────────────

describe("requireAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls next and sets req.user when token is valid", async () => {
    vi.mocked(AuthService.verifyAccessToken).mockResolvedValue(fakeUser);

    const req = {
      headers: { authorization: "Bearer valid.token.here" },
    } as Request;
    const res = mockRes();
    const next = mockNext();

    await requireAuth(req, res as Response, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = mockNext();

    await requireAuth(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "MISSING_TOKEN" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    vi.mocked(AuthService.verifyAccessToken).mockRejectedValue(
      new Error("bad token"),
    );

    const req = {
      headers: { authorization: "Bearer bad.token.here" },
    } as Request;
    const res = mockRes();
    const next = mockNext();

    await requireAuth(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_TOKEN" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header does not start with Bearer", async () => {
    const req = { headers: { authorization: "Basic sometoken" } } as Request;
    const res = mockRes();
    const next = mockNext();

    await requireAuth(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── requireRole ──────────────────────────────────────────────────────────────

describe("requireRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls next when user has the required role", () => {
    const req = { user: fakeUser } as any;
    const res = mockRes();
    const next = mockNext();

    requireRole("user")(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when user does not have the required role", () => {
    const req = { user: fakeUser } as any;
    const res = mockRes();
    const next = mockNext();

    requireRole("admin")(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when req.user is not set", () => {
    const req = {} as any;
    const res = mockRes();
    const next = mockNext();

    requireRole("user")(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "MISSING_TOKEN" }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
