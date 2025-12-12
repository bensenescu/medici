import { Link } from "@tanstack/react-router";
import { ArrowLeft, Settings } from "lucide-react";

interface PoolHeaderProps {
  poolId: string;
  poolName: string;
  poolDescription: string | null;
}

export function PoolHeader({
  poolId,
  poolName,
  poolDescription,
}: PoolHeaderProps) {
  return (
    <div className="mb-4">
      <Link to="/" className="btn btn-ghost btn-sm gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Pools
      </Link>
      <div className="flex items-start justify-between mt-2">
        <div>
          <h1 className="text-2xl font-bold">{poolName}</h1>
          {poolDescription && (
            <p className="text-base-content/60 mt-1">{poolDescription}</p>
          )}
        </div>
        <Link
          to="/pools/$poolId/settings"
          params={{ poolId }}
          className="btn btn-ghost btn-square btn-sm"
          title="Pool settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
