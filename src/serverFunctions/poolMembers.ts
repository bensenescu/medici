import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client";
import { db } from "@/db";
import { poolMemberships } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// ============================================================================
// Pool Member type with user info for client-side use
// ============================================================================

export type PoolMemberWithUser = {
  id: string;
  poolId: string;
  userId: string;
  role: "PARTICIPANT" | "ADMIN";
  defaultSplitPercentage: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    venmoHandle: string | null;
  };
};

// ============================================================================
// GET CURRENT USER
// ============================================================================

export const getCurrentUser = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return { userId: context.userId };
  });

// ============================================================================
// GET ALL POOL MEMBERS (for current user's pools)
// ============================================================================

export const getAllPoolMembers = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const userId = context.userId;

    // Get all pools the user is a member of
    const userMemberships = await db.query.poolMemberships.findMany({
      where: eq(poolMemberships.userId, userId),
      columns: { poolId: true },
    });

    const poolIds = userMemberships.map((m) => m.poolId);

    if (poolIds.length === 0) {
      return { poolMembers: [] };
    }

    // Get all memberships for those pools with user info
    const allMemberships = await db.query.poolMemberships.findMany({
      where: inArray(poolMemberships.poolId, poolIds),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            venmoHandle: true,
          },
        },
      },
    });

    return {
      poolMembers: allMemberships as PoolMemberWithUser[],
    };
  });
