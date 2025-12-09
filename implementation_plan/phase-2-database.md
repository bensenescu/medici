# Phase 2: Database Schema Conversion (Drizzle + D1)

## PostgreSQL to SQLite Schema Mapping

| PostgreSQL         | SQLite (Drizzle)      | Notes                               |
| ------------------ | --------------------- | ----------------------------------- |
| `UUID`             | `TEXT` (uuid string)  | Generate with `crypto.randomUUID()` |
| `DOUBLE PRECISION` | `REAL`                | SQLite uses REAL for floats         |
| `ENUM types`       | `TEXT` with check     | Use Drizzle's `{ enum: [...] }`     |
| `TIMESTAMP`        | `TEXT` (ISO string)   | Store as ISO 8601 strings           |
| `BOOLEAN`          | `INTEGER`             | Use `{ mode: "boolean" }`           |
| `SERIAL`           | `INTEGER PRIMARY KEY` | Auto-increment                      |
| Partitioned tables | Regular tables        | D1 doesn't support partitioning     |
| Triggers           | Application logic     | Handle in service layer             |

## New Drizzle Schema

```typescript
// src/db/schema.ts
import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// Keep from workout-tracker pattern
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  venmoHandle: text("venmo_handle"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Expense categories as a type
export const expenseCategories = [
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
] as const;

export const splitMethods = ["percentage", "amount", "default"] as const;
export const poolRoles = ["PARTICIPANT", "ADMIN"] as const;
export const friendshipStatuses = ["pending", "accepted"] as const;

export const pools = sqliteTable(
  "pools",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("pools_created_at_idx").on(table.createdAt)],
);

export const poolMemberships = sqliteTable(
  "pool_memberships",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: poolRoles }).notNull().default("PARTICIPANT"),
    defaultSplitPercentage: real("default_split_percentage")
      .notNull()
      .default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("pool_memberships_pool_idx").on(table.poolId),
    index("pool_memberships_user_idx").on(table.userId),
  ],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    paidByUserId: text("paid_by_user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    amount: real("amount").notNull(),
    description: text("description"),
    notes: text("notes"),
    category: text("category", { enum: expenseCategories })
      .notNull()
      .default("miscellaneous"),
    splitMethod: text("split_method", { enum: splitMethods })
      .notNull()
      .default("default"),
    isSettled: integer("is_settled", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("expenses_pool_idx").on(table.poolId),
    index("expenses_paid_by_idx").on(table.paidByUserId),
    index("expenses_settled_idx").on(table.isSettled),
  ],
);

export const expenseLineItems = sqliteTable(
  "expense_line_items",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    debtorUserId: text("debtor_user_id")
      .notNull()
      .references(() => users.id),
    amount: real("amount").notNull(),
    isSettled: integer("is_settled", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    index("line_items_expense_idx").on(table.expenseId),
    index("line_items_debtor_idx").on(table.debtorUserId),
  ],
);

export const friendships = sqliteTable(
  "friendships",
  {
    id: text("id").primaryKey(),
    invitingUserId: text("inviting_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    friendUserId: text("friend_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: friendshipStatuses })
      .notNull()
      .default("pending"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("friendships_inviting_idx").on(table.invitingUserId),
    index("friendships_friend_idx").on(table.friendUserId),
  ],
);

export const expenseCategoryRules = sqliteTable(
  "expense_category_rules",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rule: text("rule").notNull(), // The text pattern to match
    category: text("category", { enum: expenseCategories }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("rules_user_idx").on(table.userId)],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  poolMemberships: many(poolMemberships),
  paidExpenses: many(expenses),
  friendshipsInitiated: many(friendships, { relationName: "inviting" }),
  friendshipsReceived: many(friendships, { relationName: "friend" }),
  categoryRules: many(expenseCategoryRules),
}));

export const poolsRelations = relations(pools, ({ many }) => ({
  memberships: many(poolMemberships),
  expenses: many(expenses),
}));

export const poolMembershipsRelations = relations(
  poolMemberships,
  ({ one }) => ({
    pool: one(pools, {
      fields: [poolMemberships.poolId],
      references: [pools.id],
    }),
    user: one(users, {
      fields: [poolMemberships.userId],
      references: [users.id],
    }),
  }),
);

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  pool: one(pools, { fields: [expenses.poolId], references: [pools.id] }),
  paidBy: one(users, {
    fields: [expenses.paidByUserId],
    references: [users.id],
  }),
  lineItems: many(expenseLineItems),
}));

export const expenseLineItemsRelations = relations(
  expenseLineItems,
  ({ one }) => ({
    expense: one(expenses, {
      fields: [expenseLineItems.expenseId],
      references: [expenses.id],
    }),
    debtor: one(users, {
      fields: [expenseLineItems.debtorUserId],
      references: [users.id],
    }),
  }),
);

// Type exports
export type User = typeof users.$inferSelect;
export type Pool = typeof pools.$inferSelect;
export type PoolMembership = typeof poolMemberships.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseLineItem = typeof expenseLineItems.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type ExpenseCategoryRule = typeof expenseCategoryRules.$inferSelect;
```

## What's Removed from PostgreSQL Schema

1. **`member_password` table** - Auth handled by Every App
2. **Password hashing logic** - Not needed
3. **JWT generation/validation** - Handled by SDK
4. **Table partitioning** - Not supported in D1
5. **Database triggers** - Moved to application layer

## Validation Logic (Move to Service Layer)

The PostgreSQL triggers need to be implemented in TypeScript:

```typescript
// src/server/services/ExpenseService.ts
function validateLineItemsSum(expense: CreateExpense) {
  const lineItemTotal = expense.lineItems.reduce(
    (sum, li) => sum + li.amount,
    0,
  );
  if (Math.abs(lineItemTotal - expense.amount) > 0.05) {
    throw new Error("Line items must sum to expense amount");
  }
}

function validateDefaultSplits(poolMemberships: PoolMembership[]) {
  const totalPercentage = poolMemberships.reduce(
    (sum, m) => sum + m.defaultSplitPercentage,
    0,
  );
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error("Default splits must sum to 100%");
  }
}
```

## Phase 2 Deliverables

| Action  | File                                                |
| ------- | --------------------------------------------------- |
| Rewrite | `src/db/schema.ts` (new expense schema)             |
| Create  | `drizzle/0001_expense_tracking.sql` (new migration) |
