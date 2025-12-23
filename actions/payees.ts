'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPayee(name: string) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  if (!name || name.trim() === '') {
    throw new Error('Payee name is required');
  }

  // Check if payee with this name already exists for this user
  const { data: existingPayee } = await supabase
    .from('payees')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name.trim())
    .is('deleted_at', null)
    .single();

  if (existingPayee) {
    throw new Error('A payee with this name already exists');
  }

  // Insert the new payee
  const { data, error } = await supabase
    .from('payees')
    .insert({
      name: name.trim(),
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payee:', error);
    throw new Error('Failed to create payee');
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/payees');
  return data;
}

export async function getPayees() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from('payees')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching payees:', error);
    return [];
  }

  return data || [];
}

export async function updatePayee(id: string, name: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  if (!name || name.trim() === '') {
    throw new Error('Payee name is required');
  }

  // Check if another payee with this name already exists for this user
  const { data: existingPayee } = await supabase
    .from('payees')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name.trim())
    .neq('id', id)
    .is('deleted_at', null)
    .single();

  if (existingPayee) {
    throw new Error('A payee with this name already exists');
  }

  // Update the payee
  const { data, error } = await supabase
    .from('payees')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating payee:', error);
    throw new Error('Failed to update payee');
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/payees');
  return data;
}

export async function deletePayee(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('payees')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting payee:', error);
    throw new Error('Failed to delete payee');
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/payees');
  return { success: true };
}
