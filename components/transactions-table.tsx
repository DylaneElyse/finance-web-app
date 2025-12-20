'use client';

import { createTransaction, deleteTransaction, updateTransaction } from '@/actions/transactions';
import { Trash2, Check, X, Pencil } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Account, TransactionWithDetails } from '@/types/finance';

// Helper to format currency
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// Helper to format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper to format date for input
const formatDateForInput = (dateString: string) => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

interface TransactionsTableProps {
  transactions: TransactionWithDetails[];
}

interface EditingTransaction {
  id: string;
  date: string;
  payee: string;
  account_id: string;
  description: string;
  outflow: string;
  inflow: string;
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditingTransaction | null>(null);
  
  // Form state for new transaction
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    payee: '',
    account_id: '',
    description: '',
    outflow: '',
    inflow: '',
  });

  const newRowRef = useRef<HTMLTableRowElement>(null);

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
        // Set default account if available
        if (data.length > 0 && !newTransaction.account_id) {
          setNewTransaction(prev => ({ ...prev, account_id: data[0].id }));
        }
      }
      setLoadingAccounts(false);
    };

    fetchAccounts();
  }, []);

  useEffect(() => {
    if (isAddingNew && newRowRef.current) {
      newRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isAddingNew]);

  const handleAddNewRow = () => {
    setIsAddingNew(true);
    setEditingTransaction(null);
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewTransaction({
      date: new Date().toISOString().split('T')[0],
      payee: '',
      account_id: accounts.length > 0 ? accounts[0].id : '',
      description: '',
      outflow: '',
      inflow: '',
    });
  };

  const handleSaveNew = async () => {
    if (!newTransaction.payee || !newTransaction.account_id) {
      alert('Please fill in at least the payee and account');
      return;
    }

    if (!newTransaction.outflow && !newTransaction.inflow) {
      alert('Please enter either an outflow or inflow amount');
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append('date', newTransaction.date);
    formData.append('payee', newTransaction.payee);
    formData.append('account_id', newTransaction.account_id);
    formData.append('description', newTransaction.description);
    formData.append('outflow', newTransaction.outflow);
    formData.append('inflow', newTransaction.inflow);

    try {
      const result = await createTransaction(formData);
      if (result.error) {
        alert(result.error);
      } else {
        handleCancelNew();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (transaction: TransactionWithDetails) => {
    const amount = transaction.amount;
    const isExpense = transaction.type === 'expense' || amount < 0;
    const isIncome = transaction.type === 'income' || amount > 0;
    
    setEditingTransaction({
      id: transaction.id,
      date: formatDateForInput(transaction.date),
      payee: transaction.payee,
      account_id: transaction.account_id,
      description: transaction.description || '',
      outflow: isExpense ? Math.abs(amount).toString() : '',
      inflow: isIncome ? Math.abs(amount).toString() : '',
    });
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    if (!editingTransaction.payee || !editingTransaction.account_id) {
      alert('Please fill in at least the payee and account');
      return;
    }

    if (!editingTransaction.outflow && !editingTransaction.inflow) {
      alert('Please enter either an outflow or inflow amount');
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append('id', editingTransaction.id);
    formData.append('date', editingTransaction.date);
    formData.append('payee', editingTransaction.payee);
    formData.append('account_id', editingTransaction.account_id);
    formData.append('description', editingTransaction.description);
    formData.append('outflow', editingTransaction.outflow);
    formData.append('inflow', editingTransaction.inflow);

    try {
      const result = await updateTransaction(formData);
      if (result.error) {
        alert(result.error);
      } else {
        setEditingTransaction(null);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (transactionId: string, payee: string) => {
    if (!confirm(`Are you sure you want to delete transaction "${payee}"?`)) {
      return;
    }

    setIsDeleting(transactionId);
    try {
      await deleteTransaction(transactionId);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow">
      {/* Add Transaction Button at top */}
      {!isAddingNew && (
        <div className="p-4 border-b bg-slate-50">
          <button
            onClick={handleAddNewRow}
            className="w-full py-2 px-4 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm border-2 border-dashed border-blue-300 hover:border-blue-400"
          >
            + Add Transaction
          </button>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full border-spacing-0 border-separate">
          <thead>
            <tr className="text-slate-500 text-xs uppercase bg-slate-50">
              <th className="text-left font-medium py-3 px-4 border-b">Date</th>
              <th className="text-left font-medium py-3 px-4 border-b">Payee</th>
              <th className="text-left font-medium py-3 px-4 border-b">Account</th>
              <th className="text-left font-medium py-3 px-4 border-b">Memo</th>
              <th className="text-right font-medium py-3 px-4 border-b">Outflow</th>
              <th className="text-right font-medium py-3 px-4 border-b">Inflow</th>
              <th className="text-center font-medium py-3 px-4 border-b w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Add New Transaction Row */}
            {isAddingNew && (
              <tr ref={newRowRef} className="bg-blue-50 border-l-4 border-l-blue-600">
                <td className="py-2 px-4 border-b">
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="text"
                    value={newTransaction.payee}
                    onChange={(e) => setNewTransaction({ ...newTransaction, payee: e.target.value })}
                    placeholder="Payee name"
                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <select
                    value={newTransaction.account_id}
                    onChange={(e) => setNewTransaction({ ...newTransaction, account_id: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingAccounts}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="text"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    placeholder="Optional memo"
                    className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTransaction.outflow}
                    onChange={(e) => setNewTransaction({ ...newTransaction, outflow: e.target.value, inflow: '' })}
                    placeholder="0.00"
                    className="w-full px-2 py-1 border rounded text-sm text-right text-red-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTransaction.inflow}
                    onChange={(e) => setNewTransaction({ ...newTransaction, inflow: e.target.value, outflow: '' })}
                    placeholder="0.00"
                    className="w-full px-2 py-1 border rounded text-sm text-right text-green-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 border-b">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={handleSaveNew}
                      disabled={isSaving}
                      className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                      title="Save transaction"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={handleCancelNew}
                      disabled={isSaving}
                      className="p-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded transition-colors disabled:opacity-50"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing Transactions */}
            {transactions.map((transaction) => {
              const amount = transaction.amount;
              const isExpense = transaction.type === 'expense' || amount < 0;
              const isIncome = transaction.type === 'income' || amount > 0;
              const outflow = isExpense ? Math.abs(amount) : 0;
              const inflow = isIncome ? Math.abs(amount) : 0;
              const isEditing = editingTransaction?.id === transaction.id;
              
              if (isEditing) {
                return (
                  <tr key={transaction.id} className="bg-yellow-50 border-l-4 border-l-yellow-600">
                    <td className="py-2 px-4 border-b">
                      <input
                        type="date"
                        value={editingTransaction.date}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="text"
                        value={editingTransaction.payee}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, payee: e.target.value })}
                        placeholder="Payee name"
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <select
                        value={editingTransaction.account_id}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, account_id: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="text"
                        value={editingTransaction.description}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                        placeholder="Optional memo"
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingTransaction.outflow}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, outflow: e.target.value, inflow: '' })}
                        placeholder="0.00"
                        className="w-full px-2 py-1 border rounded text-sm text-right text-red-600 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingTransaction.inflow}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, inflow: e.target.value, outflow: '' })}
                        placeholder="0.00"
                        className="w-full px-2 py-1 border rounded text-sm text-right text-green-600 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                          title="Save changes"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="p-1.5 bg-slate-400 hover:bg-slate-500 text-white rounded transition-colors disabled:opacity-50"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }
              
              return (
                <tr 
                  key={transaction.id} 
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 border-b font-medium text-slate-600 text-sm">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="py-3 px-4 border-b font-medium text-sm">
                    {transaction.payee}
                  </td>
                  <td className="py-3 px-4 border-b text-slate-600 text-sm">
                    {transaction.accounts?.name || 'Unknown'}
                  </td>
                  <td className="py-3 px-4 border-b text-slate-500 text-sm">
                    {transaction.description || '—'}
                  </td>
                  <td className="py-3 px-4 border-b text-right tabular-nums text-sm">
                    {outflow > 0 ? (
                      <span className="text-red-600 font-semibold">
                        {formatter.format(outflow)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-b text-right tabular-nums text-sm">
                    {inflow > 0 ? (
                      <span className="text-green-600 font-semibold">
                        {formatter.format(inflow)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit transaction"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id, transaction.payee)}
                        disabled={isDeleting === transaction.id}
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                        title="Delete transaction"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Empty state */}
            {transactions.length === 0 && !isAddingNew && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No transactions yet. Click &quot;Add Transaction&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
