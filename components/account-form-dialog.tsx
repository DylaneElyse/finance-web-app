'use client';

import { createAccount, updateAccount } from '@/actions/accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Account {
  id: string;
  name: string;
  type: string;
  starting_balance: number | null;
}

interface AccountFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account?: Account | null;
}

export function AccountFormDialog({ isOpen, onClose, account }: AccountFormDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountType, setAccountType] = useState(account?.type || 'chequing');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Reset submitting state and account type when dialog opens
      setIsSubmitting(false);
      setAccountType(account?.type || 'chequing');
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, account?.id, account?.type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      if (account) {
        await updateAccount(formData);
      } else {
        await createAccount(formData);
      }
      // If we reach here without redirect, close the dialog
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      setIsSubmitting(false);
      // Show error to user
      alert('Failed to save account. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {account ? 'Edit Account' : 'Add New Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {account && <input type="hidden" name="id" value={account.id} />}

          <div>
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={account?.name}
              placeholder="e.g., Main Chequing"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Account Type</Label>
            <select
              id="type"
              name="type"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="chequing">Chequing</option>
              <option value="savings">Savings</option>
              <option value="credit_card">Credit Card</option>
              <option value="line_of_credit">Line of Credit</option>
            </select>
          </div>

          <div>
            <Label htmlFor="starting_balance">
              {accountType === 'credit_card' || accountType === 'line_of_credit' 
                ? 'Balance Owed' 
                : 'Starting Balance'}
            </Label>
            <Input
              id="starting_balance"
              name="starting_balance"
              type="number"
              step="0.01"
              defaultValue={account?.starting_balance ?? 0}
              placeholder="0.00"
              required
            />
          </div>

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
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : account ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
