import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { useIsMobile } from "@/client/hooks/use-mobile";
import { TabBar } from "@/client/components/TabBar";
import { poolsCollection } from "@/client/tanstack-db";
import { Plus, Wallet, Users, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolDescription, setNewPoolDescription] = useState("");

  // Live query for pools
  const {
    data: pools,
    isLoading,
    isError,
  } = useLiveQuery((q) => q.from({ pool: poolsCollection }));

  const handleCreatePool = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPoolName.trim()) {
      poolsCollection.insert({
        id: crypto.randomUUID(),
        name: newPoolName.trim(),
        description: newPoolDescription.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewPoolName("");
      setNewPoolDescription("");
      setShowCreateModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <div className="alert alert-error">
          <span>Failed to load expense pools.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pb-20 md:pt-4 md:pb-0 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wallet className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Expense Pools</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4" />
            New Pool
          </button>
        </div>

        {/* Pool List */}
        {pools && pools.length > 0 ? (
          <div className="space-y-3">
            {pools.map((pool) => (
              <Link
                key={pool.id}
                to="/pools/$poolId"
                params={{ poolId: pool.id }}
                className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="card-body p-4">
                  <div className="flex items-center gap-4">
                    {/* Pool Icon */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-primary" />
                    </div>

                    {/* Pool Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {pool.name}
                      </h3>
                      {pool.description && (
                        <p className="text-sm text-base-content/60 truncate">
                          {pool.description}
                        </p>
                      )}
                      <p className="text-xs text-base-content/40 mt-1">
                        Created {new Date(pool.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-5 w-5 text-base-content/30 flex-shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mb-4">
              <Wallet className="h-16 w-16 mx-auto text-base-content/20" />
            </div>
            <h3 className="text-lg font-medium mb-2">No expense pools yet</h3>
            <p className="text-base-content/60 mb-6 max-w-sm mx-auto">
              Create a pool to start tracking shared expenses with friends and
              roommates.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              Create your first pool
            </button>
          </div>
        )}
      </div>

      {/* Create Pool Modal */}
      <dialog
        className={`modal ${showCreateModal ? "modal-open" : ""}`}
        onClick={() => setShowCreateModal(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-lg">Create New Pool</h3>
          <form onSubmit={handleCreatePool} className="mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Pool Name</span>
              </label>
              <input
                type="text"
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                placeholder="e.g., Roommates, Trip to Hawaii"
                className="input input-bordered"
                autoFocus
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Description (optional)</span>
              </label>
              <textarea
                value={newPoolDescription}
                onChange={(e) => setNewPoolDescription(e.target.value)}
                placeholder="What's this pool for?"
                className="textarea textarea-bordered"
                rows={2}
              />
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPoolName.trim()}
                className="btn btn-primary"
              >
                Create Pool
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
