'use client';

import { deleteAccount } from '@/actions/accounts';
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AccountFormDialog } from './account-form-dialog';

// Helper to format currency
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface Account {
  id: string;
  name: string;
  type: string;
  starting_balance: number | null;
  current_balance: number | null;
}

interface AccountsTableProps {
  accounts: Account[];
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (accountId: string, accountName: string) => {
    if (!confirm(`Are you sure you want to delete "${accountName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(accountId);
    try {
      await deleteAccount(accountId);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-spacing-0 border-separate">
          <thead>
            <tr className="text-slate-500 text-sm uppercase">
              <th className="text-left font-medium py-3 px-4">Account Name</th>
              <th className="text-right font-medium py-3 px-4">Type</th>
              <th className="text-right font-medium py-3 px-4">Starting Balance</th>
              <th className="text-right font-medium py-3 px-4">Current Balance</th>
              <th className="text-right font-medium py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const currentBalance = account.current_balance ?? 0;
              const startingBalance = account.starting_balance ?? 0;
              const isPositive = currentBalance >= 0;
              
              return (
                <tr 
                  key={account.id} 
                  className="group hover:bg-blue-50/50 transition-colors"
                >
                  <td className="py-3 px-4 border-t font-medium">
                    {account.name}
                  </td>
                  <td className="py-3 px-4 border-t text-right tabular-nums capitalize">
                    {account.type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 border-t text-right tabular-nums text-slate-500">
                    {formatter.format(startingBalance)}
                  </td>
                  <td className="py-3 px-4 border-t text-right tabular-nums">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold",
                      isPositive 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    )}>
                      {formatter.format(currentBalance)}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-t text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingAccount(account)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        title="Edit account"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id, account.name)}
                        disabled={isDeleting === account.id}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AccountFormDialog
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        account={editingAccount}
      />
    </>
  );
}
