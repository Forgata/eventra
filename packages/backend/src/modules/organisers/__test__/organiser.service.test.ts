import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  OrganizerService,
  OrganizerError,
  OrganizerErrorCode,
} from "../organiser.service.js";
import { Organizer } from "../organiser.model.js";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Organizer.deleteMany({});
});

const service = new OrganizerService();

const validUserId = () => new mongoose.Types.ObjectId().toString();

describe("OrganizerService", () => {
  describe("createOrganizer", () => {
    it("creates an organizer with valid input", async () => {
      const userId = validUserId();

      const organizer = await service.createOrganizer({
        userId,
        orgName: "Test Org",
        bio: "We do cool events.",
      });

      expect(organizer.orgName).toBe("Test Org");
      expect(organizer.bio).toBe("We do cool events.");
      expect(organizer.verified).toBe(false);
      expect(organizer.userId.toString()).toBe(userId);
    });

    it("throws ALREADY_ORGANIZER if userId already has a profile", async () => {
      const userId = validUserId();

      await service.createOrganizer({ userId, orgName: "First Org" });

      await expect(
        service.createOrganizer({ userId, orgName: "Duplicate Org" }),
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof OrganizerError &&
          err.code === OrganizerErrorCode.ALREADY_ORGANIZER
        );
      });
    });
  });

  describe("getOrganizerByUserId", () => {
    it("returns the organizer when found", async () => {
      const userId = validUserId();
      await service.createOrganizer({ userId, orgName: "Found Org" });

      const organizer = await service.getOrganizerByUserId(userId);

      expect(organizer.orgName).toBe("Found Org");
      expect(organizer.userId.toString()).toBe(userId);
    });

    it("throws NOT_FOUND when no profile exists", async () => {
      await expect(
        service.getOrganizerByUserId(validUserId()),
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof OrganizerError &&
          err.code === OrganizerErrorCode.NOT_FOUND
        );
      });
    });
  });

  describe("getOrganizerById", () => {
    it("returns the organizer when found", async () => {
      const userId = validUserId();
      const created = await service.createOrganizer({
        userId,
        orgName: "By ID Org",
      });

      const organizer = await service.getOrganizerById(created._id.toString());

      expect(organizer.orgName).toBe("By ID Org");
    });

    it("throws INVALID_ID for a malformed id", async () => {
      await expect(
        service.getOrganizerById("not-a-valid-id"),
      ).rejects.toSatisfy((err: unknown) => {
        return (
          err instanceof OrganizerError &&
          err.code === OrganizerErrorCode.INVALID_ID
        );
      });
    });

    it("throws NOT_FOUND for a valid but non-existent id", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(service.getOrganizerById(nonExistentId)).rejects.toSatisfy(
        (err: unknown) => {
          return (
            err instanceof OrganizerError &&
            err.code === OrganizerErrorCode.NOT_FOUND
          );
        },
      );
    });
  });
});
