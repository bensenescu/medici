import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { settlementsCollection } from "@/client/tanstack-db";
import { CURRENCY_TOLERANCE } from "@/utils/formatters";
import type { SelectedDebt } from "@/types";

interface RecordPaymentModalProps {
  poolId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  initialDebts: SelectedDebt[];
}

export function RecordPaymentModal({
  poolId,
  currentUserId,
  isOpen,
  onClose,
  initialDebts,
}: RecordPaymentModalProps) {
  const [debts, setDebts] = useState<SelectedDebt[]>(initialDebts);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync debts when modal opens with new initialDebts
  useEffect(() => {
    if (isOpen) {
      setDebts(initialDebts);
      setNote("");
      setError(null);
    }
  }, [isOpen, initialDebts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (debts.length === 0) return;

    const paymentsToSubmit = debts
      .map((debt) => ({
        toUserId: debt.toUserId,
        amount: parseFloat(debt.paymentAmount),
        maxAmount: debt.maxAmount,
        toUserName: debt.toUserName,
      }))
      .filter((p) => !isNaN(p.amount) && p.amount > 0);

    if (paymentsToSubmit.length === 0) {
      setError("Please enter at least one valid amount");
      return;
    }

    const invalidPayment = paymentsToSubmit.find(
      (p) => p.amount > p.maxAmount + CURRENCY_TOLERANCE,
    );
    if (invalidPayment) {
      setError(
        `Amount for ${invalidPayment.toUserName} cannot exceed $${invalidPayment.maxAmount.toFixed(2)}`,
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create all settlements optimistically
      const now = new Date().toISOString();
      paymentsToSubmit.forEach((payment) => {
        settlementsCollection.insert({
          id: crypto.randomUUID(),
          poolId,
          fromUserId: currentUserId,
          toUserId: payment.toUserId,
          amount: payment.amount,
          note: note || null,
          createdAt: now,
          createdByUserId: currentUserId,
        });
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDebts([]);
    setNote("");
    setError(null);
    onClose();
  };

  const updateDebtAmount = (index: number, paymentAmount: string) => {
    const newDebts = [...debts];
    newDebts[index] = { ...newDebts[index], paymentAmount };
    setDebts(newDebts);
    setError(null);
  };

  const total = debts.reduce(
    (sum, d) => sum + (parseFloat(d.paymentAmount) || 0),
    0,
  );

  const hasValidPayment = debts.some((d) => parseFloat(d.paymentAmount) > 0);

  return (
    <dialog
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onClick={handleClose}
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">
          Record Payment{debts.length > 1 ? "s" : ""}
        </h3>
        {debts.length > 0 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {debts.map((debt, index) => (
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
                    onChange={(e) => updateDebtAmount(index, e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={debt.maxAmount}
                    className="grow bg-transparent outline-none"
                  />
                </label>
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
            {debts.length > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-base-300">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">${total.toFixed(2)}</span>
              </div>
            )}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Note (optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Venmo payment"
                className="input input-bordered w-full"
              />
            </div>
            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}
            <div className="modal-action pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!hasValidPayment || isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4" />
                    Record Payment{debts.length > 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
