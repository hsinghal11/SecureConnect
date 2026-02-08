import { z } from "zod";

// No changes needed. This schema is for user registration and remains valid.
export const userSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(20, "Password must be at most 20 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d@$!%*?&_#^~]{8,20}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    .trim(),
  pic: z.string().optional(),
  publicKey: z.string().optional(),
});

// No changes needed. This schema is for user login and remains valid.
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .nonempty("Email is required")
    .email("Invalid email required"),
  password: z.string().min(1, "Password is required").trim(),
});

// REWRITTEN: This schema now validates the content for sending a message in our E2EE system.
export const sendMessageSchema = z.object({
  // The 'chatId' specifies which conversation the message belongs to.
  chatId: z.number().int().positive(),

  // The 'content' can be either the legacy format or the new envelope format.
  content: z.union([
    // Legacy: simple map of userId -> encryptedString
    z.record(z.string(), z.string()),
    // New Envelope: { version, algorithm, recipients: { userId: encryptedString } }
    z.object({
      version: z.number(),
      algorithm: z.string(),
      recipients: z.record(z.string(), z.string()),
    }),
  ]),
});

// NEW: A simple schema to validate the request for accessing a 1-on-1 chat.
export const accessChatSchema = z.object({
  otherUserId: z.number().int().positive("A valid user ID is required."),
});

// DELETED: The 'groupChatSchema' has been removed as it is no longer needed.
