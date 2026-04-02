import { Schema, model, type Document, type Types } from "mongoose";

/**
 * Payment details are intentionally minimal at this stage.
 * Stripe account linking and payout metadata will be added
 * in the payments module — keeping this a plain sub-doc for now.
 */
export interface IPaymentDetails {
  stripeAccountId?: string;
  stripeOnboardingComplete: boolean;
}

export interface IOrganizer extends Document {
  userId: Types.ObjectId;
  orgName: string;
  bio?: string;
  verified: boolean;
  paymentDetails: IPaymentDetails;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const paymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    stripeAccountId: {
      type: String,
      default: undefined,
    },
    stripeOnboardingComplete: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const organizerSchema = new Schema<IOrganizer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orgName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: undefined,
    },
    verified: {
      type: Boolean,
      default: false,
    },

    paymentDetails: {
      type: paymentDetailsSchema,
      default: () => ({ stripeOnboardingComplete: false }),
    },

    schemaVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,

    /**
     * Soft-delete only — arch doc: "Organizer deletion is soft-only."
     * Hard deletes are never issued against this collection.
     * A future `deletedAt` field can be added when soft-delete logic lands.
     */
  },
);

organizerSchema.index({ userId: 1 }, { unique: true });

organizerSchema.index({ verified: 1, createdAt: -1 });

export const Organizer = model<IOrganizer>("Organizer", organizerSchema);
