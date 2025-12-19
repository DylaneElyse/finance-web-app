"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ReceiptText, 
  Wallet, 
  Landmark, 
  Target, 
  Settings,
  X 
} from "lucide-react";
import { cn } from "@/lib/utils"; // Standard shadcn utility or just use string templates

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/protected/dashboard" },
  { label: "Transactions", icon: ReceiptText, href: "/protected/transactions" },
  { label: "Budget", icon: Wallet, href: "/protected/budget" },
  { label: "Accounts", icon: Landmark, href: "/protected/accounts" },
  { label: "Goals", icon: Target, href: "/protected/goals" },
  { label: "Settings", icon: Settings, href: "/protected/settings" },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-slate-50 border-r text-slate-900 z-50">
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-600">FinanceApp</h1>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-x-3 px-3 py-2 rounded-lg transition-colors font-medium",
              pathname === route.href 
                ? "bg-blue-100 text-blue-700" 
                : "text-slate-600 hover:bg-slate-200"
            )}
          >
            <route.icon size={20} />
            {route.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t text-sm text-slate-500">
        Logged in as: user@example.com
      </div>
    </div>
  );
}
