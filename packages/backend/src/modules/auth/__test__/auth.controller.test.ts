import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("../auth.service.js", () => ({
  AuthService: {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
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

import { AuthController } from "../auth.controller.js";
import { AuthService, AuthError } from "../auth.service.js";

function mockRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
}

function mockNext(): NextFunction {
  return vi.fn();
}

const fakeTokens = {
  accessToken: "fake.access.token",
  refreshToken: "fake.refresh.token",
};

describe("AuthController.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 201 with accessToken on success", async () => {
    vi.mocked(AuthService.register).mockResolvedValue(fakeTokens);

    const req = {
      body: {
        name: "Test User",
        email: "test@eventra.com",
        password: "Password1",
      },
    } as Request;
    const res = mockRes();

    await AuthController.register(req, res as Response, mockNext());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { accessToken: "fake.access.token" },
    });
    expect(res.cookie).toHaveBeenCalled();
  });

  it("returns 400 on validation failure", async () => {
    const req = { body: { email: "not-an-email" } } as Request;
    const res = mockRes();

    await AuthController.register(req, res as Response, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VALIDATION_ERROR" }),
    );
  });

  it("returns correct status when AuthError is thrown", async () => {
    vi.mocked(AuthService.register).mockRejectedValue(
      new AuthError(
        "EMAIL_TAKEN",
        "An account with this email already exists",
        409,
      ),
    );

    const req = {
      body: {
        name: "Test User",
        email: "test@eventra.com",
        password: "Password1",
      },
    } as Request;
    const res = mockRes();

    await AuthController.register(req, res as Response, mockNext());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "EMAIL_TAKEN" }),
    );
  });

  it("calls next on unexpected error", async () => {
    vi.mocked(AuthService.register).mockRejectedValue(new Error("DB exploded"));

    const req = {
      body: {
        name: "Test User",
        email: "test@eventra.com",
        password: "Password1",
      },
    } as Request;
    const res = mockRes();
    const next = mockNext();

    await AuthController.register(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("AuthController.login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with accessToken on success", async () => {
    vi.mocked(AuthService.login).mockResolvedValue(fakeTokens);

    const req = {
      body: { email: "test@eventra.com", password: "Password1" },
    } as Request;
    const res = mockRes();

    await AuthController.login(req, res as Response, mockNext());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { accessToken: "fake.access.token" },
    });
    expect(res.cookie).toHaveBeenCalled();
  });

  it("returns 400 on validation failure", async () => {
    const req = { body: {} } as Request;
    const res = mockRes();

    await AuthController.login(req, res as Response, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns correct status when AuthError is thrown", async () => {
    vi.mocked(AuthService.login).mockRejectedValue(
      new AuthError("INVALID_CREDENTIALS", "Invalid email or password", 401),
    );

    const req = {
      body: { email: "test@eventra.com", password: "Password1" },
    } as Request;
    const res = mockRes();

    await AuthController.login(req, res as Response, mockNext());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_CREDENTIALS" }),
    );
  });
});

describe("AuthController.logout", () => {
  it("clears cookie and returns 200", async () => {
    const req = {} as Request;
    const res = mockRes();

    await AuthController.logout(req, res as Response);

    expect(res.clearCookie).toHaveBeenCalledWith(
      "refreshToken",
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("AuthController.me", () => {
  it("returns current user from req.user", async () => {
    const req = {
      user: { sub: "user123", email: "test@eventra.com", roles: ["user"] },
    } as any;
    const res = mockRes();

    await AuthController.me(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { sub: "user123", email: "test@eventra.com", roles: ["user"] },
    });
  });
});
