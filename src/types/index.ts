// Re-export types from database schema
export {
  expenseCategories,
  poolRoles,
  type User,
  type Pool,
  type PoolMembership,
  type Expense,
  type Friendship,
  type ExpenseCategoryRule,
  type ExpenseCategory,
  type PoolRole,
  type Settlement,
} from "@/db/schema";

// Import for local use
import { expenseCategories as _expenseCategories } from "@/db/schema";

// Re-export balance types from service (single source of truth)
export type {
  MemberBalance,
  SimplifiedDebt,
  BalanceUser,
  PoolBalanceResult,
} from "@/shared/BalanceService";

// Computed types for UI
export type PoolWithMemberships = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  memberships: Array<{
    id: string;
    poolId: string;
    userId: string;
    role: "PARTICIPANT" | "ADMIN";
    createdAt: string;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      bio: string | null;
      venmoHandle: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }>;
};

export type ExpenseWithDetails = {
  id: string;
  poolId: string;
  paidByUserId: string;
  name: string;
  amount: number;
  category: (typeof _expenseCategories)[number];
  createdAt: string;
  updatedAt: string;
  paidBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    venmoHandle: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

// Pool member with embedded user info (for UI display)
export type PoolMemberWithUser = {
  id: string;
  poolId: string;
  userId: string;
  role: "PARTICIPANT" | "ADMIN";
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    venmoHandle: string | null;
  };
};

// Selected debt for payment modal
export type SelectedDebt = {
  toUserId: string;
  toUserName: string;
  toUserVenmo: string | null;
  maxAmount: number;
  paymentAmount: string;
};

// Category display info - typed to ensure all categories have display info
export const categoryInfo: Record<
  (typeof _expenseCategories)[number],
  { label: string }
> = {
  food_dining: { label: "Food & Dining" },
  groceries: { label: "Groceries" },
  transportation: { label: "Transportation" },
  housing_rent: { label: "Housing/Rent" },
  utilities: { label: "Utilities" },
  healthcare: { label: "Healthcare" },
  entertainment: { label: "Entertainment" },
  shopping: { label: "Shopping" },
  education: { label: "Education" },
  travel: { label: "Travel" },
  personal_care: { label: "Personal Care" },
  fitness: { label: "Fitness" },
  subscriptions: { label: "Subscriptions" },
  bills_payments: { label: "Bills & Payments" },
  business_expenses: { label: "Business" },
  investments: { label: "Investments" },
  insurance: { label: "Insurance" },
  gifts: { label: "Gifts" },
  charity: { label: "Charity" },
  miscellaneous: { label: "Miscellaneous" },
  home_household_supplies: { label: "Home & Supplies" },
  pets: { label: "Pets" },
  taxes: { label: "Taxes" },
  childcare: { label: "Childcare" },
  professional_services: { label: "Professional Services" },
};
