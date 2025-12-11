import { useState, useEffect } from "react";
import type { ExpenseCategory } from "@/types";
import { CategorySelect } from "./CategorySelect";
import type { Expense } from "./types";

interface EditExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSubmit: (
    expenseId: string,
    updates: { name: string; amount: number; category: ExpenseCategory },
  ) => void;
}

export function EditExpenseModal({
  isOpen,
  expense,
  onClose,
  onSubmit,
}: EditExpenseModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("miscellaneous");

  // Sync form state when expense changes
  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setAmount(expense.amount.toString());
      setCategory(expense.category);
    }
  }, [expense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense || !name.trim() || !amount) return;

    onSubmit(expense.id, {
      name: name.trim(),
      amount: parseFloat(amount),
      category,
    });
  };

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`} onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-6">Edit Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Expense Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
            <CategorySelect value={category} onChange={setCategory} />
          </div>
          <div className="modal-action pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !amount}
              className="btn btn-primary"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
