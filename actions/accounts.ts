'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createAccount(formData: FormData) {
  const supabase = await createClient();

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'User not authenticated' };
  }

  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const startingBalance = parseFloat(formData.get('starting_balance') as string) || 0;

  const { error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name,
      type,
      starting_balance: startingBalance,
      current_balance: startingBalance,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/protected/accounts');
  return { success: true };
}

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const startingBalance = parseFloat(formData.get('starting_balance') as string) || 0;

  const { error } = await supabase
    .from('accounts')
    .update({
      name,
      type,
      starting_balance: startingBalance,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/protected/accounts');
  return { success: true };
}

export async function deleteAccount(accountId: string) {
  const supabase = await createClient();

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', accountId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/protected/accounts');
  return { success: true };
}
