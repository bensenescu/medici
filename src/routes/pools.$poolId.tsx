import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import { useMemo, useState } from "react";
import {
  poolsCollection,
  expensesCollection,
  friendsCollection,
  rulesCollection,
  poolMembersCollection,
  settlementsCollection,
} from "@/client/tanstack-db";
import { ArrowLeft } from "lucide-react";
import type { ExpenseCategory } from "@/types";
import { addMemberToPool } from "@/serverFunctions/pools";
import { useCurrentUser } from "@/embedded-sdk/client";

import { createSettlement } from "@/client/actions/createSettlement";
import {
  BalanceService,
  type PoolBalanceResult,
} from "@/server/services/BalanceService";
import { ExpenseList } from "@/client/components/pool/ExpenseList";
import { SettlementHistory } from "@/client/components/pool/SettlementHistory";
import { BalancesCard } from "@/client/components/pool/BalancesCard";
import { PoolHeader } from "@/client/components/pool/PoolHeader";
import { AddExpenseModal } from "@/client/components/pool/AddExpenseModal";
import { EditExpenseModal } from "@/client/components/pool/EditExpenseModal";
import { AddMemberModal } from "@/client/components/pool/AddMemberModal";
import { RecordPaymentModal } from "@/client/components/pool/RecordPaymentModal";
import { PoolSettingsModal } from "@/client/components/pool/PoolSettingsModal";
import type {
  Expense,
  SelectedDebt,
  PoolMember,
} from "@/client/components/pool/types";

export const Route = createFileRoute("/pools/$poolId")({
  component: PoolDetail,
});

function PoolDetail() {
  const { poolId } = Route.useParams();

  // Modal states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  // Edit expense state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Settlement state
  const [selectedDebts, setSelectedDebts] = useState<SelectedDebt[]>([]);

  // Get current user from session token (instant, no server call needed)
  const currentUser = useCurrentUser();
  const currentUserId = currentUser!.userId;

  // Live queries
  const { data: allPools } = useLiveQuery((q) =>
    q.from({ pool: poolsCollection }),
  );
  const pool = useMemo(
    () => allPools?.find((p) => p.id === poolId),
    [allPools, poolId],
  );

  const { data: allExpenses } = useLiveQuery(
    (q) =>
      q
        .from({ expense: expensesCollection })
        .where(({ expense }) => eq(expense.poolId, poolId))
        .orderBy(({ expense }) => expense.createdAt, "desc"),
    [poolId],
  );

  const { data: friends } = useLiveQuery((q) =>
    q.from({ friend: friendsCollection }),
  );

  const { data: rules } = useLiveQuery((q) =>
    q.from({ rule: rulesCollection }),
  );

  const { data: poolMembers } = useLiveQuery(
    (q) =>
      q
        .from({ member: poolMembersCollection })
        .where(({ member }) => eq(member.poolId, poolId)),
    [poolId],
  );

  const { data: poolSettlements } = useLiveQuery(
    (q) =>
      q
        .from({ settlement: settlementsCollection })
        .where(({ settlement }) => eq(settlement.poolId, poolId)),
    [poolId],
  );

  const expenses = allExpenses ?? [];

  // Compute balances client-side using equal splits + settlements
  const balances = useMemo((): PoolBalanceResult | null => {
    if (!allExpenses || !poolMembers?.length || poolSettlements === undefined) {
      return null;
    }

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

    const memberUserIds = poolMembers.map((m) => m.userId);
    return BalanceService.computePoolBalances(
      allExpenses,
      poolSettlements,
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

  // Event handlers
  const handleAddExpense = (expense: {
    name: string;
    amount: number;
    category: ExpenseCategory;
  }) => {
    expensesCollection.insert({
      id: crypto.randomUUID(),
      poolId,
      paidByUserId: currentUserId,
      name: expense.name,
      amount: expense.amount,
      description: null,
      notes: null,
      category: expense.category,
      isSettled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setShowAddExpense(false);
  };

  const handleEditExpense = (
    expenseId: string,
    updates: { name: string; amount: number; category: ExpenseCategory },
  ) => {
    expensesCollection.update(expenseId, (draft) => {
      draft.name = updates.name;
      draft.amount = updates.amount;
      draft.category = updates.category;
      draft.updatedAt = new Date().toISOString();
    });
    setShowEditExpense(false);
    setEditingExpense(null);
  };

  const handleDeleteExpense = (expenseId: string) => {
    expensesCollection.delete(expenseId);
  };

  const handleAddMember = async (friendId: string) => {
    await addMemberToPool({ data: { poolId, friendId } });
    await poolMembersCollection.utils.refetch();
    setShowAddMember(false);
  };

  const handleRemoveMember = (memberId: string) => {
    poolMembersCollection.delete(memberId);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setShowEditExpense(true);
  };

  const handleRecordPayment = (
    payments: Array<{ toUserId: string; amount: number }>,
    note: string,
  ) => {
    for (const payment of payments) {
      createSettlement({
        poolId,
        fromUserId: currentUserId,
        toUserId: payment.toUserId,
        amount: payment.amount,
        note: note || undefined,
      });
    }
    setShowRecordPayment(false);
    setSelectedDebts([]);
  };

  const handleDeleteSettlement = (settlementId: string) => {
    settlementsCollection.delete(settlementId);
  };

  const handleRecordPaymentFromBalances = (debts: SelectedDebt[]) => {
    setSelectedDebts(debts);
    setShowRecordPayment(true);
  };

  // Calculate totals
  const totalExpenses = allExpenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const unsettledCount = allExpenses?.filter((e) => !e.isSettled).length ?? 0;

  // Loading state
  if (!balances) {
    return null;
  }

  // Pool not found
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
        <PoolHeader
          poolName={pool.name}
          poolDescription={pool.description}
          onOpenSettings={() => setShowSettings(true)}
        />

        <BalancesCard
          balances={balances}
          totalExpenses={totalExpenses}
          memberCount={poolMembers?.length ?? 0}
          unsettledCount={unsettledCount}
          currentUserId={currentUserId}
          onAddMember={() => setShowAddMember(true)}
          onRecordPayment={handleRecordPaymentFromBalances}
        />

        <SettlementHistory
          settlements={poolSettlements ?? []}
          poolMembers={poolMembers}
          currentUserId={currentUserId}
          onDeleteSettlement={handleDeleteSettlement}
        />

        <ExpenseList
          expenses={expenses as Expense[]}
          onAddExpense={() => setShowAddExpense(true)}
          onEditExpense={openEditModal}
          onDeleteExpense={handleDeleteExpense}
        />
      </div>

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSubmit={handleAddExpense}
        rules={rules}
      />

      <EditExpenseModal
        isOpen={showEditExpense}
        expense={editingExpense}
        onClose={() => {
          setShowEditExpense(false);
          setEditingExpense(null);
        }}
        onSubmit={handleEditExpense}
      />

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        onSubmit={handleAddMember}
        availableFriends={availableFriends}
      />

      <RecordPaymentModal
        isOpen={showRecordPayment}
        onClose={() => {
          setShowRecordPayment(false);
          setSelectedDebts([]);
        }}
        onSubmit={handleRecordPayment}
        initialDebts={selectedDebts}
      />

      <PoolSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        poolMembers={poolMembers as PoolMember[] | undefined}
        currentUserId={currentUserId}
        onRemoveMember={handleRemoveMember}
      />
    </>
  );
}
