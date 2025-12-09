# Phase 3: Backend Implementation + Auth Removal

## Authentication Removal

### What's being removed (from Medici)

| Location                                 | What to Remove                                              |
| ---------------------------------------- | ----------------------------------------------------------- |
| `server/src/handlers.rs`                 | `signup_handler`, `login_handler`, `authenticate_handler`   |
| `server/src/handlers.rs`                 | `AuthenticatedUser` extractor, `verify_jwt`, `generate_jwt` |
| `server/src/handlers.rs`                 | `PASSWORD_SALT`, `hash_password`                            |
| `server/src/models.rs`                   | `MemberPassword` model                                      |
| `frontend/src/hooks/use-auth.tsx`        | Entire file                                                 |
| `frontend/src/routes/login.tsx`          | Entire file                                                 |
| `frontend/src/routes/signup.tsx`         | Entire file                                                 |
| `frontend/src/components/login-form.tsx` | Entire file                                                 |
| `server/migrations/`                     | `member_password` table migration                           |

### What replaces it (from Every App SDK)

```typescript
// Already in place from workout-tracker pattern:
// src/embedded-sdk/client/  - Session manager, token middleware
// src/embedded-sdk/server/  - JWT verification against Every App JWKS
// src/middleware/ensureUser.ts - User creation on first auth
```

## Server Architecture

```
src/server/
├── repositories/
│   ├── UserRepository.ts
│   ├── PoolRepository.ts
│   ├── ExpenseRepository.ts
│   ├── FriendshipRepository.ts
│   └── RuleRepository.ts
│
└── services/
    ├── UserService.ts
    ├── PoolService.ts        # Pool CRUD + member management
    ├── ExpenseService.ts     # Expense CRUD + line items
    ├── BalanceService.ts     # Balance computation (port from Rust)
    ├── FriendshipService.ts  # Friend requests
    └── RuleService.ts        # Auto-categorization rules
```

## Rust to TypeScript Porting Guide

### Key files to port

| Rust File                 | TypeScript Target            | Complexity |
| ------------------------- | ---------------------------- | ---------- |
| `handlers.rs` endpoints   | `serverFunctions/*.ts`       | Medium     |
| `models.rs` queries       | `repositories/*.ts`          | Medium     |
| `lib.rs` (Ford-Fulkerson) | `services/BalanceService.ts` | High       |

### Balance Calculation Algorithm (from `lib.rs`)

```typescript
// src/server/services/BalanceService.ts
import { ExpenseLineItem, PoolMembership } from "@/db/schema";

interface MemberBalance {
  userId: string;
  balance: number; // Positive = owed money, Negative = owes money
}

interface DebtEdge {
  from: string;
  to: string;
  amount: number;
}

export class BalanceService {
  /**
   * Calculate balances for a pool using the Ford-Fulkerson max-flow algorithm
   * to simplify the debt graph into minimum transactions.
   *
   * Port from: .medici/server/src/lib.rs compute_balance_of_member()
   */
  static computePoolBalances(
    lineItems: ExpenseLineItem[],
    memberships: PoolMembership[],
  ): MemberBalance[] {
    // Step 1: Calculate net balance for each member
    const netBalances = new Map<string, number>();

    for (const membership of memberships) {
      netBalances.set(membership.userId, 0);
    }

    for (const item of lineItems) {
      if (!item.isSettled) {
        // Debtor owes this amount (negative balance)
        const debtorBalance = netBalances.get(item.debtorUserId) ?? 0;
        netBalances.set(item.debtorUserId, debtorBalance - item.amount);

        // Get the expense to find who was paid
        // Payer is owed this amount (positive balance)
        // Note: Need to join with expenses to get paidByUserId
      }
    }

    // Step 2: Simplify using Ford-Fulkerson (minimize transactions)
    return this.simplifyDebts(netBalances);
  }

  private static simplifyDebts(
    netBalances: Map<string, number>,
  ): MemberBalance[] {
    // Implementation of Ford-Fulkerson algorithm
    // Separates into payers (positive balance) and receivers (negative balance)
    // Matches them to minimize total number of transactions
    // ... (detailed implementation needed)
  }
}
```

## Server Functions Structure

```typescript
// src/serverFunctions/pools.ts
export const getAllPools = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PoolService.getPoolsForUser(context.userId);
  });

export const createPool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createPoolSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PoolService.create(context.userId, data);
  });

export const getPoolDetails = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ poolId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // Verify user is a member of this pool
    return PoolService.getPoolWithDetails(data.poolId, context.userId);
  });

export const addMemberToPool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => addMemberSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify requester is admin
    return PoolService.addMember(data.poolId, data.friendId, context.userId);
  });

export const settleUpPool = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ poolId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    return PoolService.settleUp(data.poolId, context.userId);
  });
```

