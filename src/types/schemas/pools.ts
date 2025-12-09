import { z } from "zod";
import { poolRoles } from "../index";

export const createPoolSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Pool name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

export const updatePoolSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, "Pool name is required")
    .max(100, "Name too long")
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
});

export const deletePoolSchema = z.object({
  id: z.string().uuid(),
});

export const addMemberToPoolSchema = z.object({
  poolId: z.string().uuid(),
  userId: z.string(),
  role: z.enum(poolRoles).default("PARTICIPANT"),
  defaultSplitPercentage: z.number().min(0).max(100).default(0),
});

export const updateMemberSplitSchema = z.object({
  poolId: z.string().uuid(),
  memberships: z.array(
    z.object({
      userId: z.string(),
      defaultSplitPercentage: z.number().min(0).max(100),
    }),
  ),
});

export const removeMemberFromPoolSchema = z.object({
  poolId: z.string().uuid(),
  userId: z.string(),
});

export type CreatePool = z.infer<typeof createPoolSchema>;
export type UpdatePool = z.infer<typeof updatePoolSchema>;
export type AddMemberToPool = z.infer<typeof addMemberToPoolSchema>;
export type UpdateMemberSplit = z.infer<typeof updateMemberSplitSchema>;
