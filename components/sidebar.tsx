"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ReceiptText, 
  ClipboardList, 
  Landmark, 
  Settings,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/types/finance";

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/protected/dashboard" },
  { label: "Transactions", icon: ReceiptText, href: "/protected/transactions" },
  { label: "Plan", icon: ClipboardList, href: "/protected/plan" },
  { label: "Accounts", icon: Landmark, href: "/protected/accounts" },
  { label: "Settings", icon: Settings, href: "/protected/settings" },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('sidebarToggle'));
  };

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
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col bg-slate-50 border-r text-slate-900 z-50 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-6 flex items-center",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && <h1 className="text-xl font-bold text-blue-600">FinanceApp</h1>}
        {isCollapsed && <h1 className="text-xl font-bold text-blue-600">FA</h1>}
        {onClose && !isCollapsed && (
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-slate-200 rounded">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-2 overflow-y-auto">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-x-3 px-3 py-2 rounded-lg transition-colors font-medium",
              pathname === route.href 
                ? "bg-blue-100 text-blue-700" 
                : "text-slate-600 hover:bg-slate-200",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? route.label : undefined}
          >
            <route.icon size={20} className="flex-shrink-0" />
            {!isCollapsed && <span>{route.label}</span>}
          </Link>
        ))}

        {/* Accounts Section */}
        {!isCollapsed && (
          <div className="pt-4 mt-4 border-t">
            <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Accounts
            </h3>
            
            {loading ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                Loading...
              </div>
            ) : accounts.length > 0 ? (
              <div className="space-y-1">
                {accounts.map((account) => {
                  const balance = account.current_balance ?? 0;
                  const accountTransactionsPath = `/protected/accounts/${account.id}/transactions`;
                  const isActive = pathname === accountTransactionsPath;
                  
                  return (
                    <Link
                      key={account.id}
                      href={accountTransactionsPath}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                        isActive 
                          ? "bg-blue-100 text-blue-700" 
                          : "text-slate-600 hover:bg-slate-200"
                      )}
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
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400">
                No accounts yet
              </div>
            )}
          </div>
        )}

        {/* Collapsed accounts indicator */}
        {isCollapsed && accounts.length > 0 && (
          <div className="pt-4 mt-4 border-t">
            <button
              className="w-full flex items-center justify-center p-2 text-slate-600 hover:bg-slate-200 rounded-lg"
              title={`${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
            >
              <Landmark size={20} />
            </button>
          </div>
        )}
      </nav>

      {/* Footer with user info and collapse toggle */}
      <div className="border-t">
        {!isCollapsed && (
          <div className="px-4 py-2 text-xs text-slate-500">
            Logged in
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className={cn(
            "w-full flex items-center gap-x-2 p-3 text-slate-600 hover:bg-slate-200 transition-colors",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isCollapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </div>
  );
}
