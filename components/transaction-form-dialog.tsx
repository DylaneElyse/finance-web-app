'use client';

import { createTransaction, updateTransaction } from '@/actions/transactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Account, TransactionWithDetails } from '@/types/finance';

interface TransactionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: TransactionWithDetails | null;
}

export function TransactionFormDialog({ isOpen, onClose, transaction }: TransactionFormDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
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
      setLoadingAccounts(false);
    };

    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      setIsSubmitting(false);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      if (transaction) {
        await updateTransaction(formData);
      } else {
        await createTransaction(formData);
      }
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      setIsSubmitting(false);
      alert('Failed to save transaction. Please try again.');
    }
  };

  // Calculate outflow/inflow for editing
  const amount = transaction?.amount || 0;
  const isExpense = transaction?.type === 'expense' || amount < 0;
  const isIncome = transaction?.type === 'income' || amount > 0;
  const defaultOutflow = isExpense ? Math.abs(amount) : 0;
  const defaultInflow = isIncome ? Math.abs(amount) : 0;

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const transactionDate = transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : today;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {transaction ? 'Edit Transaction' : 'Add New Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {transaction && <input type="hidden" name="id" value={transaction.id} />}

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={transactionDate}
              required
            />
          </div>

          <div>
            <Label htmlFor="payee">Payee</Label>
            <Input
              id="payee"
              name="payee"
              defaultValue={transaction?.payee}
              placeholder="e.g., Grocery Store"
              required
            />
          </div>

          <div>
            <Label htmlFor="account_id">Account</Label>
            <select
              id="account_id"
              name="account_id"
              defaultValue={transaction?.account_id}
              className="w-full px-3 py-2 border rounded-md text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loadingAccounts}
            >
              <option value="">Select an account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              name="description"
              defaultValue={transaction?.description || ''}
              placeholder="Additional notes..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="outflow">Outflow</Label>
              <Input
                id="outflow"
                name="outflow"
                type="number"
                step="0.01"
                min="0"
                defaultValue={defaultOutflow || ''}
                placeholder="0.00"
                className="text-red-600 font-semibold"
              />
            </div>

            <div>
              <Label htmlFor="inflow">Inflow</Label>
              <Input
                id="inflow"
                name="inflow"
                type="number"
                step="0.01"
                min="0"
                defaultValue={defaultInflow || ''}
                placeholder="0.00"
                className="text-green-600 font-semibold"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            * Enter amount in either Outflow (expenses) or Inflow (income), not both
          </p>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || loadingAccounts}>
              {isSubmitting ? 'Saving...' : transaction ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
