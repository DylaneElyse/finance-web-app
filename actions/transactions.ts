'use server';

import { createClient } from '@/lib/supabase/server';

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
  let subcategoryId = formData.get('subcategory_id') as string || null;
  const description = formData.get('description') as string || null;
  const outflow = parseFloat(formData.get('outflow') as string) || 0;
  const inflow = parseFloat(formData.get('inflow') as string) || 0;

  // Determine type and amount based on outflow/inflow
  let type: 'income' | 'expense' | 'transfer';
  let amount: number;

  if (inflow > 0) {
    type = 'income';
    amount = inflow; // Positive for income
    
    // Allow user to manually select category (e.g., Account Transfer)
    // If no category selected, default to Ready to Assign
    if (!subcategoryId) {
      const { data: readyToAssign } = await supabase
        .from('subcategories')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'Ready to Assign')
        .is('deleted_at', null)
        .single();
      
      if (readyToAssign) {
        subcategoryId = readyToAssign.id;
      }
    }
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

  // Client-side components handle their own state updates
  // No need to revalidate and cause page reload
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
  let subcategoryId = formData.get('subcategory_id') as string || null;
  const description = formData.get('description') as string || null;
  const outflow = parseFloat(formData.get('outflow') as string) || 0;
  const inflow = parseFloat(formData.get('inflow') as string) || 0;

  // Determine type and amount based on outflow/inflow
  let type: 'income' | 'expense' | 'transfer';
  let amount: number;

  if (inflow > 0) {
    type = 'income';
    amount = inflow;
    
    // Allow user to manually select category (e.g., Account Transfer)
    // If no category selected, default to Ready to Assign
    if (!subcategoryId) {
      const { data: readyToAssign } = await supabase
        .from('subcategories')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'Ready to Assign')
        .is('deleted_at', null)
        .single();
      
      if (readyToAssign) {
        subcategoryId = readyToAssign.id;
      }
    }
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

  // Client-side components handle their own state updates
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

  // Client-side components handle their own state updates
  return { success: true };
}

// PHASE 6: Get deleted transactions for recovery
export async function getDeletedTransactions() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'User not authenticated' };
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(50); // Limit to last 50 deleted items

  if (error) {
    return { error: error.message };
  }

  return { data: data || [] };
}

// PHASE 6: Restore a deleted transaction
export async function restoreTransaction(transactionId: string) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'User not authenticated' };
  }

  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: null })
    .eq('id', transactionId)
    .eq('user_id', user.id); // Security: only restore own transactions

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// PHASE 6: Permanently delete a transaction
export async function permanentlyDeleteTransaction(transactionId: string) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'User not authenticated' };
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', user.id); // Security: only delete own transactions

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
