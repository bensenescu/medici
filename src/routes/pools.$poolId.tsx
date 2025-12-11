import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/client/hooks/use-mobile";
import { TabBar } from "@/client/components/TabBar";
import {
  poolsCollection,
  expensesCollection,
  friendsCollection,
  rulesCollection,
  poolMembersCollection,
  settlementsCollection,
} from "@/client/tanstack-db";
import {
  ArrowLeft,
  Plus,
  Settings,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Pencil,
  Trash2,
  UserPlus,
  CheckCircle,
  MoreVertical,
  DollarSign,
  History,
} from "lucide-react";
import { categoryInfo, expenseCategories, type ExpenseCategory } from "@/types";
import { addMemberToPool } from "@/serverFunctions/pools";
import { getCurrentUser } from "@/serverFunctions/poolMembers";
import { updateExpense, deleteExpense } from "@/serverFunctions/expenses";
import {
  createSettlement,
  deleteSettlement,
} from "@/serverFunctions/settlements";
import {
  BalanceService,
  type PoolBalanceResult,
} from "@/services/BalanceService";

export const Route = createFileRoute("/pools/$poolId")({
  component: PoolDetail,
});

// Types for expense from collection
type Expense = {
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

type PoolMembership = {
  id: string;
  poolId: string;
  userId: string;
  role: string;
  defaultSplitPercentage: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    venmoHandle?: string | null;
  };
};

