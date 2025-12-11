import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client/useSessionTokenClientMiddleware";
import { PoolMemberService } from "@/server/services";

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
    const poolMembers = await PoolMemberService.getAllPoolMembers(
      context.userId,
    );
    return { poolMembers };
  });
