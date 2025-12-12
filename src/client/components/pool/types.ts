import type { ExpenseCategory } from "@/types";

// Types shared across pool components
export type Expense = {
  id: string;
  poolId: string;
  paidByUserId: string;
  name: string;
  amount: number;
  description: string | null;
  notes: string | null;
  category: ExpenseCategory;
  isSettled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PoolMember = {
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

export type Settlement = {
  id: string;
  poolId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string | null;
  createdAt: string;
  createdByUserId: string;
};

export type SelectedDebt = {
  toUserId: string;
  toUserName: string;
  toUserVenmo: string | null;
  maxAmount: number;
  paymentAmount: string;
};
