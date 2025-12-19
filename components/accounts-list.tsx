import { createClient } from '@/lib/supabase/server';
import { AccountsTable } from './accounts-table';

export async function AccountsList() {
  const supabase = await createClient();

  // Fetch data from Supabase
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .is('deleted_at', null) // Filter out soft-deleted accounts
    .order('name', { ascending: true });

  if (error) {
    return <div className="text-red-500 p-4">Error loading accounts: {error.message}</div>;
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-xl text-slate-500">
        No accounts found. Add one to get started.
      </div>
    );
  }

  return <AccountsTable accounts={accounts} />;
}
