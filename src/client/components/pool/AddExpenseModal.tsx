import { useState, useEffect } from "react";
import type { ExpenseCategory } from "@/types";
import { CategorySelect } from "./CategorySelect";

interface Rule {
  rule: string;
  category: ExpenseCategory;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: {
    name: string;
    amount: number;
    category: ExpenseCategory;
  }) => void;
  rules: Rule[] | undefined;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  rules,
}: AddExpenseModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("miscellaneous");

  // Apply auto-categorization rules when expense name changes
  useEffect(() => {
    if (!name.trim() || !rules || rules.length === 0) return;

    const expenseNameLower = name.toLowerCase();
    for (const rule of rules) {
      if (expenseNameLower.includes(rule.rule.toLowerCase())) {
        setCategory(rule.category);
        break;
      }
    }
  }, [name, rules]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && amount) {
      onSubmit({
        name: name.trim(),
        amount: parseFloat(amount),
        category,
      });
      // Reset form
      setName("");
      setAmount("");
      setCategory("miscellaneous");
    }
  };

  const handleClose = () => {
    setName("");
    setAmount("");
    setCategory("miscellaneous");
    onClose();
  };

  return (
    <dialog
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onClick={handleClose}
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-6">Add New Expense</h3>
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
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !amount}
              className="btn btn-primary"
            >
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
