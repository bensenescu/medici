import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/client/hooks/use-mobile";
import { TabBar } from "@/client/components/TabBar";
import { Plus, Trash2, Sparkles, Tag } from "lucide-react";
import { categoryInfo, expenseCategories, type ExpenseCategory } from "@/types";
import { getAllRules, createRule, deleteRule } from "@/serverFunctions/rules";

export const Route = createFileRoute("/rules")({
  component: RulesPage,
});

type Rule = {
  id: string;
  userId: string;
  rule: string;
  category: ExpenseCategory;
  createdAt: string;
};

function RulesPage() {
  const isMobile = useIsMobile();
  const location = useLocation();

  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    rule: "",
    category: "miscellaneous" as ExpenseCategory,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch rules on mount
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const result = await getAllRules();
        setRules(result.rules as Rule[]);
      } catch (error) {
        console.error("Failed to fetch rules:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRules();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.rule.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createRule({
        data: {
          id: crypto.randomUUID(),
          rule: newRule.rule.trim(),
          category: newRule.category,
        },
      });
      setRules([...rules, result.rule as Rule]);
      setNewRule({ rule: "", category: "miscellaneous" });
      setShowAddRule(false);
    } catch (error) {
      console.error("Failed to create rule:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setDeletingId(ruleId);
    try {
      await deleteRule({ data: { id: ruleId } });
      setRules(rules.filter((r) => r.id !== ruleId));
    } catch (error) {
      console.error("Failed to delete rule:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="px-4 pb-20 md:pt-4 md:pb-0 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Auto-Categorization Rules</h1>
          </div>
          <p className="text-base-content/60">
            Create rules to automatically categorize your expenses based on
            keywords in the expense name.
          </p>
        </div>

        {/* Add Rule Button */}
        <button
          onClick={() => setShowAddRule(true)}
          className="btn btn-primary w-full mb-6"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>

        {/* Rules List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : rules.length > 0 ? (
          <div className="space-y-3">
            {rules.map((rule) => {
              const catInfo = categoryInfo[rule.category];
              return (
                <div key={rule.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3">
                      {/* Category Badge */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${catInfo.color}20` }}
                      >
                        <Tag
                          className="h-5 w-5"
                          style={{ color: catInfo.color }}
                        />
                      </div>

                      {/* Rule Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          Contains:{" "}
                          <span className="font-mono bg-base-200 px-2 py-0.5 rounded">
                            {rule.rule}
                          </span>
                        </p>
                        <p className="text-sm text-base-content/60">
                          Categorize as{" "}
                          <span
                            className="font-medium"
                            style={{ color: catInfo.color }}
                          >
                            {catInfo.label}
                          </span>
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deletingId === rule.id}
                        className="btn btn-ghost btn-square btn-sm text-error"
                      >
                        {deletingId === rule.id ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-base-content/20 mx-auto mb-4" />
            <p className="text-base-content/60 mb-2">No rules yet</p>
            <p className="text-sm text-base-content/40">
              Add a rule to automatically categorize expenses containing certain
              keywords.
            </p>
          </div>
        )}

        {/* Example Rules */}
        {rules.length === 0 && !isLoading && (
          <div className="mt-8">
            <h3 className="font-medium text-base-content/70 mb-3">
              Example rules:
            </h3>
            <div className="space-y-2 text-sm text-base-content/60">
              <p>
                - "uber" or "lyft" →{" "}
                <span className="text-primary">Transportation</span>
              </p>
              <p>
                - "netflix" or "spotify" →{" "}
                <span className="text-primary">Subscriptions</span>
              </p>
              <p>
                - "costco" or "trader" →{" "}
                <span className="text-primary">Groceries</span>
              </p>
              <p>
                - "restaurant" or "dinner" →{" "}
                <span className="text-primary">Food & Dining</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      <dialog
        className={`modal ${showAddRule ? "modal-open" : ""}`}
        onClick={() => setShowAddRule(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Add Auto-Categorization Rule</h3>
          <form onSubmit={handleAddRule} className="mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  When expense name contains...
                </span>
              </label>
              <input
                type="text"
                value={newRule.rule}
                onChange={(e) =>
                  setNewRule({ ...newRule, rule: e.target.value })
                }
                placeholder="e.g., uber, costco, netflix"
                className="input input-bordered"
                autoFocus
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  Case-insensitive matching
                </span>
              </label>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Categorize as...</span>
              </label>
              <select
                value={newRule.category}
                onChange={(e) =>
                  setNewRule({
                    ...newRule,
                    category: e.target.value as ExpenseCategory,
                  })
                }
                className="select select-bordered"
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryInfo[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowAddRule(false)}
                className="btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newRule.rule.trim() || isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Rule
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0">
          <TabBar currentPath={location.pathname} />
        </div>
      )}
    </>
  );
}
