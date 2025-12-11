// Re-export types from database schema
export {
  expenseCategories,
  poolRoles,
  friendshipStatuses,
  type User,
  type Pool,
  type PoolMembership,
  type Expense,
  type ExpenseLineItem,
  type Friendship,
  type ExpenseCategoryRule,
  type ExpenseCategory,
  type PoolRole,
  type FriendshipStatus,
} from "@/db/schema";

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
    defaultSplitPercentage: number;
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
  description: string | null;
  notes: string | null;
  category: string;
  isSettled: boolean;
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
  lineItems: Array<{
    id: string;
    expenseId: string;
    debtorUserId: string;
    amount: number;
    isSettled: boolean;
    debtor: {
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

export type MemberBalance = {
  userId: string;
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
  balance: number; // Positive = owed money, Negative = owes money
};

export type SimplifiedDebt = {
  fromUserId: string;
  fromUser: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  toUserId: string;
  toUser: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  amount: number;
};

// Category display info
export const categoryInfo: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  food_dining: { label: "Food & Dining", icon: "utensils", color: "#f97316" },
  groceries: { label: "Groceries", icon: "shopping-cart", color: "#22c55e" },
  transportation: { label: "Transportation", icon: "car", color: "#3b82f6" },
  housing_rent: { label: "Housing/Rent", icon: "home", color: "#8b5cf6" },
  utilities: { label: "Utilities", icon: "zap", color: "#eab308" },
  healthcare: { label: "Healthcare", icon: "heart-pulse", color: "#ef4444" },
  entertainment: { label: "Entertainment", icon: "film", color: "#ec4899" },
  shopping: { label: "Shopping", icon: "shopping-bag", color: "#14b8a6" },
  education: { label: "Education", icon: "graduation-cap", color: "#6366f1" },
  travel: { label: "Travel", icon: "plane", color: "#0ea5e9" },
  personal_care: { label: "Personal Care", icon: "user", color: "#f472b6" },
  fitness: { label: "Fitness", icon: "dumbbell", color: "#84cc16" },
  subscriptions: { label: "Subscriptions", icon: "repeat", color: "#a855f7" },
  bills_payments: {
    label: "Bills & Payments",
    icon: "receipt",
    color: "#f59e0b",
  },
  business_expenses: { label: "Business", icon: "briefcase", color: "#64748b" },
  investments: { label: "Investments", icon: "trending-up", color: "#10b981" },
  insurance: { label: "Insurance", icon: "shield", color: "#06b6d4" },
  gifts: { label: "Gifts", icon: "gift", color: "#f43f5e" },
  charity: { label: "Charity", icon: "heart", color: "#fb7185" },
  miscellaneous: {
    label: "Miscellaneous",
    icon: "more-horizontal",
    color: "#9ca3af",
  },
  home_household_supplies: {
    label: "Home & Supplies",
    icon: "package",
    color: "#78716c",
  },
  pets: { label: "Pets", icon: "paw-print", color: "#a3e635" },
  taxes: { label: "Taxes", icon: "percent", color: "#dc2626" },
  childcare: { label: "Childcare", icon: "baby", color: "#f9a8d4" },
  professional_services: {
    label: "Professional Services",
    icon: "briefcase",
    color: "#4b5563",
  },
};
