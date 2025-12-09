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
} from "@/client/tanstack-db";
import {
  ArrowLeft,
  Plus,
  DollarSign,
  Users,
  Settings,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Pencil,
  Trash2,
  UserPlus,
  CheckCircle,
  Filter,
  X,
} from "lucide-react";
import { categoryInfo, expenseCategories, type ExpenseCategory } from "@/types";
import {
  getPoolBalances,
  settleUpPool,
  addMemberToPool,
  getPool,
  fixMissingLineItems,
} from "@/serverFunctions/pools";
import { updateExpense, deleteExpense } from "@/serverFunctions/expenses";
import type { PoolBalanceResult } from "@/services/BalanceService";

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
  splitMethod: string;
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
  };
};

function PoolDetail() {
  const { poolId } = Route.useParams();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Modal states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">(
    "all",
  );
  const [showSettled, setShowSettled] = useState(true);

  // Other states
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(
    null,
  );
  const [balances, setBalances] = useState<PoolBalanceResult | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [poolMembers, setPoolMembers] = useState<PoolMembership[]>([]);
  const [isSettling, setIsSettling] = useState(false);
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

  // Filter expenses based on filters
  const expenses = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter((expense) => {
      if (categoryFilter !== "all" && expense.category !== categoryFilter) {
        return false;
      }
      if (!showSettled && expense.isSettled) {
        return false;
      }
      return true;
    });
  }, [allExpenses, categoryFilter, showSettled]);

  // Fetch balances and pool details when pool changes or expenses change
  useEffect(() => {
    const fetchData = async () => {
      setBalancesLoading(true);
      try {
        // First, fix any missing line items for existing expenses
        await fixMissingLineItems({ data: { poolId } });

        const [balanceResult, poolResult] = await Promise.all([
          getPoolBalances({ data: { poolId } }),
          getPool({ data: { poolId } }),
        ]);
        setBalances(balanceResult.balances);
        setPoolMembers(poolResult.pool.memberships as PoolMembership[]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setBalancesLoading(false);
      }
    };
    fetchData();
  }, [poolId, allExpenses?.length]);

  // Get friends not already in pool
  const availableFriends = useMemo(() => {
    if (!friends || !poolMembers) return [];
    const memberIds = new Set(poolMembers.map((m) => m.userId));
    return friends.filter(
      (f) =>
        f.friendship.status === "accepted" &&
        !memberIds.has(f.friendship.friendUserId),
    );
  }, [friends, poolMembers]);

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
        splitMethod: "default",
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

  const handleSettleUp = async () => {
    setIsSettling(true);
    try {
      await settleUpPool({ data: { poolId } });
      // Refresh balances
      const result = await getPoolBalances({ data: { poolId } });
      setBalances(result.balances);
      setShowSettleUp(false);
    } catch (error) {
      console.error("Failed to settle up:", error);
    } finally {
      setIsSettling(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedFriendId) return;
    setIsAddingMember(true);
    try {
      await addMemberToPool({ data: { poolId, friendId: selectedFriendId } });
      // Refresh pool members
      const poolResult = await getPool({ data: { poolId } });
      setPoolMembers(poolResult.pool.memberships as PoolMembership[]);
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

  const toggleExpenseDetails = (expenseId: string) => {
    setExpandedExpenseId(expandedExpenseId === expenseId ? null : expenseId);
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

        {/* Stats */}
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
          <div className="stat">
            <div className="stat-figure text-primary">
              <DollarSign className="h-8 w-8" />
            </div>
            <div className="stat-title">Total Expenses</div>
            <div className="stat-value text-primary">
              ${totalExpenses.toFixed(2)}
            </div>
            <div className="stat-desc">{expenseCount} expenses</div>
          </div>
          <div className="stat">
            <div className="stat-figure text-secondary">
              <Users className="h-8 w-8" />
            </div>
            <div className="stat-title">Members</div>
            <div className="stat-value text-secondary">
              {poolMembers.length}
            </div>
            <div className="stat-desc">{unsettledCount} unsettled</div>
          </div>
        </div>

        {/* Balances Section */}
        {balancesLoading ? (
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
                  onClick={() => setShowSettleUp(true)}
                  className="btn btn-primary btn-sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  Settle Up
                </button>
              </div>

              {/* Member Balances */}
              <div className="space-y-2 mt-2">
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
              {balances.simplifiedDebts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-base-content/70 mb-2">
                    To settle up:
                  </h4>
                  <div className="space-y-2">
                    {balances.simplifiedDebts.map((debt, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm bg-base-200 rounded-lg p-3"
                      >
                        <span className="font-medium">
                          {getUserDisplayName(debt.fromUser)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-base-content/40" />
                        <span className="font-medium">
                          {getUserDisplayName(debt.toUser)}
                        </span>
                        <span className="ml-auto font-bold">
                          ${debt.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : balances && balances.totalUnsettled === 0 ? (
          <div className="alert alert-success mb-6">
            <CheckCircle className="h-5 w-5" />
            <span>All settled up!</span>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowAddExpense(true)}
            className="btn btn-primary flex-1"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
          <button
            onClick={() => setShowAddMember(true)}
            className="btn btn-outline"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-sm btn-outline gap-2"
            >
              <Filter className="h-4 w-4" />
              {categoryFilter === "all"
                ? "All Categories"
                : categoryInfo[categoryFilter].label}
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow max-h-60 overflow-auto"
            >
              <li>
                <button onClick={() => setCategoryFilter("all")}>
                  All Categories
                </button>
              </li>
              <div className="divider my-1"></div>
              {expenseCategories.map((cat) => (
                <li key={cat}>
                  <button onClick={() => setCategoryFilter(cat)}>
                    {categoryInfo[cat].label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <label className="label cursor-pointer gap-2">
            <input
              type="checkbox"
              checked={showSettled}
              onChange={(e) => setShowSettled(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="label-text">Show settled</span>
          </label>

          {(categoryFilter !== "all" || !showSettled) && (
            <button
              onClick={() => {
                setCategoryFilter("all");
                setShowSettled(true);
              }}
              className="btn btn-sm btn-ghost text-error"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>

        {/* Expenses List */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold mb-3">
            Expenses ({expenses.length})
          </h2>
          {expenses && expenses.length > 0 ? (
            expenses.map((expense) => {
              const catInfo = categoryInfo[expense.category];
              const isExpanded = expandedExpenseId === expense.id;

              return (
                <div
                  key={expense.id}
                  className={`card bg-base-100 shadow-sm ${expense.isSettled ? "opacity-60" : ""}`}
                >
                  <div
                    onClick={() => toggleExpenseDetails(expense.id)}
                    className="card-body p-4 cursor-pointer hover:bg-base-200/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Category Icon */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${catInfo.color}20` }}
                      >
                        <span
                          className="text-lg"
                          style={{ color: catInfo.color }}
                        >
                          $
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{expense.name}</p>
                        <p className="text-sm text-base-content/60">
                          {catInfo.label}
                        </p>
                      </div>

                      {/* Amount & Chevron */}
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-semibold">
                            ${expense.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-base-content/40">
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-base-content/40" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-base-content/40" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-base-200">
                        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                          <div>
                            <span className="text-base-content/60">
                              Split method:
                            </span>
                            <span className="ml-2 capitalize">
                              {expense.splitMethod}
                            </span>
                          </div>
                          <div>
                            <span className="text-base-content/60">
                              Status:
                            </span>
                            <span
                              className={`ml-2 badge badge-sm ${expense.isSettled ? "badge-success" : "badge-warning"}`}
                            >
                              {expense.isSettled ? "Settled" : "Unsettled"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(expense as Expense);
                            }}
                            className="btn btn-sm btn-outline flex-1"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExpense(expense.id);
                            }}
                            className="btn btn-sm btn-error btn-outline"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-base-content/60">
              <p>No expenses match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <dialog
        className={`modal ${showAddExpense ? "modal-open" : ""}`}
        onClick={() => setShowAddExpense(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Add New Expense</h3>
          <form onSubmit={handleAddExpense} className="mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Expense Name</span>
              </label>
              <input
                type="text"
                value={newExpense.name}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, name: e.target.value })
                }
                placeholder="e.g., Groceries, Dinner, Utilities"
                className="input input-bordered"
                autoFocus
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Amount</span>
              </label>
              <label className="input input-bordered flex items-center gap-2">
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
                  className="grow"
                />
              </label>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Category</span>
              </label>
              <select
                value={newExpense.category}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    category: e.target.value as ExpenseCategory,
                  })
                }
                className="select select-bordered"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryInfo[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="btn"
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
          <h3 className="font-bold text-lg">Edit Expense</h3>
          <form onSubmit={handleEditExpense} className="mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Expense Name</span>
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="e.g., Groceries, Dinner, Utilities"
                className="input input-bordered"
                autoFocus
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Amount</span>
              </label>
              <label className="input input-bordered flex items-center gap-2">
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
                  className="grow"
                />
              </label>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Category</span>
              </label>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    category: e.target.value as ExpenseCategory,
                  })
                }
                className="select select-bordered"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryInfo[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowEditExpense(false)}
                className="btn"
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

      {/* Settle Up Modal */}
      <dialog
        className={`modal ${showSettleUp ? "modal-open" : ""}`}
        onClick={() => setShowSettleUp(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Settle Up Pool</h3>
          <p className="py-4">
            This will mark all expenses in this pool as settled. Are you sure
            everyone has paid their share?
          </p>

          {balances && balances.simplifiedDebts.length > 0 && (
            <div className="bg-base-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium mb-2">Payments to be made:</h4>
              <div className="space-y-2">
                {balances.simplifiedDebts.map((debt, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span>{getUserDisplayName(debt.fromUser)}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{getUserDisplayName(debt.toUser)}</span>
                    <span className="ml-auto font-bold">
                      ${debt.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-action">
            <button
              onClick={() => setShowSettleUp(false)}
              className="btn"
              disabled={isSettling}
            >
              Cancel
            </button>
            <button
              onClick={handleSettleUp}
              className="btn btn-primary"
              disabled={isSettling}
            >
              {isSettling ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Settle Up
                </>
              )}
            </button>
          </div>
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
                    <option
                      key={friend.id}
                      value={friend.friendship.friendUserId}
                    >
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

      {/* Pool Settings Modal */}
      <dialog
        className={`modal ${showSettings ? "modal-open" : ""}`}
        onClick={() => setShowSettings(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Pool Settings</h3>

          <div className="py-4">
            <h4 className="font-medium mb-3">Members ({poolMembers.length})</h4>
            <div className="space-y-2">
              {poolMembers.map((member) => (
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
