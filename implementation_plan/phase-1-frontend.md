# Phase 1: Frontend Conversion to TanStack Start (Mocked Backend)

## Project Structure Changes

Replace the current todo app structure with expense tracking:

```
src/
├── client/
│   ├── components/
│   │   ├── ui/                      # Keep existing + add new
│   │   │   ├── badge.tsx            # (keep)
│   │   │   ├── button.tsx           # (keep)
│   │   │   ├── card.tsx             # (keep)
│   │   │   ├── confirmation-modal.tsx # (add)
│   │   │   ├── empty-state.tsx      # (add)
│   │   │   └── modal.tsx            # (add)
│   │   ├── DefaultCatchBoundary.tsx # (keep)
│   │   ├── NotFound.tsx             # (keep)
│   │   ├── Sidebar.tsx              # (modify for pools nav)
│   │   ├── TabBar.tsx               # (modify for expense nav)
│   │   ├── MobileHeader.tsx         # (modify)
│   │   │
│   │   # New expense components (port from .medici/frontend):
│   │   ├── ExpenseCard.tsx
│   │   ├── ExpenseModal.tsx         # Add/Update expense
│   │   ├── PoolSummary.tsx
│   │   ├── PoolBalances.tsx
│   │   ├── SettleUpModal.tsx
│   │   ├── CreatePoolModal.tsx
│   │   ├── AddMemberModal.tsx
│   │   ├── FriendsView.tsx
│   │   ├── AddFriendModal.tsx
│   │   ├── RulesView.tsx
│   │   ├── SpendingAnalytics.tsx
│   │   └── MemberProfile.tsx
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx           # (keep)
│   │   ├── usePoolData.ts           # New: compose pool data
│   │   ├── useFriendsData.ts        # New: friends & requests
│   │   ├── useBalanceCalculation.ts # New: balance computation
│   │   └── useExpenseRules.ts       # New: auto-categorization
│   │
│   ├── tanstack-db/
│   │   ├── index.ts
│   │   ├── persister.ts
│   │   ├── queryClient.ts
│   │   ├── poolsCollection.ts       # New
│   │   ├── poolMembershipsCollection.ts # New
│   │   ├── expensesCollection.ts    # New (replace todoCollection)
│   │   ├── expenseLineItemsCollection.ts # New
│   │   ├── friendsCollection.ts     # New
│   │   └── rulesCollection.ts       # New
│   │
│   └── actions/
│       ├── poolActions.ts           # New
│       ├── expenseActions.ts        # New
│       └── friendActions.ts         # New
│
├── routes/
│   ├── __root.tsx                   # (modify: update nav)
│   ├── index.tsx                    # Home: Pools list + Friends tab
│   ├── pools.$poolId.tsx            # Pool details page
│   ├── friends.tsx                  # Friends management
│   └── rules.tsx                    # Categorization rules
│
├── serverFunctions/
│   ├── pools.ts                     # (replace todos.ts)
│   ├── expenses.ts                  # New
│   ├── friends.ts                   # New
│   └── rules.ts                     # New
│
└── types/
    └── schemas/
        ├── pools.ts                 # Zod schemas
        ├── expenses.ts
        ├── friends.ts
        └── rules.ts
```

## Types & Schemas

```typescript
// src/types/schemas/expenses.ts
export const expenseCategoryEnum = z.enum([
  "food_dining",
  "groceries",
  "transportation",
  "housing_rent",
  "utilities",
  "healthcare",
  "entertainment",
  "shopping",
  "education",
  "travel",
  "personal_care",
  "fitness",
  "subscriptions",
  "bills_payments",
  "business_expenses",
  "investments",
  "insurance",
  "gifts",
  "charity",
  "miscellaneous",
  "home_household_supplies",
  "pets",
  "taxes",
  "childcare",
  "professional_services",
]);

export const splitMethodEnum = z.enum(["percentage", "amount", "default"]);
export const poolRoleEnum = z.enum(["PARTICIPANT", "ADMIN"]);
export const friendshipStatusEnum = z.enum(["pending", "accepted"]);

export const createExpenseSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  category: expenseCategoryEnum,
  splitMethod: splitMethodEnum,
  description: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(
    z.object({
      debtorId: z.string(),
      amount: z.number(),
    }),
  ),
});
```

## Mocked Server Functions

For Phase 1, create server functions that return mocked data:

```typescript
// src/serverFunctions/pools.ts
export const getAllPools = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    // MOCK: Return sample pools for development
    return {
      pools: [
        {
          id: "pool-1",
          name: "Roommates",
          description: "Monthly shared expenses",
          createdAt: new Date().toISOString(),
        },
        // ... more mock data
      ],
    };
  });
```

## Components to Port (Priority Order)

1. **PoolSummary.tsx** - Pool cards for home page
2. **ExpenseCard.tsx** - Individual expense display
3. **ExpenseModal.tsx** - Add/edit expense with split logic
4. **PoolBalances.tsx** - Who owes whom
5. **SettleUpModal.tsx** - Settle debts
6. **CreatePoolModal.tsx** - New pool creation
7. **FriendsView.tsx** - Friends list
8. **SpendingAnalytics.tsx** - Category breakdown chart

## Balance Calculation Logic (Port from Rust)

The Ford-Fulkerson algorithm for debt simplification needs to be ported to TypeScript:

```typescript
// src/client/hooks/useBalanceCalculation.ts
// Port the logic from .medici/server/src/lib.rs
// This is complex but essential for the settle-up feature
```

## Phase 1 Deliverables

| Action | File                                           |
| ------ | ---------------------------------------------- |
| Delete | `src/client/components/TodoItem.tsx`           |
| Delete | `src/client/components/TodoHistoryItem.tsx`    |
| Delete | `src/client/components/MobileTodoInput.tsx`    |
| Delete | `src/client/tanstack-db/todoCollection.ts`     |
| Delete | `src/serverFunctions/todos.ts`                 |
| Modify | `src/routes/__root.tsx` (update nav)           |
| Modify | `src/routes/index.tsx` (pools list)            |
| Create | `src/routes/pools.$poolId.tsx`                 |
| Create | `src/routes/friends.tsx`                       |
| Create | `src/routes/rules.tsx`                         |
| Create | `src/client/components/ExpenseCard.tsx`        |
| Create | `src/client/components/ExpenseModal.tsx`       |
| Create | `src/client/components/PoolSummary.tsx`        |
| Create | `src/client/components/PoolBalances.tsx`       |
| Create | `src/client/components/SettleUpModal.tsx`      |
| Create | `src/client/components/CreatePoolModal.tsx`    |
| Create | `src/client/components/FriendsView.tsx`        |
| Create | `src/client/components/SpendingAnalytics.tsx`  |
| Create | `src/client/tanstack-db/poolsCollection.ts`    |
| Create | `src/client/tanstack-db/expensesCollection.ts` |
| Create | `src/client/tanstack-db/friendsCollection.ts`  |
| Create | `src/types/schemas/expenses.ts`                |
| Create | `src/types/schemas/pools.ts`                   |
| Create | `src/types/schemas/friends.ts`                 |
