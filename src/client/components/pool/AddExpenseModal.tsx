import { useState, useEffect } from "react";
import { expensesCollection } from "@/client/tanstack-db";
import { ExpenseForm, type ExpenseFormData } from "./ExpenseForm";
import { applyCategoryRules } from "@/utils/categoryRules";
import { DEFAULT_EXPENSE_CATEGORY } from "@/db/schema";
import type { ExpenseCategoryRule } from "@/types";

interface AddExpenseModalProps {
  poolId: string;
  currentUserId: string;
  rules: ExpenseCategoryRule[] | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FORM_DATA: ExpenseFormData = {
  name: "",
  amount: "",
  category: DEFAULT_EXPENSE_CATEGORY,
};

export function AddExpenseModal({
  poolId,
  currentUserId,
  rules,
  isOpen,
  onClose,
}: AddExpenseModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>(DEFAULT_FORM_DATA);

  // Apply auto-categorization rules when expense name changes
  useEffect(() => {
    if (!formData.name.trim() || !rules || rules.length === 0) return;

    const matchedCategory = applyCategoryRules(formData.name, rules);
    if (matchedCategory !== DEFAULT_EXPENSE_CATEGORY) {
      setFormData((prev) => ({ ...prev, category: matchedCategory }));
    }
  }, [formData.name, rules]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.amount) {
      expensesCollection.insert({
        id: crypto.randomUUID(),
        poolId,
        paidByUserId: currentUserId,
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setFormData(DEFAULT_FORM_DATA);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData(DEFAULT_FORM_DATA);
    onClose();
  };

  return (
    <dialog
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onClick={handleClose}
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-6">Add New Expense</h3>
        <ExpenseForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          submitLabel="Add Expense"
        />
      </div>
    </dialog>
  );
}
