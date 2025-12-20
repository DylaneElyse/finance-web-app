import { createClient } from '@/lib/supabase/server';
import { TransactionsTable } from './transactions-table';

export async function TransactionsList() {
  const supabase = await createClient();

  // Fetch transactions with related account information
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
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="text-red-500 p-4">Error loading transactions: {error.message}</div>;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-xl text-slate-500">
        No transactions found. Add one to get started.
      </div>
    );
  }

  return <TransactionsTable transactions={transactions} />;
}
