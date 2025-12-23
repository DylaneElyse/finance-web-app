'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'User not authenticated' };
  }

  const date = formData.get('date') as string;
  const payeeName = formData.get('payee') as string;
  const accountId = formData.get('account_id') as string;
  const subcategoryId = formData.get('subcategory_id') as string || null;
  const description = formData.get('description') as string || null;
  const outflow = parseFloat(formData.get('outflow') as string) || 0;
  const inflow = parseFloat(formData.get('inflow') as string) || 0;

  // Determine type and amount based on outflow/inflow
  let type: 'income' | 'expense' | 'transfer';
  let amount: number;

  if (inflow > 0) {
    type = 'income';
    amount = inflow; // Positive for income
  } else if (outflow > 0) {
    type = 'expense';
    amount = -outflow; // Negative for expenses
  } else {
    return { error: 'Please enter either an inflow or inflow amount' };
  }

  // Check if payee exists, if not create it
  const { data: existingPayee } = await supabase
    .from('payees')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', payeeName)
    .is('deleted_at', null)
    .single();

  if (!existingPayee) {
    // Create new payee
    await supabase
      .from('payees')
      .insert({
        user_id: user.id,
        name: payeeName,
      });
  }

  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      date,
      payee: payeeName,
      account_id: accountId,
      subcategory_id: subcategoryId,
      description,
      amount,
      type,
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/accounts');
  return { success: true };
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'User not authenticated' };
  }

  const id = formData.get('id') as string;
  const date = formData.get('date') as string;
  const payeeName = formData.get('payee') as string;
  const accountId = formData.get('account_id') as string;
  const subcategoryId = formData.get('subcategory_id') as string || null;
  const description = formData.get('description') as string || null;
  const outflow = parseFloat(formData.get('outflow') as string) || 0;
  const inflow = parseFloat(formData.get('inflow') as string) || 0;

  // Determine type and amount based on outflow/inflow
  let type: 'income' | 'expense' | 'transfer';
  let amount: number;

  if (inflow > 0) {
    type = 'income';
    amount = inflow;
  } else if (outflow > 0) {
    type = 'expense';
    amount = -outflow; // Store expenses as negative
  } else {
    return { error: 'Please enter either an inflow or outflow amount' };
  }

  // Check if payee exists, if not create it
  const { data: existingPayee } = await supabase
    .from('payees')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', payeeName)
    .is('deleted_at', null)
    .single();

  if (!existingPayee) {
    // Create new payee
    await supabase
      .from('payees')
      .insert({
        user_id: user.id,
        name: payeeName,
      });
  }

  const { error } = await supabase
    .from('transactions')
    .update({
      date,
      payee: payeeName,
      account_id: accountId,
      subcategory_id: subcategoryId,
      description,
      amount,
      type,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/accounts');
  return { success: true };
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', transactionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/protected/transactions');
  return { success: true };
}
