'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCategory(name: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  if (!name || name.trim() === '') {
    throw new Error('Category name is required');
  }

  // Check if category with this name already exists for this user
  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name.trim())
    .is('deleted_at', null)
    .single();

  if (existingCategory) {
    throw new Error('A category with this name already exists');
  }

  // Insert the new category
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: name.trim(),
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category');
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/categories');
  revalidatePath('/protected/plan');
  return data;
}

export async function createSubcategory(name: string, categoryId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  if (!name || name.trim() === '') {
    throw new Error('Subcategory name is required');
  }

  if (!categoryId) {
    throw new Error('Parent category is required');
  }

  // Check if subcategory with this name already exists in this category for this user
  const { data: existingSubcategory } = await supabase
    .from('subcategories')
    .select('id')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .eq('name', name.trim())
    .is('deleted_at', null)
    .single();

  if (existingSubcategory) {
    throw new Error('A subcategory with this name already exists in this category');
  }

  // Insert the new subcategory
  const { data, error } = await supabase
    .from('subcategories')
    .insert({
      name: name.trim(),
      category_id: categoryId,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating subcategory:', error);
    throw new Error('Failed to create subcategory');
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/categories');
  revalidatePath('/protected/plan');
  return data;
}

export async function getCategoriesWithSubcategories() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      subcategories (
        id,
        name,
        created_at,
        deleted_at
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .order('name', { foreignTable: 'subcategories', ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  // Filter out deleted subcategories
  type SubcategoryWithDeleted = {
    id: string;
    name: string;
    created_at: string | null;
    deleted_at: string | null;
  };

  const filteredData = data?.map(category => ({
    ...category,
    subcategories: category.subcategories?.filter((sub: SubcategoryWithDeleted) => !sub.deleted_at) || []
  }));

  return filteredData || [];
}

export async function updateCategory(id: string, name: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  if (!name || name.trim() === '') {
    throw new Error('Category name is required');
  }

  // Check if another category with this name already exists for this user
  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name.trim())
    .neq('id', id)
    .is('deleted_at', null)
    .single();

  if (existingCategory) {
    throw new Error('A category with this name already exists');
  }

  // Update the category
  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw new Error('Failed to update category');
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/categories');
  revalidatePath('/protected/plan');
  return data;
}

export async function updateSubcategory(id: string, name: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  if (!name || name.trim() === '') {
    throw new Error('Subcategory name is required');
  }

  // Get the subcategory's category_id
  const { data: subcategory } = await supabase
    .from('subcategories')
    .select('category_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!subcategory) {
    throw new Error('Subcategory not found');
  }

  // Check if another subcategory with this name already exists in the same category
  const { data: existingSubcategory } = await supabase
    .from('subcategories')
    .select('id')
    .eq('user_id', user.id)
    .eq('category_id', subcategory.category_id)
    .eq('name', name.trim())
    .neq('id', id)
    .is('deleted_at', null)
    .single();

  if (existingSubcategory) {
    throw new Error('A subcategory with this name already exists in this category');
  }

  // Update the subcategory
  const { data, error } = await supabase
    .from('subcategories')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating subcategory:', error);
    throw new Error('Failed to update subcategory');
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/categories');
  revalidatePath('/protected/plan');
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Soft delete the category
  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting category:', error);
    throw new Error('Failed to delete category');
  }

  // Also soft delete all subcategories in this category
  await supabase
    .from('subcategories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('category_id', id)
    .eq('user_id', user.id);

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/categories');
  revalidatePath('/protected/plan');
  return { success: true };
}

export async function deleteSubcategory(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized');
  }

  // Soft delete the subcategory
  const { error } = await supabase
    .from('subcategories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting subcategory:', error);
    throw new Error('Failed to delete subcategory');
  }

  revalidatePath('/protected/transactions');
  revalidatePath('/protected/settings/categories');
  revalidatePath('/protected/plan');
  return { success: true };
}
