import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .min(5, "password must be at least 5 characters long")
    .max(40, "Password must be less than 40 characters long")
    .regex(/[A-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),

  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number")
    .optional(),
});

export const LoginSchema = z.object({
  email: z.email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(40, "Password must be less than 40 characters long"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export type UserRole = "user" | "admin";
