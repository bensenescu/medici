import { Link } from "@tanstack/react-router";
import { Wallet, Users, Sparkles } from "lucide-react";

interface SidebarProps {
  currentPath: string;
}

export function Sidebar({ currentPath }: SidebarProps) {
  const navItems = [
    {
      to: "/",
      label: "Expense Pools",
      icon: Wallet,
      isActive: currentPath === "/" || currentPath.startsWith("/pools"),
    },
    {
      to: "/friends",
      label: "Friends",
      icon: Users,
      isActive: currentPath === "/friends",
    },
    {
      to: "/rules",
      label: "Rules",
      icon: Sparkles,
      isActive: currentPath === "/rules",
    },
  ];

  return (
    <div className="w-64 bg-base-100 border-r border-base-300 h-full">
      <div className="px-4 py-3 border-b border-base-300">
        <a
          href={import.meta.env.VITE_GATEWAY_URL}
          target="_top"
          className="text-lg font-semibold text-base-content hover:text-primary transition-colors"
        >
          Every App
        </a>
      </div>
      <div className="py-4 pl-2 pr-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none ${
                  item.isActive
                    ? "text-base-content border-l-4 border-primary"
                    : "text-base-content/70 hover:text-base-content border-l-4 border-transparent"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