function PoolDetail() {
  const { poolId } = Route.useParams();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Modal states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  // Settlement states
  const [selectedDebts, setSelectedDebts] = useState<
    Array<{
      toUserId: string;
      toUserName: string;
      toUserVenmo: string | null;
      maxAmount: number;
      paymentAmount: string;
    }>
  >([]);
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form states
  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    category: "miscellaneous" as ExpenseCategory,
  });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    amount: "",
    category: "miscellaneous" as ExpenseCategory,
  });

  // Other states
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState("");

  // Live query for all pools, then filter
  const { data: allPools } = useLiveQuery((q) =>
    q.from({ pool: poolsCollection }),
  );
  const pool = useMemo(
    () => allPools?.find((p) => p.id === poolId),
    [allPools, poolId],
  );

  // Live query for expenses filtered by poolId and sorted by createdAt desc
  const { data: allExpenses } = useLiveQuery(
    (q) =>
      q
        .from({ expense: expensesCollection })
        .where(({ expense }) => eq(expense.poolId, poolId))
        .orderBy(({ expense }) => expense.createdAt, "desc"),
    [poolId],
  );

  // Live query for friends (to add to pool)
  const { data: friends } = useLiveQuery((q) =>
    q.from({ friend: friendsCollection }),
  );

  // Live query for rules (for auto-categorization)
  const { data: rules } = useLiveQuery((q) =>
    q.from({ rule: rulesCollection }),
  );

  // Live query for pool members filtered by poolId (for balance calculation and display)
  const { data: poolMembers } = useLiveQuery(
    (q) =>
      q
        .from({ member: poolMembersCollection })
        .where(({ member }) => eq(member.poolId, poolId)),
    [poolId],
  );

  // Live query for settlements filtered by poolId
  const { data: poolSettlements } = useLiveQuery(
    (q) =>
      q
        .from({ settlement: settlementsCollection })
        .where(({ settlement }) => eq(settlement.poolId, poolId)),
    [poolId],
  );

  // Use all expenses directly
  const expenses = allExpenses ?? [];

  // Compute balances client-side using equal splits + settlements (no line items needed!)
  const balances = useMemo((): PoolBalanceResult | null => {
    if (!allExpenses || !poolMembers?.length) {
      return null;
    }

    // Build users map for display names
    const usersMap = new Map(
      poolMembers.map((m) => [
        m.userId,
        {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          venmoHandle: m.user.venmoHandle ?? null,
        },
      ]),
    );

    // Compute balances using equal splits + settlements
    const memberUserIds = poolMembers.map((m) => m.userId);
    return BalanceService.computePoolBalances(
      allExpenses,
      poolSettlements ?? [],
      memberUserIds,
      usersMap,
    );
  }, [allExpenses, poolSettlements, poolMembers]);

  // Get friends not already in pool
  const availableFriends = useMemo(() => {
    if (!friends || !poolMembers?.length) return [];
    const memberIds = new Set(poolMembers.map((m) => m.userId));
    return friends.filter((f) => !memberIds.has(f.user.id));
  }, [friends, poolMembers]);

  // Fetch current user ID on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userResult = await getCurrentUser();
        setCurrentUserId(userResult.userId);
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Apply auto-categorization rules when expense name changes
  useEffect(() => {
    if (!newExpense.name.trim() || !rules || rules.length === 0) return;

    const expenseNameLower = newExpense.name.toLowerCase();
    for (const rule of rules) {
      if (expenseNameLower.includes(rule.rule.toLowerCase())) {
        setNewExpense((prev) => ({ ...prev, category: rule.category }));
        break;
      }
    }
  }, [newExpense.name, rules]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (newExpense.name.trim() && newExpense.amount) {
      expensesCollection.insert({
        id: crypto.randomUUID(),
        poolId,
        paidByUserId: "user-1", // Current user (mock)
        name: newExpense.name.trim(),
        amount: parseFloat(newExpense.amount),
        description: null,
        notes: null,
        category: newExpense.category,
        isSettled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewExpense({ name: "", amount: "", category: "miscellaneous" });
      setShowAddExpense(false);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editForm.name.trim() || !editForm.amount) return;

    try {
      await updateExpense({
        data: {
          id: editingExpense.id,
          name: editForm.name.trim(),
          amount: parseFloat(editForm.amount),
          category: editForm.category,
        },
      });

      // Update local collection
      expensesCollection.update(editingExpense.id, (draft) => {
        draft.name = editForm.name.trim();
        draft.amount = parseFloat(editForm.amount);
        draft.category = editForm.category;
        draft.updatedAt = new Date().toISOString();
      });

      setShowEditExpense(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("Failed to update expense:", error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense({ data: { id: expenseId } });
      expensesCollection.delete([expenseId]);
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedFriendId) return;
    setIsAddingMember(true);
    try {
      await addMemberToPool({ data: { poolId, friendId: selectedFriendId } });
      // Refetch pool members collection
      await poolMembersCollection.utils.refetch();
      setShowAddMember(false);
      setSelectedFriendId("");
    } catch (error) {
      console.error("Failed to add member:", error);
    } finally {
      setIsAddingMember(false);
    }
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setEditForm({
      name: expense.name,
      amount: expense.amount.toString(),
      category: expense.category,
    });
    setShowEditExpense(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDebts.length === 0) return;

    // Validate all amounts
    const paymentsToSubmit = selectedDebts
      .map((debt) => ({
        toUserId: debt.toUserId,
        amount: parseFloat(debt.paymentAmount),
        maxAmount: debt.maxAmount,
        toUserName: debt.toUserName,
      }))
      .filter((p) => !isNaN(p.amount) && p.amount > 0);

    if (paymentsToSubmit.length === 0) {
      setPaymentError("Please enter at least one valid amount");
      return;
    }

    // Check for amounts exceeding max
    const invalidPayment = paymentsToSubmit.find(
      (p) => p.amount > p.maxAmount + 0.01,
    );
    if (invalidPayment) {
      setPaymentError(
        `Amount for ${invalidPayment.toUserName} cannot exceed $${invalidPayment.maxAmount.toFixed(2)}`,
      );
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);

    try {
      // Submit all payments
      for (const payment of paymentsToSubmit) {
        await createSettlement({
          data: {
            poolId,
            toUserId: payment.toUserId,
            amount: payment.amount,
            note: paymentNote || undefined,
          },
        });
      }

      // Refetch settlements collection
      await settlementsCollection.utils.refetch();

      // Close modal and reset state
      setShowRecordPayment(false);
      setSelectedDebts([]);
      setPaymentNote("");
    } catch (error) {
      console.error("Failed to record payment:", error);
      if (error instanceof Error) {
        setPaymentError(error.message);
      } else {
        setPaymentError("Failed to record payment. Please try again.");
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    try {
      await deleteSettlement({ data: { settlementId } });
      await settlementsCollection.utils.refetch();
    } catch (error) {
      console.error("Failed to delete settlement:", error);
    }
  };

  // Calculate totals
  const totalExpenses = allExpenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const expenseCount = allExpenses?.length ?? 0;
  const unsettledCount = allExpenses?.filter((e) => !e.isSettled).length ?? 0;

  // Helper to display user name
  const getUserDisplayName = (user?: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }) => {
    if (!user) return "Unknown";
    if (user.firstName || user.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    return user.email.split("@")[0];
  };

  if (!pool) {
    return (
      <div className="p-4">
        <Link to="/" className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Pools
        </Link>
        <div className="text-center py-12">
          <p className="text-base-content/60">Pool not found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pb-20 md:pt-4 md:pb-0 overflow-auto">
        {/* Header */}
        <div className="mb-4">
          <Link to="/" className="btn btn-ghost btn-sm gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Pools
          </Link>
          <div className="flex items-start justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold">{pool.name}</h1>
              {pool.description && (
                <p className="text-base-content/60 mt-1">{pool.description}</p>
              )}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-ghost btn-square btn-sm"
              title="Pool settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Balances Section */}
        {!balances ? (
          <div className="card bg-base-100 shadow mb-6">
            <div className="card-body">
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            </div>
          </div>
        ) : balances &&
          (balances.memberBalances.some((b) => Math.abs(b.balance) > 0.01) ||
            balances.simplifiedDebts.length > 0) ? (
          <div className="card bg-base-100 shadow mb-6">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h3 className="card-title text-lg">Balances</h3>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="btn btn-ghost btn-sm btn-square"
                  title="Add member"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>

              {/* Compact Stats Summary */}
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <span className="font-medium text-primary">
                  ${totalExpenses.toFixed(2)}
                </span>
                <span>total</span>
                <span className="text-base-content/30">·</span>
                <span>{poolMembers?.length ?? 0} members</span>
                <span className="text-base-content/30">·</span>
                <span>{unsettledCount} unsettled</span>
              </div>

              {/* Member Balances */}
              <div className="space-y-2 mt-4">
                {balances.memberBalances
                  .filter((b) => Math.abs(b.balance) > 0.01)
                  .map((balance) => (
                    <div
                      key={balance.userId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {balance.balance > 0 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-error" />
                        )}
                        <span className="text-sm">
                          {getUserDisplayName(balance.user)}
                        </span>
                      </div>
                      <span
                        className={`font-medium ${balance.balance > 0 ? "text-success" : "text-error"}`}
                      >
                        {balance.balance > 0 ? "+" : ""}$
                        {balance.balance.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Simplified Debts */}
              {balances.simplifiedDebts.length > 0 &&
                (() => {
                  const yourDebts = balances.simplifiedDebts.filter(
                    (debt) =>
                      currentUserId && debt.fromUserId === currentUserId,
                  );
                  const debtsOwedToYou = balances.simplifiedDebts.filter(
                    (debt) => currentUserId && debt.toUserId === currentUserId,
                  );
                  const otherDebts = balances.simplifiedDebts.filter(
                    (debt) =>
                      !currentUserId ||
                      (debt.fromUserId !== currentUserId &&
                        debt.toUserId !== currentUserId),
                  );

                  return (
                    <div className="mt-4 space-y-4">
                      {/* Your Settlements */}
                      {(yourDebts.length > 0 || debtsOwedToYou.length > 0) && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-base-content/70">
                              Your settlements
                            </h4>
                            {yourDebts.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedDebts(
                                    yourDebts.map((debt) => ({
                                      toUserId: debt.toUserId,
                                      toUserName: getUserDisplayName(
                                        debt.toUser,
                                      ),
                                      toUserVenmo:
                                        debt.toUser?.venmoHandle ?? null,
                                      maxAmount: debt.amount,
                                      paymentAmount: debt.amount.toFixed(2),
                                    })),
                                  );
                                  setPaymentNote("");
                                  setPaymentError(null);
                                  setShowRecordPayment(true);
                                }}
                                className="btn btn-primary btn-xs"
                              >
                                <DollarSign className="h-3 w-3" />
                                Pay
                              </button>
                            )}
                          </div>
                          <div className="divide-y divide-base-300">
                            {yourDebts.map((debt, index) => (
                              <div
                                key={`owe-${index}`}
                                className="flex items-center gap-2 text-sm py-3"
                              >
                                <span className="font-medium">You</span>
                                <ArrowRight className="hidden md:block h-4 w-4 text-base-content/40" />
                                <span className="hidden md:block font-medium flex-1">
                                  {getUserDisplayName(debt.toUser)}
                                </span>
                                <span className="flex-1 md:hidden" />
                                <span className="font-bold tabular-nums">
                                  ${debt.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            {debtsOwedToYou.map((debt, index) => (
                              <div
                                key={`owed-${index}`}
                                className="flex items-center gap-2 text-sm py-3"
                              >
                                <span className="font-medium">
                                  {getUserDisplayName(debt.fromUser)}
                                </span>
                                <ArrowRight className="hidden md:block h-4 w-4 text-base-content/40" />
                                <span className="hidden md:block font-medium">
                                  You
                                </span>
                                <span className="flex-1" />
                                <span className="font-bold tabular-nums text-success">
                                  ${debt.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Settlements */}
                      {otherDebts.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-base-content/70 mb-2">
                            Other settlements
                          </h4>
                          <div className="divide-y divide-base-300">
                            {otherDebts.map((debt, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm py-3"
                              >
                                <span className="font-medium">
                                  {getUserDisplayName(debt.fromUser)}
                                </span>
                                <ArrowRight className="h-4 w-4 text-base-content/40" />
                                <span className="font-medium flex-1">
                                  {getUserDisplayName(debt.toUser)}
                                </span>
                                <span className="font-bold tabular-nums">
                                  ${debt.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </div>
          </div>
        ) : balances && balances.simplifiedDebts.length === 0 ? (
          <div className="card bg-base-100 shadow mb-6">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h3 className="card-title text-lg">Balances</h3>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="btn btn-ghost btn-sm btn-square"
                  title="Add member"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>

              {/* Compact Stats Summary */}
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <span className="font-medium text-primary">
                  ${totalExpenses.toFixed(2)}
                </span>
                <span>total</span>
                <span className="text-base-content/30">·</span>
                <span>{poolMembers?.length ?? 0} members</span>
              </div>

              <div className="alert alert-success mt-4">
                <CheckCircle className="h-5 w-5" />
                <span>All settled up!</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Settlement History */}
        {poolSettlements && poolSettlements.length > 0 && (
          <div className="card bg-base-100 shadow mb-6">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h3 className="card-title text-lg">
                  <History className="h-5 w-5" />
                  Recent Payments ({poolSettlements.length})
                </h3>
              </div>
              <div className="divide-y divide-base-300 mt-2">
                {poolSettlements.map((settlement) => {
                  const fromMember = poolMembers?.find(
                    (m) => m.userId === settlement.fromUserId,
                  );
                  const toMember = poolMembers?.find(
                    (m) => m.userId === settlement.toUserId,
                  );
                  const canDelete =
                    currentUserId &&
                    (settlement.createdByUserId === currentUserId ||
                      poolMembers?.find(
                        (m) => m.userId === currentUserId && m.role === "ADMIN",
                      ));

                  return (
                    <div
                      key={settlement.id}
                      className="flex items-center gap-2 text-sm py-3 min-w-0"
                    >
                      <DollarSign className="h-4 w-4 text-success flex-shrink-0" />
                      <span className="font-medium truncate">
                        {getUserDisplayName(fromMember?.user)}
                      </span>
                      <ArrowRight className="hidden md:block h-4 w-4 text-base-content/40 flex-shrink-0" />
                      <span className="hidden md:block font-medium truncate">
                        {getUserDisplayName(toMember?.user)}
                      </span>
                      <span className="ml-auto font-bold text-success flex-shrink-0">
                        ${settlement.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-base-content/40 flex-shrink-0">
                        <span className="hidden md:inline">
                          {new Date(settlement.createdAt).toLocaleDateString()}
                        </span>
                        <span className="md:hidden">
                          {new Date(settlement.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "numeric", day: "numeric" },
                          )}
                        </span>
                      </span>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteSettlement(settlement.id)}
                          className="btn btn-ghost btn-xs btn-square text-error flex-shrink-0"
                          title="Delete settlement"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="card bg-base-100 shadow mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h3 className="card-title text-lg">
                Expenses ({expenses.length})
              </h3>
              <button
                onClick={() => setShowAddExpense(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </button>
            </div>
            {expenses && expenses.length > 0 ? (
              <div className="divide-y divide-base-300 mt-2">
                {expenses.map((expense) => {
                  const catInfo = categoryInfo[expense.category];

                  return (
                    <div
                      key={expense.id}
                      className={expense.isSettled ? "opacity-60" : ""}
                    >
                      <div className="py-4">
                        <div className="flex items-center gap-3">
                          {/* Category Icon with Status Dot */}
                          <div
                            className="relative tooltip"
                            data-tip={
                              expense.isSettled ? "Settled" : "Unsettled"
                            }
                          >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                              <span className="text-lg text-primary">$</span>
                            </div>
                            <div
                              className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-base-100 ${
                                expense.isSettled ? "bg-success" : "bg-warning"
                              }`}
                            ></div>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {expense.name}
                            </p>
                            <p className="text-sm text-base-content/60">
                              {catInfo.label}
                            </p>
                          </div>

                          {/* Amount */}
                          <div className="text-right">
                            <p className="font-semibold">
                              ${expense.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-base-content/40">
                              {new Date(expense.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Actions Menu */}
                          <div className="dropdown dropdown-end">
                            <button
                              tabIndex={0}
                              className="btn btn-ghost btn-sm btn-square"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            <ul
                              tabIndex={0}
                              className="dropdown-content menu bg-base-200 rounded-lg border border-base-300 z-10 w-40 p-2 gap-1"
                            >
                              <li>
                                <button
                                  onClick={() =>
                                    openEditModal(expense as Expense)
                                  }
                                  className="flex items-center gap-2 rounded-md"
                                >
                                  <Pencil className="h-4 w-4" /> Edit
                                </button>
                              </li>
                              <li className="border-t border-base-300 pt-1 mt-1">
                                <button
                                  className="flex items-center gap-2 rounded-md text-error hover:bg-error/10"
                                  onClick={() =>
                                    handleDeleteExpense(expense.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" /> Delete
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/60">
                <p>No expenses yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <dialog
        className={`modal ${showAddExpense ? "modal-open" : ""}`}
        onClick={() => setShowAddExpense(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg mb-6">Add New Expense</h3>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Expense Name</span>
              </label>
              <input
                type="text"
                value={newExpense.name}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, name: e.target.value })
                }
                placeholder="e.g., Groceries, Dinner, Utilities"
                className="input input-bordered w-full"
                autoFocus
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Amount</span>
              </label>
              <label className="input input-bordered w-full flex items-center gap-2">
                <span className="text-base-content/60">$</span>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="grow bg-transparent outline-none"
                />
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Category</span>
              </label>
              <select
                value={newExpense.category}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    category: e.target.value as ExpenseCategory,
                  })
                }
                className="select select-bordered w-full"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryInfo[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-action pt-2">
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newExpense.name.trim() || !newExpense.amount}
                className="btn btn-primary"
              >
                Add Expense
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Edit Expense Modal */}
      <dialog
        className={`modal ${showEditExpense ? "modal-open" : ""}`}
        onClick={() => setShowEditExpense(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg mb-6">Edit Expense</h3>
          <form onSubmit={handleEditExpense} className="space-y-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Expense Name</span>
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="e.g., Groceries, Dinner, Utilities"
                className="input input-bordered w-full"
                autoFocus
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Amount</span>
              </label>
              <label className="input input-bordered w-full flex items-center gap-2">
                <span className="text-base-content/60">$</span>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) =>
                    setEditForm({ ...editForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="grow bg-transparent outline-none"
                />
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Category</span>
              </label>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    category: e.target.value as ExpenseCategory,
                  })
                }
                className="select select-bordered w-full"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryInfo[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-action pt-2">
              <button
                type="button"
                onClick={() => setShowEditExpense(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editForm.name.trim() || !editForm.amount}
                className="btn btn-primary"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Add Member Modal */}
      <dialog
        className={`modal ${showAddMember ? "modal-open" : ""}`}
        onClick={() => setShowAddMember(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Add Member to Pool</h3>

          {availableFriends.length > 0 ? (
            <>
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text">Select a friend</span>
                </label>
                <select
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value)}
                  className="select select-bordered"
                >
                  <option value="">Choose a friend...</option>
                  {availableFriends.map((friend) => (
                    <option key={friend.id} value={friend.user.id}>
                      {friend.user?.firstName || friend.user?.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-action">
                <button
                  onClick={() => setShowAddMember(false)}
                  className="btn"
                  disabled={isAddingMember}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  className="btn btn-primary"
                  disabled={!selectedFriendId || isAddingMember}
                >
                  {isAddingMember ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-base-content/60 mb-4">
                No friends available to add. All your friends are already in
                this pool, or you need to add friends first.
              </p>
              <Link to="/friends" className="btn btn-outline">
                <UserPlus className="h-4 w-4" />
                Go to Friends
              </Link>
            </div>
          )}
        </div>
      </dialog>

      {/* Record Payment Modal */}
      <dialog
        className={`modal ${showRecordPayment ? "modal-open" : ""}`}
        onClick={() => setShowRecordPayment(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg mb-4">
            Record Payment{selectedDebts.length > 1 ? "s" : ""}
          </h3>

          {selectedDebts.length > 0 && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              {/* Amount Inputs for each debt */}
              {selectedDebts.map((debt, index) => (
                <div key={debt.toUserId} className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">
                      Amount to {debt.toUserName}
                    </span>
                    <span className="label-text-alt text-base-content/60">
                      Max: ${debt.maxAmount.toFixed(2)}
                    </span>
                  </label>
                  <label className="input input-bordered w-full flex items-center gap-2">
                    <span className="text-base-content/60">$</span>
                    <input
                      type="number"
                      value={debt.paymentAmount}
                      onChange={(e) => {
                        const newDebts = [...selectedDebts];
                        newDebts[index] = {
                          ...newDebts[index],
                          paymentAmount: e.target.value,
                        };
                        setSelectedDebts(newDebts);
                        setPaymentError(null);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={debt.maxAmount}
                      className="grow bg-transparent outline-none"
                    />
                  </label>
                  {/* Venmo hint for this user */}
                  {debt.toUserVenmo && (
                    <p className="text-xs text-base-content/60 mt-1">
                      Venmo:{" "}
                      <a
                        href={`https://venmo.com/${debt.toUserVenmo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        @{debt.toUserVenmo}
                      </a>
                    </p>
                  )}
                </div>
              ))}

              {/* Total */}
              {selectedDebts.length > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-base-300">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">
                    $
                    {selectedDebts
                      .reduce(
                        (sum, d) => sum + (parseFloat(d.paymentAmount) || 0),
                        0,
                      )
                      .toFixed(2)}
                  </span>
                </div>
              )}

              {/* Note Input */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">
                    Note (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g., Venmo payment"
                  className="input input-bordered w-full"
                />
              </div>

              {/* Error Message */}
              {paymentError && (
                <div className="alert alert-error">
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="modal-action pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordPayment(false)}
                  className="btn btn-ghost"
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !selectedDebts.some(
                      (d) => parseFloat(d.paymentAmount) > 0,
                    ) || isSubmittingPayment
                  }
                  className="btn btn-primary"
                >
                  {isSubmittingPayment ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      Record Payment{selectedDebts.length > 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>

      {/* Pool Settings Modal */}
      <dialog
        className={`modal ${showSettings ? "modal-open" : ""}`}
        onClick={() => setShowSettings(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Pool Settings</h3>

          <div className="py-4">
            <h4 className="font-medium mb-3">
              Members ({poolMembers?.length ?? 0})
            </h4>
            <div className="space-y-2">
              {poolMembers?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-base-200 rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">
                      {getUserDisplayName(member.user)}
                    </p>
                    <p className="text-sm text-base-content/60">
                      {member.user.email}
                    </p>
                  </div>
                  <span
                    className={`badge ${member.role === "ADMIN" ? "badge-primary" : "badge-ghost"}`}
                  >
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-action">
            <button onClick={() => setShowSettings(false)} className="btn">
              Close
            </button>
          </div>
        </div>
      </dialog>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0">
          <TabBar currentPath={location.pathname} />
        </div>
      )}
    </>
  );
}
