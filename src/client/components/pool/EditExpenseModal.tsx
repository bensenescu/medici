import { useState, useEffect } from "react";
import { expensesCollection } from "@/client/tanstack-db";
import { DEFAULT_EXPENSE_CATEGORY } from "@/db/schema";
import type { Expense } from "@/types";
import { ExpenseForm, type ExpenseFormData } from "./ExpenseForm";

interface EditExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
}

export function EditExpenseModal({
  isOpen,
  expense,
  onClose,
}: EditExpenseModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    name: "",
    amount: "",
    category: DEFAULT_EXPENSE_CATEGORY,
  });

  // Sync form state when expense changes
  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        amount: expense.amount.toString(),
        category: expense.category,
      });
    }
  }, [expense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense || !formData.name.trim() || !formData.amount) return;

    expensesCollection.update(expense.id, (draft) => {
      draft.name = formData.name.trim();
      draft.amount = parseFloat(formData.amount);
      draft.category = formData.category;
      draft.updatedAt = new Date().toISOString();
    });
    onClose();
  };

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`} onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-6">Edit Expense</h3>
        <ExpenseForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Save Changes"
        />
      </div>
    </dialog>
  );
}
