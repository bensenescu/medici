import { useState } from "react";
import { Plus, Pencil, Trash2, MoreVertical } from "lucide-react";
import { expensesCollection } from "@/client/tanstack-db";
import { categoryInfo } from "@/types";
import type { Expense } from "@/types";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";

interface ExpenseListProps {
  expenses: Expense[];
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

export function ExpenseList({
  expenses,
  onAddExpense,
  onEditExpense,
}: ExpenseListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    expenseId: string | null;
    expenseName: string;
  }>({ isOpen: false, expenseId: null, expenseName: "" });

  const handleDeleteClick = (expense: Expense) => {
    setDeleteConfirm({
      isOpen: true,
      expenseId: expense.id,
      expenseName: expense.name,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.expenseId) {
      expensesCollection.delete(deleteConfirm.expenseId);
    }
    setDeleteConfirm({ isOpen: false, expenseId: null, expenseName: "" });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, expenseId: null, expenseName: "" });
  };

  return (
    <>
      <div className="card bg-base-100 shadow mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-lg">Expenses ({expenses.length})</h3>
            <button onClick={onAddExpense} className="btn btn-primary btn-sm">
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
          {expenses && expenses.length > 0 ? (
            <div className="divide-y divide-base-300 mt-2">
              {expenses.map((expense) => {
                const catInfo = categoryInfo[expense.category];

                return (
                  <div key={expense.id}>
                    <div className="py-4">
                      <div className="flex items-center gap-3">
                        {/* Category Icon */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                          <span className="text-lg text-primary">$</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{expense.name}</p>
                          <p className="text-sm text-base-content/60">
                            {catInfo?.label ?? expense.category}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p className="font-semibold">
                            ${expense.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-base-content/40">
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Actions Menu */}
                        <div className="dropdown dropdown-end">
                          <button
                            tabIndex={0}
                            className="btn btn-ghost btn-sm btn-square"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          <ul
                            tabIndex={0}
                            className="dropdown-content menu bg-base-200 rounded-lg border border-base-300 z-10 w-40 p-2 gap-1"
                          >
                            <li>
                              <button
                                onClick={() => onEditExpense(expense)}
                                className="flex items-center gap-2 rounded-md"
                              >
                                <Pencil className="h-4 w-4" /> Edit
                              </button>
                            </li>
                            <li className="border-t border-base-300 pt-1 mt-1">
                              <button
                                className="flex items-center gap-2 rounded-md text-error hover:bg-error/10"
                                onClick={() => handleDeleteClick(expense)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-base-content/60">
              <p>No expenses yet.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteConfirm.expenseName}"? This will affect the pool balances.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
