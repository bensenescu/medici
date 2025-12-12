import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { useMemo, useState } from "react";
import {
  poolsCollection,
  expensesCollection,
  rulesCollection,
  poolMembersCollection,
  settlementsCollection,
} from "@/client/tanstack-db";
import { ArrowLeft } from "lucide-react";
import { eq } from "@tanstack/db";
import { useCurrentUser } from "@/embedded-sdk/client";

import {
  BalanceService,
  type PoolBalanceResult,
} from "@/shared/BalanceService";
import { ExpenseList } from "@/client/components/pool/ExpenseList";
import { SettlementHistory } from "@/client/components/pool/SettlementHistory";
import { BalancesCard } from "@/client/components/pool/BalancesCard";
import { PoolHeader } from "@/client/components/pool/PoolHeader";
import { AddExpenseModal } from "@/client/components/pool/AddExpenseModal";
import { EditExpenseModal } from "@/client/components/pool/EditExpenseModal";
import { AddMemberModal } from "@/client/components/pool/AddMemberModal";
import { RecordPaymentModal } from "@/client/components/pool/RecordPaymentModal";
import type { Expense, SelectedDebt, PoolMemberWithUser } from "@/types";

export const Route = createFileRoute("/pools/$poolId")({
  component: PoolDetail,
});

function PoolDetail() {
  const { poolId } = Route.useParams();

  // Modal states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  // Edit expense state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Settlement state
  const [selectedDebts, setSelectedDebts] = useState<SelectedDebt[]>([]);

  // Get current user from session token (instant, no server call needed)
  const currentUser = useCurrentUser();

  // Live queries - all data fetched here, passed down to children
  const { data: pools } = useLiveQuery(
    (q) =>
      q
        .from({ pool: poolsCollection })
        .where(({ pool }) => eq(pool.id, poolId)),
    [poolId],
  );
  const pool = pools?.[0];

  const { data: allExpenses } = useLiveQuery(
    (q) =>
      q
        .from({ expense: expensesCollection })
        .where(({ expense }) => eq(expense.poolId, poolId))
        .orderBy(({ expense }) => expense.createdAt, "desc"),
    [poolId],
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

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setShowEditExpense(true);
  };

  const handleRecordPaymentFromBalances = (debts: SelectedDebt[]) => {
    setSelectedDebts(debts);
    setShowRecordPayment(true);
  };

  // Calculate totals
  const totalExpenses = allExpenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const unsettledCount = allExpenses?.filter((e) => !e.isSettled).length ?? 0;

  // Loading state - wait for user and balances
  if (!currentUser || !balances) {
    return null;
  }

  const currentUserId = currentUser.userId;

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
          poolId={poolId}
          poolName={pool.name}
          poolDescription={pool.description}
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
          poolMembers={poolMembers as PoolMemberWithUser[] | undefined}
          currentUserId={currentUserId}
        />

        <ExpenseList
          expenses={expenses as Expense[]}
          onAddExpense={() => setShowAddExpense(true)}
          onEditExpense={openEditModal}
        />
      </div>

      <AddExpenseModal
        poolId={poolId}
        currentUserId={currentUserId}
        rules={rules}
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
      />

      <EditExpenseModal
        isOpen={showEditExpense}
        expense={editingExpense}
        onClose={() => {
          setShowEditExpense(false);
          setEditingExpense(null);
        }}
      />

      <AddMemberModal
        poolId={poolId}
        poolMembers={poolMembers as PoolMemberWithUser[] | undefined}
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
      />

      <RecordPaymentModal
        poolId={poolId}
        currentUserId={currentUserId}
        isOpen={showRecordPayment}
        onClose={() => {
          setShowRecordPayment(false);
          setSelectedDebts([]);
        }}
        initialDebts={selectedDebts}
      />
    </>
  );
}
