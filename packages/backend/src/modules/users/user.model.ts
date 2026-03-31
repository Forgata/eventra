import mongoose, { Schema, Document } from "mongoose";
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  roles: ("user" | "admin")[];
  avatarUrl?: string;
  phone?: string;
  interests: string[];
  walletBalance: number;
  isActive: boolean;
  emailVerifiedAt?: Date;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    roles: { type: [String], enum: ["user", "admin"], default: ["user"] },
    avatarUrl: { type: String },
    phone: { type: String },
    interests: { type: [String], default: [] },
    walletBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    emailVerifiedAt: { type: Date },
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  },
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ roles: 1 });
UserSchema.index({ isActive: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
