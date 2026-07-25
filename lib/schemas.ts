import { z } from "zod";
import { MEMORY_CATEGORIES } from "./categories";

/**
 * Request contracts for the memory API routes.
 *
 * Every route validates against these before touching a third party. The user
 * identifier is a client-generated UUID and nothing else: no name, no email,
 * no phone. That keeps sensitive health context tied to an opaque handle.
 */

export const userIdSchema = z.uuid();

export const profileRequestSchema = z.object({
  userId: userIdSchema,
});

export const addMemoryRequestSchema = z.object({
  userId: userIdSchema,
  content: z.string().min(1).max(8000),
  category: z.enum(MEMORY_CATEGORIES),
});

export type ProfileRequest = z.infer<typeof profileRequestSchema>;
export type AddMemoryRequest = z.infer<typeof addMemoryRequestSchema>;
