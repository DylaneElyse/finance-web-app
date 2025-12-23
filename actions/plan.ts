"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPlanData(monthYear?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // FIX: PostgreSQL DATE needs YYYY-MM-DD format
  const rawMonth = monthYear || new Date().toISOString().slice(0, 7);
  const dbMonthDate = `${rawMonth}-01`;

  // 1. Get Categories & Subcategories (excluding "Ignore" category)
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select(`id, name, subcategories ( id, name )`)
    .eq('user_id', user.id)
    .is("deleted_at", null)
    .neq('name', 'Ignore')
    .order("name");
  if (catError) throw catError;

  // 2. Get Monthly Budgets for THIS month (including target_amount)
  const { data: monthlyBudgets } = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("user_id", user.id)
    .eq("month_year", dbMonthDate);

  // 3. Get Spent amounts (Transactions for THIS month)
  const nextMonthDate = new Date(dbMonthDate);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  
  const { data: transactions } = await supabase
    .from("transactions")
    .select("subcategory_id, amount, type")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("date", dbMonthDate)
    .lt("date", nextMonthDate.toISOString().split('T')[0]);

  // Sum up transactions by subcategory
  const spentMap: Record<string, number> = {};
  transactions?.forEach(t => {
    const val = Math.abs(Number(t.amount));
    if (t.type === 'expense' && t.subcategory_id) {
      spentMap[t.subcategory_id] = (spentMap[t.subcategory_id] || 0) + val;
    }
  });

  // 4. Get goals
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq('user_id', user.id)
    .is("deleted_at", null)
    .eq("is_completed", false);

  type Goal = {
    id: string;
    name: string;
    target_amount: number;
    target_date: string;
    subcategory_id?: string;
  };

  const goalsMap: Record<string, Goal> = {};
  goals?.forEach(g => {
    if (g.subcategory_id) {
      goalsMap[g.subcategory_id] = g;
    }
  });

  // 5. Ready to Assign Calculation (only include chequing and savings, exclude credit cards and liabilities)
  const { data: accounts } = await supabase
    .from("accounts")
    .select("current_balance, type")
    .eq('user_id', user.id)
    .is("deleted_at", null)
    .in("type", ["chequing", "savings"]);
  const totalCash = accounts?.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0) || 0;

  const { data: allBudgets } = await supabase
    .from("monthly_budgets")
    .select("assigned_amount")
    .eq('user_id', user.id);
  const totalAssigned = allBudgets?.reduce((sum, b) => sum + Number(b.assigned_amount || 0), 0) || 0;

  // 6. Organize Data
  type Subcategory = {
    id: string;
    name: string;
  };

  const categoryData = categories?.map((cat) => ({
    id: cat.id,
    name: cat.name,
    subcategories: cat.subcategories.map((sub: Subcategory) => {
      const budget = monthlyBudgets?.find(b => b.subcategory_id === sub.id);
      const planned = Number(budget?.target_amount || 0);
      const assigned = Number(budget?.assigned_amount || 0);
      const spent = spentMap[sub.id] || 0;
      const goal = goalsMap[sub.id];
      
      return {
        id: sub.id,
        name: sub.name,
        planned,
        assigned,
        spent,
        available: assigned - spent,
        goal: goal ? {
          id: goal.id,
          name: goal.name,
          target_amount: goal.target_amount,
          target_date: goal.target_date,
          current_saved: assigned,
        } : null,
      };
    })
  }));

  return {
    readyToAssign: totalCash - totalAssigned,
    totalCash,
    totalAssigned,
    monthYear: rawMonth,
    categories: categoryData || [],
  };
}

export async function updateAssignedAmount(
  subcategoryId: string,
  monthYear: string,
  newAmount: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const dbMonthDate = `${monthYear}-01`;

  // Use UPSERT: It updates if exists, inserts if not
  const { error } = await supabase
    .from("monthly_budgets")
    .upsert({
      user_id: user.id,
      subcategory_id: subcategoryId,
      month_year: dbMonthDate,
      assigned_amount: newAmount,
    }, { 
      onConflict: 'user_id, subcategory_id, month_year',
      ignoreDuplicates: false 
    });

  if (error) throw error;
  revalidatePath("/protected/plan");
  return { success: true };
}
