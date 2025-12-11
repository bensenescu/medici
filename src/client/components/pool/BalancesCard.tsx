import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  UserPlus,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { getUserDisplayName, CURRENCY_TOLERANCE } from "@/utils/formatters";
import type {
  PoolBalanceResult,
  MemberBalance,
  SimplifiedDebt,
} from "@/server/services/BalanceService";
import type { SelectedDebt } from "./types";

interface BalancesCardProps {
  balances: PoolBalanceResult;
  totalExpenses: number;
  memberCount: number;
  unsettledCount: number;
  currentUserId: string;
  onAddMember: () => void;
  onRecordPayment: (debts: SelectedDebt[]) => void;
}

export function BalancesCard({
  balances,
  totalExpenses,
  memberCount,
  unsettledCount,
  currentUserId,
  onAddMember,
  onRecordPayment,
}: BalancesCardProps) {
  const hasNonZeroBalances = balances.memberBalances.some(
    (b: MemberBalance) => Math.abs(b.balance) > CURRENCY_TOLERANCE,
  );
  const hasExpenses = totalExpenses > 0;

  // All settled up state - only show if there are actually expenses to settle
  const isAllSettledUp =
    hasExpenses && !hasNonZeroBalances && balances.simplifiedDebts.length === 0;

  if (isAllSettledUp) {
    return (
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-lg">Balances</h3>
            <button
              onClick={onAddMember}
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
            <span>{memberCount} members</span>
          </div>

          <div className="alert alert-success mt-4">
            <CheckCircle className="h-5 w-5" />
            <span>All settled up!</span>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no expenses yet
  if (!hasExpenses) {
    return (
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-lg">Balances</h3>
            <button
              onClick={onAddMember}
              className="btn btn-ghost btn-sm btn-square"
              title="Add member"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          </div>

          {/* Compact Stats Summary */}
          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <span>{memberCount} members</span>
          </div>

          <p className="text-base-content/50 text-sm mt-4">
            Add your first expense to start tracking balances.
          </p>
        </div>
      </div>
    );
  }

  // Split debts by category
  const yourDebts = balances.simplifiedDebts.filter(
    (debt: SimplifiedDebt) => debt.fromUserId === currentUserId,
  );
  const debtsOwedToYou = balances.simplifiedDebts.filter(
    (debt: SimplifiedDebt) => debt.toUserId === currentUserId,
  );
  const otherDebts = balances.simplifiedDebts.filter(
    (debt: SimplifiedDebt) =>
      debt.fromUserId !== currentUserId && debt.toUserId !== currentUserId,
  );

  const handlePayClick = () => {
    onRecordPayment(
      yourDebts.map((debt: SimplifiedDebt) => ({
        toUserId: debt.toUserId,
        toUserName: getUserDisplayName(debt.toUser),
        toUserVenmo: debt.toUser?.venmoHandle ?? null,
        maxAmount: debt.amount,
        paymentAmount: debt.amount.toFixed(2),
      })),
    );
  };

  return (
    <div className="card bg-base-100 shadow mb-6">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-lg">Balances</h3>
          <button
            onClick={onAddMember}
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
          <span>{memberCount} members</span>
          <span className="text-base-content/30">·</span>
          <span>{unsettledCount} unsettled</span>
        </div>

        {/* Member Balances */}
        <div className="space-y-2 mt-4">
          {balances.memberBalances
            .filter(
              (b: MemberBalance) => Math.abs(b.balance) > CURRENCY_TOLERANCE,
            )
            .map((balance: MemberBalance) => (
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
                  {balance.balance > 0 ? "+" : ""}${balance.balance.toFixed(2)}
                </span>
              </div>
            ))}
        </div>

        {/* Simplified Debts */}
        {balances.simplifiedDebts.length > 0 && (
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
                      onClick={handlePayClick}
                      className="btn btn-primary btn-xs"
                    >
                      <DollarSign className="h-3 w-3" />
                      Pay
                    </button>
                  )}
                </div>
                <div className="divide-y divide-base-300">
                  {yourDebts.map((debt: SimplifiedDebt, index: number) => (
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
                  {debtsOwedToYou.map((debt: SimplifiedDebt, index: number) => (
                    <div
                      key={`owed-${index}`}
                      className="flex items-center gap-2 text-sm py-3"
                    >
                      <span className="font-medium">
                        {getUserDisplayName(debt.fromUser)}
                      </span>
                      <ArrowRight className="hidden md:block h-4 w-4 text-base-content/40" />
                      <span className="hidden md:block font-medium">You</span>
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
                  {otherDebts.map((debt: SimplifiedDebt, index: number) => (
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
        )}
      </div>
    </div>
  );
}
