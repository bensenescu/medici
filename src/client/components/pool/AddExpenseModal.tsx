import { useState, useEffect } from "react";
import type { ExpenseCategory } from "@/types";
import { ExpenseForm, type ExpenseFormData } from "./ExpenseForm";
import { applyCategoryRules } from "@/utils/categoryRules";

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

const DEFAULT_FORM_DATA: ExpenseFormData = {
  name: "",
  amount: "",
  category: "miscellaneous",
};

export function AddExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  rules,
}: AddExpenseModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>(DEFAULT_FORM_DATA);

  // Apply auto-categorization rules when expense name changes
  useEffect(() => {
    if (!formData.name.trim() || !rules || rules.length === 0) return;

    const matchedCategory = applyCategoryRules(formData.name, rules);
    if (matchedCategory !== "miscellaneous") {
      setFormData((prev) => ({ ...prev, category: matchedCategory }));
    }
  }, [formData.name, rules]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.amount) {
      onSubmit({
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
      });
      setFormData(DEFAULT_FORM_DATA);
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
