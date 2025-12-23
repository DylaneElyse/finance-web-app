import { createClient } from '@/lib/supabase/server';
import { TransactionsTable } from '@/components/transactions-table';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function AccountTransactionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the account details
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (accountError || !account) {
    notFound();
  }

  // Fetch transactions for this specific account
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      *,
      accounts!transactions_account_id_fkey (
        id,
        name,
        type
      )
    `)
    .eq('account_id', id)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading transactions:', error);
    return <div className="text-red-500 p-4">Error loading transactions: {error.message}</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex-1 flex flex-col w-full px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/protected/accounts"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-2"
        >
          <ChevronLeft size={16} />
          Back to Accounts
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{account.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {account.type.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Current Balance</p>
            <p className={`text-2xl font-bold ${
              (account.current_balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(account.current_balance ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p><strong>Debug:</strong> Found {transactions?.length || 0} transaction(s) for account {account.id}</p>
        </div>
      )}

      {/* Transactions Table */}
      <TransactionsTable 
        transactions={transactions || []} 
        defaultAccountId={account.id}
      />
    </div>
  );
}
