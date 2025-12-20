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
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/types/finance";

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .is('deleted_at', null)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching accounts:', error);
        } else if (data) {
          setAccounts(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
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

        {/* Accounts Section */}
        <div className="pt-4 mt-4 border-t">
          <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Accounts
          </h3>
          
          {loading ? (
            <div className="px-3 py-2 text-sm text-slate-400">
              Loading accounts...
            </div>
          ) : accounts.length > 0 ? (
            <div className="space-y-1">
              {accounts.map((account) => {
                const balance = account.current_balance ?? 0;
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    onClick={onClose}
                  >
                    <div className="flex items-center gap-x-2 min-w-0">
                      <Landmark size={16} className="flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{account.name}</span>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold ml-2 flex-shrink-0",
                      balance >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400">
              No accounts yet
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t text-sm text-slate-500">
        Logged in as: user@example.com
      </div>
    </div>
  );
}
