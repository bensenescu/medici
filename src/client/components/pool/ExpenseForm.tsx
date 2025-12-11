import type { ExpenseCategory } from "@/types";
import { CategorySelect } from "./CategorySelect";

export interface ExpenseFormData {
  name: string;
  amount: string;
  category: ExpenseCategory;
}

interface ExpenseFormProps {
  data: ExpenseFormData;
  onChange: (data: ExpenseFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  isSubmitDisabled?: boolean;
}

export function ExpenseForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitDisabled,
}: ExpenseFormProps) {
  const canSubmit = data.name.trim() && data.amount && !isSubmitDisabled;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="form-control w-full">
        <label className="label">
          <span className="label-text font-medium">Expense Name</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
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
            value={data.amount}
            onChange={(e) => onChange({ ...data, amount: e.target.value })}
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
        <CategorySelect
          value={data.category}
          onChange={(category) => onChange({ ...data, category })}
        />
      </div>
      <div className="modal-action pt-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={!canSubmit} className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
