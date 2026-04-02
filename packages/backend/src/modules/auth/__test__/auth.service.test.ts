import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { AuthService, AuthError } from "../auth.service.js";
import { User } from "../../users/user.model.js";
import * as argon2 from "argon2";

vi.mock("../../users/user.model.js", () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

// generate once at module level
let validHash: string;

beforeAll(async () => {
  validHash = await argon2.hash("Password1", { type: argon2.argon2id });
});

const getMockUser = () => ({
  _id: { toString: () => "user123" },
  email: "test@eventra.com",
  passwordHash: validHash,
  roles: ["user"],
  isActive: true,
});

function mockFindOneLean(value: unknown) {
  vi.mocked(User.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue(value),
  } as any);
}

function mockFindOneSelectLean(value: unknown) {
  vi.mocked(User.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(value),
    }),
  } as any);
}

describe("AuthService.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns access and refresh tokens on success", async () => {
    mockFindOneLean(null);
    vi.mocked(User.create).mockResolvedValue(getMockUser() as any);

    const result = await AuthService.register({
      name: "Test User",
      email: "test@eventra.com",
      password: "Password1",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it("throws EMAIL_TAKEN if email already exists", async () => {
    mockFindOneLean(getMockUser());

    const err = await AuthService.register({
      name: "Test User",
      email: "test@eventra.com",
      password: "Password1",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe("EMAIL_TAKEN");
    expect(err.statusCode).toBe(409);
  });
});

describe("AuthService.login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws INVALID_CREDENTIALS for wrong password", async () => {
    mockFindOneSelectLean({
      ...getMockUser(),
      isActive: false,
    });

    const err = await AuthService.login({
      email: "test@eventra.com",
      password: "WrongPassword1",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe("INVALID_CREDENTIALS");
    expect(err.statusCode).toBe(401);
  });

  it("throws INVALID_CREDENTIALS when user does not exist", async () => {
    mockFindOneSelectLean(null);

    const err = await AuthService.login({
      email: "ghost@eventra.com",
      password: "Password1",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe("INVALID_CREDENTIALS");
  });

  it("throws ACCOUNT_DISABLED for inactive user", async () => {
    mockFindOneSelectLean({
      ...getMockUser(),
      isActive: false,
    });

    const err = await AuthService.login({
      email: "test@eventra.com",
      password: "Password1",
    }).catch((e) => e);

    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe("ACCOUNT_DISABLED");
    expect(err.statusCode).toBe(403);
  });
});

describe("AuthService.verifyAccessToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws INVALID_TOKEN for garbage input", async () => {
    const err = await AuthService.verifyAccessToken("garbage.token.here").catch(
      (e) => e,
    );

    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe("INVALID_TOKEN");
    expect(err.statusCode).toBe(401);
  });

  it("returns payload for a valid token", async () => {
    mockFindOneLean(null);
    vi.mocked(User.create).mockResolvedValue(getMockUser() as any);

    const { accessToken } = await AuthService.register({
      name: "Test User",
      email: "test@eventra.com",
      password: "Password1",
    });

    const payload = await AuthService.verifyAccessToken(accessToken);

    expect(payload.sub).toBe("user123");
    expect(payload.email).toBe("test@eventra.com");
    expect(payload.roles).toContain("user");
  });
});
