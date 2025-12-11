import { categoryInfo, expenseCategories, type ExpenseCategory } from "@/types";

interface CategorySelectProps {
  value: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
  className?: string;
}

export function CategorySelect({
  value,
  onChange,
  className = "select select-bordered w-full",
}: CategorySelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ExpenseCategory)}
      className={className}
    >
      {expenseCategories.map((cat) => (
        <option key={cat} value={cat}>
          {categoryInfo[cat].label}
        </option>
      ))}
    </select>
  );
}