```typescript
// src/serverFunctions/expenses.ts
export const getPoolExpenses = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ poolId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    return ExpenseService.getExpensesForPool(data.poolId, context.userId);
  });

export const createExpense = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createExpenseSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Validate line items sum, apply auto-categorization rules
    return ExpenseService.create(data, context.userId);
  });

export const updateExpense = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => updateExpenseSchema.parse(data))
  .handler(async ({ data, context }) => {
    return ExpenseService.update(data, context.userId);
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ expenseId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    return ExpenseService.delete(data.expenseId, context.userId);
  });
```

## Repository Pattern

```typescript
// src/server/repositories/ExpenseRepository.ts
import { db } from "@/db";
import { expenses, expenseLineItems } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export class ExpenseRepository {
  static async findByPool(poolId: string) {
    return db.query.expenses.findMany({
      where: eq(expenses.poolId, poolId),
      with: {
        lineItems: true,
        paidBy: true,
      },
      orderBy: [desc(expenses.createdAt)],
    });
  }

  static async create(data: NewExpense, lineItemsData: NewExpenseLineItem[]) {
    // Use db.batch() for atomic operation
    await db.batch([
      db.insert(expenses).values(data),
      ...lineItemsData.map((li) => db.insert(expenseLineItems).values(li)),
    ]);
  }

  static async settlePoolExpenses(poolId: string) {
    const now = new Date().toISOString();

    // Mark all expenses as settled
    await db
      .update(expenses)
      .set({ isSettled: true, updatedAt: now })
      .where(and(eq(expenses.poolId, poolId), eq(expenses.isSettled, false)));

    // Mark all line items as settled
    // (This requires a subquery or join - D1 supports this)
    const poolExpenseIds = db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.poolId, poolId));

    await db
      .update(expenseLineItems)
      .set({ isSettled: true })
      .where(
        and(
          inArray(expenseLineItems.expenseId, poolExpenseIds),
          eq(expenseLineItems.isSettled, false),
        ),
      );
  }
}
```

## Authorization Pattern

Since auth is handled by the SDK, we need **authorization** checks:

```typescript
// src/server/services/PoolService.ts
export class PoolService {
  static async verifyPoolMembership(
    poolId: string,
    userId: string,
  ): Promise<PoolMembership> {
    const membership = await db.query.poolMemberships.findFirst({
      where: and(
        eq(poolMemberships.poolId, poolId),
        eq(poolMemberships.userId, userId),
      ),
    });

    if (!membership) {
      throw new Response("Not a member of this pool", { status: 403 });
    }

    return membership;
  }

  static async verifyPoolAdmin(poolId: string, userId: string): Promise<void> {
    const membership = await this.verifyPoolMembership(poolId, userId);

    if (membership.role !== "ADMIN") {
      throw new Response("Must be pool admin", { status: 403 });
    }
  }

  static async addMember(
    poolId: string,
    friendId: string,
    requesterId: string,
  ) {
    // 1. Verify requester is admin
    await this.verifyPoolAdmin(poolId, requesterId);

    // 2. Verify they are friends
    const friendship = await db.query.friendships.findFirst({
      where: and(
        or(
          and(
            eq(friendships.invitingUserId, requesterId),
            eq(friendships.friendUserId, friendId),
          ),
          and(
            eq(friendships.invitingUserId, friendId),
            eq(friendships.friendUserId, requesterId),
          ),
        ),
        eq(friendships.status, "accepted"),
      ),
    });

    if (!friendship) {
      throw new Response("Must be friends to add to pool", { status: 400 });
    }

    // 3. Add member
    await db.insert(poolMemberships).values({
      id: crypto.randomUUID(),
      poolId,
      userId: friendId,
      role: "PARTICIPANT",
      defaultSplitPercentage: 0, // Will need to be recalculated
    });
  }
}
```

## Phase 3 Deliverables

| Action | File                                              |
| ------ | ------------------------------------------------- |
| Create | `src/serverFunctions/pools.ts`                    |
| Create | `src/serverFunctions/expenses.ts`                 |
| Create | `src/serverFunctions/friends.ts`                  |
| Create | `src/serverFunctions/rules.ts`                    |
| Create | `src/server/repositories/PoolRepository.ts`       |
| Create | `src/server/repositories/ExpenseRepository.ts`    |
| Create | `src/server/repositories/FriendshipRepository.ts` |
| Create | `src/server/services/PoolService.ts`              |
| Create | `src/server/services/ExpenseService.ts`           |
| Create | `src/server/services/BalanceService.ts`           |
| Create | `src/server/services/FriendshipService.ts`        |
