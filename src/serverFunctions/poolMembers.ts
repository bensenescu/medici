import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@/embedded-sdk/client/useSessionTokenClientMiddleware";
import { PoolMemberService } from "@/server/services";

// Re-export the type from central location for backwards compatibility
export type { PoolMemberWithUser } from "@/types";

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
