import { Types } from "mongoose";
import { Organizer, type IOrganizer } from "./organiser.model.js";

// ---- Error handling ----

export class OrganizerError extends Error {
  constructor(
    message: string,
    public readonly code: OrganizerErrorCode,
  ) {
    super(message);
    this.name = "OrganizerError";
  }
}

export const OrganizerErrorCode = {
  ALREADY_ORGANIZER: "ALREADY_ORGANIZER",
  NOT_FOUND: "NOT_FOUND",
  INVALID_ID: "INVALID_ID",
} as const;

export type OrganizerErrorCode =
  (typeof OrganizerErrorCode)[keyof typeof OrganizerErrorCode];

export interface CreateOrganizerInput {
  userId: string;
  orgName: string;
  bio?: string;
}

export class OrganizerService {
  /**
   * Creates a new organizer from the given input.
   * Throws an error if an organizer already exists for the given user.
   * @param input - The input containing the user's ID, org name, and optional bio.
   * @returns A promise that resolves with the newly created organizer.
   * @throws OrganizerError if an organizer already exists for the given user.
   */
  async createOrganizer(input: CreateOrganizerInput): Promise<IOrganizer> {
    const existing = await Organizer.findOne({ userId: input.userId }).lean();

    if (existing !== null) {
      throw new OrganizerError(
        "This account is already registered as an organizer.",
        OrganizerErrorCode.ALREADY_ORGANIZER,
      );
    }

    const organizer = await Organizer.create({
      userId: new Types.ObjectId(input.userId),
      orgName: input.orgName,
      ...(input.bio && { bio: input.bio }),
    });

    return organizer;
  }

  /**
   * Fetch an organizer by their userId.
   * Used for ownership validation and dashboard access.
   */
  async getOrganizerByUserId(userId: string): Promise<IOrganizer> {
    const organizer = await Organizer.findOne({ userId }).lean();

    if (organizer === null) {
      throw new OrganizerError(
        "Organizer profile not found.",
        OrganizerErrorCode.NOT_FOUND,
      );
    }

    return organizer;
  }

  /**
   * Fetch an organizer by their _id.
   * Used for general resolution (e.g. event listing joins).
   */
  async getOrganizerById(organizerId: string): Promise<IOrganizer> {
    if (!Types.ObjectId.isValid(organizerId)) {
      throw new OrganizerError(
        "Invalid organizer ID.",
        OrganizerErrorCode.INVALID_ID,
      );
    }

    const organizer = await Organizer.findById(organizerId).lean();

    if (organizer === null) {
      throw new OrganizerError(
        "Organizer not found.",
        OrganizerErrorCode.NOT_FOUND,
      );
    }

    return organizer;
  }
}
