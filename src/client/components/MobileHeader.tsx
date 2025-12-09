interface MobileHeaderProps {
  currentPath: string;
}

export function MobileHeader({ currentPath }: MobileHeaderProps) {
  const getPageTitle = (path: string) => {
    if (path === "/") return "Expense Pools";
    if (path === "/friends") return "Friends";
    if (path === "/rules") return "Rules";
    if (path.startsWith("/pools/")) return "Pool Details";
    return "Medici";
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-base-100 border-b border-base-300 px-4 py-3 z-50 pt-safe">
      <h1 className="text-xl font-semibold text-base-content">
        {getPageTitle(currentPath)}
      </h1>
    </div>
  );
}
