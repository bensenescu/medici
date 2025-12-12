import {
  sqliteTable,
  text,
  real,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// Enums (stored as TEXT with constraints)
// ============================================================================

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

export const DEFAULT_EXPENSE_CATEGORY = "miscellaneous" as const;

export const poolRoles = ["PARTICIPANT", "ADMIN"] as const;

// ============================================================================
// Tables
// ============================================================================

// Users table - extended from base template
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
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

// Pools table - expense sharing groups
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

// Pool memberships - many-to-many between users and pools
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
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("pool_memberships_pool_idx").on(table.poolId),
    index("pool_memberships_user_idx").on(table.userId),
  ],
);

// Expenses table - individual expenses within a pool
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

// Friendships table - friend connections between users
export const friendships = sqliteTable(
  "friendships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    friendUserId: text("friend_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("friendships_user_idx").on(table.userId),
    index("friendships_friend_idx").on(table.friendUserId),
  ],
);

// Expense category rules - auto-categorization patterns
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

// Settlements table - tracks individual payments between users
export const settlements = sqliteTable(
  "settlements",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => users.id), // who paid (debtor)
    toUserId: text("to_user_id")
      .notNull()
      .references(() => users.id), // who received (creditor)
    amount: real("amount").notNull(),
    note: text("note"), // optional: "Venmo", "cash", etc.
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id), // who recorded this settlement
  },
  (table) => [
    index("settlements_pool_idx").on(table.poolId),
    index("settlements_from_user_idx").on(table.fromUserId),
    index("settlements_to_user_idx").on(table.toUserId),
  ],
);

// ============================================================================
// Relations
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  poolMemberships: many(poolMemberships),
  paidExpenses: many(expenses),
  friendshipsOwned: many(friendships, { relationName: "friendshipsOwned" }),
  friendshipsReceived: many(friendships, {
    relationName: "friendshipsReceived",
  }),
  categoryRules: many(expenseCategoryRules),
  settlementsMade: many(settlements, { relationName: "settlementsMade" }),
  settlementsReceived: many(settlements, {
    relationName: "settlementsReceived",
  }),
  settlementsCreated: many(settlements, { relationName: "settlementsCreated" }),
}));

export const poolsRelations = relations(pools, ({ many }) => ({
  memberships: many(poolMemberships),
  expenses: many(expenses),
  settlements: many(settlements),
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

export const expensesRelations = relations(expenses, ({ one }) => ({
  pool: one(pools, { fields: [expenses.poolId], references: [pools.id] }),
  paidBy: one(users, {
    fields: [expenses.paidByUserId],
    references: [users.id],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: "friendshipsOwned",
  }),
  friendUser: one(users, {
    fields: [friendships.friendUserId],
    references: [users.id],
    relationName: "friendshipsReceived",
  }),
}));

export const expenseCategoryRulesRelations = relations(
  expenseCategoryRules,
  ({ one }) => ({
    user: one(users, {
      fields: [expenseCategoryRules.userId],
      references: [users.id],
    }),
  }),
);

export const settlementsRelations = relations(settlements, ({ one }) => ({
  pool: one(pools, {
    fields: [settlements.poolId],
    references: [pools.id],
  }),
  fromUser: one(users, {
    fields: [settlements.fromUserId],
    references: [users.id],
    relationName: "settlementsMade",
  }),
  toUser: one(users, {
    fields: [settlements.toUserId],
    references: [users.id],
    relationName: "settlementsReceived",
  }),
  createdBy: one(users, {
    fields: [settlements.createdByUserId],
    references: [users.id],
    relationName: "settlementsCreated",
  }),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;

export type PoolMembership = typeof poolMemberships.$inferSelect;
export type NewPoolMembership = typeof poolMemberships.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;

export type ExpenseCategoryRule = typeof expenseCategoryRules.$inferSelect;
export type NewExpenseCategoryRule = typeof expenseCategoryRules.$inferInsert;

export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;

// Enum type exports
export type ExpenseCategory = (typeof expenseCategories)[number];

export type PoolRole = (typeof poolRoles)[number];
