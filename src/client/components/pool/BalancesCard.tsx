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
} from "@/shared/BalanceService";
import type { SelectedDebt } from "@/types";

interface BalancesCardProps {
  balances: PoolBalanceResult;
  totalExpenses: number;
  memberCount: number;
  unsettledCount: number;
  currentUserId: string;
  onAddMember: () => void;
  onRecordPayment: (debts: SelectedDebt[]) => void;
}

// Sub-component: Header with add member button
function BalancesHeader({ onAddMember }: { onAddMember: () => void }) {
  return (
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
  );
}

// Sub-component: Stats summary line
function StatsSummary({
  totalExpenses,
  memberCount,
  unsettledCount,
  showExpenses = true,
  showUnsettled = true,
}: {
  totalExpenses?: number;
  memberCount: number;
  unsettledCount?: number;
  showExpenses?: boolean;
  showUnsettled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-base-content/60">
      {showExpenses && totalExpenses !== undefined && (
        <>
          <span className="font-medium text-primary">
            ${totalExpenses.toFixed(2)}
          </span>
          <span>total</span>
          <span className="text-base-content/30">·</span>
        </>
      )}
      <span>{memberCount} members</span>
      {showUnsettled && unsettledCount !== undefined && (
        <>
          <span className="text-base-content/30">·</span>
          <span>{unsettledCount} unsettled</span>
        </>
      )}
    </div>
  );
}

// Sub-component: All settled state
function SettledState({
  totalExpenses,
  memberCount,
  onAddMember,
}: {
  totalExpenses: number;
  memberCount: number;
  onAddMember: () => void;
}) {
  return (
    <div className="card bg-base-100 shadow mb-6">
      <div className="card-body">
        <BalancesHeader onAddMember={onAddMember} />
        <StatsSummary
          totalExpenses={totalExpenses}
          memberCount={memberCount}
          showUnsettled={false}
        />
        <div className="alert alert-success mt-4">
          <CheckCircle className="h-5 w-5" />
          <span>All settled up!</span>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Empty state (no expenses)
function EmptyState({
  memberCount,
  onAddMember,
}: {
  memberCount: number;
  onAddMember: () => void;
}) {
  return (
    <div className="card bg-base-100 shadow mb-6">
      <div className="card-body">
        <BalancesHeader onAddMember={onAddMember} />
        <StatsSummary
          memberCount={memberCount}
          showExpenses={false}
          showUnsettled={false}
        />
        <p className="text-base-content/50 text-sm mt-4">
          Add your first expense to start tracking balances.
        </p>
      </div>
    </div>
  );
}

// Sub-component: Member balance row
function MemberBalanceRow({ balance }: { balance: MemberBalance }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {balance.balance > 0 ? (
          <TrendingUp className="h-4 w-4 text-success" />
        ) : (
          <TrendingDown className="h-4 w-4 text-error" />
        )}
        <span className="text-sm">{getUserDisplayName(balance.user)}</span>
      </div>
      <span
        className={`font-medium ${balance.balance > 0 ? "text-success" : "text-error"}`}
      >
        {balance.balance > 0 ? "+" : ""}${balance.balance.toFixed(2)}
      </span>
    </div>
  );
}

// Sub-component: Debt row
function DebtRow({
  debt,
  isYourDebt,
  isOwedToYou,
}: {
  debt: SimplifiedDebt;
  isYourDebt: boolean;
  isOwedToYou: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm py-3">
      <span className="font-medium">
        {isYourDebt ? "You" : getUserDisplayName(debt.fromUser)}
      </span>
      <ArrowRight className="hidden md:block h-4 w-4 text-base-content/40" />
      <span
        className={`font-medium ${isYourDebt || isOwedToYou ? "" : "flex-1"} ${isYourDebt ? "hidden md:block flex-1" : isOwedToYou ? "hidden md:block" : ""}`}
      >
        {isOwedToYou ? "You" : getUserDisplayName(debt.toUser)}
      </span>
      {(isYourDebt || isOwedToYou) && <span className="flex-1 md:hidden" />}
      {!isYourDebt && !isOwedToYou && null}
      <span
        className={`font-bold tabular-nums ${isOwedToYou ? "text-success" : ""}`}
      >
        ${debt.amount.toFixed(2)}
      </span>
    </div>
  );
}

// Sub-component: Your settlements section
function YourSettlements({
  yourDebts,
  debtsOwedToYou,
  onPayClick,
}: {
  yourDebts: SimplifiedDebt[];
  debtsOwedToYou: SimplifiedDebt[];
  onPayClick: () => void;
}) {
  if (yourDebts.length === 0 && debtsOwedToYou.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-base-content/70">
          Your settlements
        </h4>
        {yourDebts.length > 0 && (
          <button onClick={onPayClick} className="btn btn-primary btn-xs">
            <DollarSign className="h-3 w-3" />
            Pay
          </button>
        )}
      </div>
      <div className="divide-y divide-base-300">
        {yourDebts.map((debt, index) => (
          <DebtRow
            key={`owe-${index}`}
            debt={debt}
            isYourDebt={true}
            isOwedToYou={false}
          />
        ))}
        {debtsOwedToYou.map((debt, index) => (
          <DebtRow
            key={`owed-${index}`}
            debt={debt}
            isYourDebt={false}
            isOwedToYou={true}
          />
        ))}
      </div>
    </div>
  );
}

// Sub-component: Other settlements section
function OtherSettlements({ debts }: { debts: SimplifiedDebt[] }) {
  if (debts.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-base-content/70 mb-2">
        Other settlements
      </h4>
      <div className="divide-y divide-base-300">
        {debts.map((debt, index) => (
          <DebtRow
            key={index}
            debt={debt}
            isYourDebt={false}
            isOwedToYou={false}
          />
        ))}
      </div>
    </div>
  );
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

  // All settled up state
  const isAllSettledUp =
    hasExpenses && !hasNonZeroBalances && balances.simplifiedDebts.length === 0;

  if (isAllSettledUp) {
    return (
      <SettledState
        totalExpenses={totalExpenses}
        memberCount={memberCount}
        onAddMember={onAddMember}
      />
    );
  }

  // Empty state
  if (!hasExpenses) {
    return <EmptyState memberCount={memberCount} onAddMember={onAddMember} />;
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

  const filteredBalances = balances.memberBalances.filter(
    (b: MemberBalance) => Math.abs(b.balance) > CURRENCY_TOLERANCE,
  );

  return (
    <div className="card bg-base-100 shadow mb-6">
      <div className="card-body">
        <BalancesHeader onAddMember={onAddMember} />
        <StatsSummary
          totalExpenses={totalExpenses}
          memberCount={memberCount}
          unsettledCount={unsettledCount}
        />

        {/* Member Balances */}
        <div className="space-y-2 mt-4">
          {filteredBalances.map((balance: MemberBalance) => (
            <MemberBalanceRow key={balance.userId} balance={balance} />
          ))}
        </div>

        {/* Simplified Debts */}
        {balances.simplifiedDebts.length > 0 && (
          <div className="mt-4 space-y-4">
            <YourSettlements
              yourDebts={yourDebts}
              debtsOwedToYou={debtsOwedToYou}
              onPayClick={handlePayClick}
            />
            <OtherSettlements debts={otherDebts} />
          </div>
        )}
      </div>
    </div>
  );
}
