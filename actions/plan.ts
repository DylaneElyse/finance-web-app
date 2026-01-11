"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPlanData(monthYear?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // 1. Setup Dates (PostgreSQL DATE needs YYYY-MM-DD)
  const rawMonth = monthYear || new Date().toISOString().slice(0, 7);
  const dbMonthDate = `${rawMonth}-01`;
  
  const nextMonthDateObj = new Date(dbMonthDate);
  nextMonthDateObj.setMonth(nextMonthDateObj.getMonth() + 1);
  const nextMonthDbDate = nextMonthDateObj.toISOString().split('T')[0];

  // 2. Fetch Categories & Subcategories (Exclude "Ignore" from UI)
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select(`id, name, subcategories ( id, name )`)
    .eq('user_id', user.id)
    .is("deleted_at", null)
    .neq('name', 'Ignore')
    .order("name");
  if (catError) throw catError;

  // 3. Fetch Budgets (Current month only)
  const { data: budgets } = await supabase
    .from("monthly_budgets")
    .select("*")
    .eq("user_id", user.id)
    .eq("month_year", dbMonthDate);

  const monthlyBudgets = budgets || [];

  // 4. Fetch Transactions (ALL TIME for proper carryover, and current month)
  const { data: allTransactions } = await supabase
    .from("transactions")
    .select("subcategory_id, amount, type, date")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  // Spent Maps - Current month and All time up to (but not including) current month
  const spentMap: Record<string, number> = {};
  const allTimeSpentBeforeCurrentMonth: Record<string, number> = {};

  allTransactions?.forEach(t => {
    const val = Math.abs(Number(t.amount));
    const isCurrent = t.date >= dbMonthDate && t.date < nextMonthDbDate;
    const isBeforeCurrent = t.date < dbMonthDate;

    if (t.subcategory_id) {
      if (t.type === 'expense') {
        if (isCurrent) {
          spentMap[t.subcategory_id] = (spentMap[t.subcategory_id] || 0) + val;
        }
        if (isBeforeCurrent) {
          allTimeSpentBeforeCurrentMonth[t.subcategory_id] = (allTimeSpentBeforeCurrentMonth[t.subcategory_id] || 0) + val;
        }
      } else if (t.type === 'income') {
        if (isCurrent) {
          spentMap[t.subcategory_id] = (spentMap[t.subcategory_id] || 0) - val;
        }
        if (isBeforeCurrent) {
          allTimeSpentBeforeCurrentMonth[t.subcategory_id] = (allTimeSpentBeforeCurrentMonth[t.subcategory_id] || 0) - val;
        }
      }
    }
  });

// 5. READY TO ASSIGN (RTA) CALCULATION - Monthly View with Carryover

// A. Find IDs of Inflow subcategories
const { data: inflowSubs } = await supabase
  .from("subcategories")
  .select("id")
  .eq("user_id", user.id)
  .in("name", ["Ready to Assign", "Starting Balance"]);
const inflowIds = inflowSubs?.map(s => s.id) || [];

// B. Sum INCOME transactions from Cash Accounts (Chequing/Savings) - current month only
// Exclude Account Transfers as they just move money around and don't create new income
let totalInflowCurrentMonth = 0;
if (inflowIds.length > 0) {
  const { data, error: inflowError } = await supabase
    .from("transactions")
    .select(`
      amount,
      date,
      payee,
      accounts!transactions_account_id_fkey ( type )
    `)
    .eq("user_id", user.id)
    .eq("type", "income")  // Only income transactions
    .neq("payee", "Account Transfer")  // Exclude account transfers
    .is("deleted_at", null)
    .in("subcategory_id", inflowIds)
    .in("accounts.type", ["chequing", "savings"])
    .gte("date", dbMonthDate)
    .lt("date", nextMonthDbDate);

  if (inflowError) {
    console.error("Income Calculation Error:", inflowError);
  } else {
    const incomeTxns = (data || []) as Array<{ amount: number; date: string }>;
    totalInflowCurrentMonth = incomeTxns.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }
}

// C. Get all assigned records
const { data: allAssignedRecords } = await supabase
  .from("monthly_budgets")
  .select("assigned_amount, subcategory_id, month_year")
  .eq("user_id", user.id);

let totalAssignedCurrentMonth = 0;

allAssignedRecords?.forEach(b => {
  const amount = Number(b.assigned_amount || 0);
  if (!isNaN(amount) && b.month_year === dbMonthDate) {
    totalAssignedCurrentMonth += amount;
  }
});

// D. Calculate Carryover as sum of all category carryover amounts (calculated below in assembly)
// This will be calculated after we process all subcategories
let carryoverFromCategories = 0;

  // 6. GOALS
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq('user_id', user.id)
    .is("deleted_at", null)
    .eq("is_completed", false);

  // 8. ASSEMBLE DATA
  interface Subcategory {
    id: string;
    name: string;
  }

  const categoryData = categories?.map((cat) => ({
    id: cat.id,
    name: cat.name,
    subcategories: cat.subcategories.map((sub: Subcategory) => {
      const budget = monthlyBudgets.find(b => b.subcategory_id === sub.id);
      const goal = goals?.find(g => g.subcategory_id === sub.id);
      
      const assigned = Number(budget?.assigned_amount || 0);
      const spent = spentMap[sub.id] || 0;

      // Carryover Engine - Best Practice: Carry over BOTH positive AND negative balances
      // This enforces accountability and prevents hiding overspending
      // Calculate: Total ALL-TIME Assigned - Total ALL-TIME Spent (before current month)
      const allTimeAssignedBeforeCurrentMonth = allAssignedRecords?.filter(b => b.subcategory_id === sub.id && b.month_year < dbMonthDate)
        .reduce((sum, b) => sum + Number(b.assigned_amount || 0), 0) || 0;
      const allTimeSpentBeforeCurrent = allTimeSpentBeforeCurrentMonth[sub.id] || 0;
      
      // Carryover = Everything assigned before this month - Everything spent before this month
      const carryover = allTimeAssignedBeforeCurrentMonth - allTimeSpentBeforeCurrent;

      // Calculate In/Out for current month
      const currentMonthTxns = allTransactions?.filter(t => 
        t.subcategory_id === sub.id && 
        t.date >= dbMonthDate && 
        t.date < nextMonthDbDate
      ) || [];
      
      const outflow = currentMonthTxns
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => {
          const amt = Number(t.amount);
          return sum + (isNaN(amt) ? 0 : Math.abs(amt));
        }, 0);
      
      const inflow = currentMonthTxns
        .filter(t => t.type === 'income')
        .reduce((sum, t) => {
          const amt = Number(t.amount);
          return sum + (isNaN(amt) ? 0 : Math.abs(amt));
        }, 0);

      // Available = Carryover + Assigned this month - Spent this month
      let available = carryover + assigned - spent;
      // Fix floating-point precision issues: treat values < 0.01 cents as zero
      available = Math.abs(available) < 0.0001 ? 0 : available;
      
      // Add to total carryover
      carryoverFromCategories += carryover;

      // Planned Hierarchy Logic
      let planned = 0;
      if (budget?.target_amount && Number(budget.target_amount) > 0) {
        planned = Number(budget.target_amount);
      } else if (goal && goal.target_date) {
        const targetDate = new Date(goal.target_date);
        const currentDate = new Date(dbMonthDate);
        const monthsRemaining = Math.max(1, 
          (targetDate.getFullYear() - currentDate.getFullYear()) * 12 +
          (targetDate.getMonth() - currentDate.getMonth()) + 1
        );
        const totalSavedSoFar = allAssignedRecords?.filter(b => b.subcategory_id === sub.id)
          .reduce((sum, b) => sum + Number(b.assigned_amount || 0), 0) || 0;
        planned = Math.max(0, Math.ceil((Number(goal.target_amount) - totalSavedSoFar) / monthsRemaining));
      }

      return {
        id: sub.id,
        name: sub.name,
        planned,
        assigned,
        spent,
        available,
        carryover,
        inflow,
        outflow,
        goal: goal ? {
          id: goal.id,
          name: goal.name,
          target_amount: goal.target_amount,
          target_date: goal.target_date,
          current_saved: allAssignedRecords?.filter(b => b.subcategory_id === sub.id)
            .reduce((sum, b) => sum + Number(b.assigned_amount || 0), 0) || 0,
        } : null,
      };
    })
  }));

  // Calculate Ready to Assign: Carryover + Income This Month - Assigned This Month
  const readyToAssign = carryoverFromCategories + totalInflowCurrentMonth - totalAssignedCurrentMonth;

  console.log("Final Calculations:", {
    carryoverFromCategories,
    totalInflowCurrentMonth,
    totalAssignedCurrentMonth,
    readyToAssign
  });

  return {
    readyToAssign,
    carryover: carryoverFromCategories,
    totalCash: totalInflowCurrentMonth,
    totalAssigned: totalAssignedCurrentMonth,
    monthYear: rawMonth,
    categories: categoryData || [],
  };
}

/** 
 * MUTATIONS 
 */

export async function updateAssignedAmount(subcategoryId: string, monthYear: string, newAmount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase.from("monthly_budgets").upsert({
    user_id: user.id,
    subcategory_id: subcategoryId,
    month_year: `${monthYear}-01`,
    assigned_amount: newAmount,
  }, { onConflict: 'user_id, subcategory_id, month_year' });

  if (error) throw error;
  revalidatePath("/protected/plan");
  return { success: true };
}

export async function moveMoneyBetweenSubcategories(
  fromSubcategoryId: string,
  toSubcategoryId: string,
  amount: number,
  monthYear: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const dbMonthDate = `${monthYear}-01`;

  // Get current assigned amounts for both subcategories
  const { data: budgets } = await supabase
    .from("monthly_budgets")
    .select("subcategory_id, assigned_amount")
    .eq("user_id", user.id)
    .eq("month_year", dbMonthDate)
    .in("subcategory_id", [fromSubcategoryId, toSubcategoryId]);

  const fromBudget = budgets?.find(b => b.subcategory_id === fromSubcategoryId);
  const toBudget = budgets?.find(b => b.subcategory_id === toSubcategoryId);

  const fromAmount = Number(fromBudget?.assigned_amount || 0);
  const toAmount = Number(toBudget?.assigned_amount || 0);

  // Update both budgets
  const updates = [
    {
      user_id: user.id,
      subcategory_id: fromSubcategoryId,
      month_year: dbMonthDate,
      assigned_amount: fromAmount - amount,
    },
    {
      user_id: user.id,
      subcategory_id: toSubcategoryId,
      month_year: dbMonthDate,
      assigned_amount: toAmount + amount,
    },
  ];

  const { error } = await supabase
    .from("monthly_budgets")
    .upsert(updates, { onConflict: 'user_id, subcategory_id, month_year' });

  if (error) throw error;
  revalidatePath("/protected/plan");
  return { success: true };
}

export async function upsertMonthlyBudget(data: {
  subcategoryId: string;
  monthYear: string;
  assignedAmount?: number;
  targetAmount?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const upsertData: {
    user_id: string;
    subcategory_id: string;
    month_year: string;
    assigned_amount?: number;
    target_amount?: number;
    notes?: string;
  } = {
    user_id: user.id,
    subcategory_id: data.subcategoryId,
    month_year: `${data.monthYear}-01`,
  };

  if (data.assignedAmount !== undefined) upsertData.assigned_amount = data.assignedAmount;
  if (data.targetAmount !== undefined) upsertData.target_amount = data.targetAmount;
  if (data.notes !== undefined) upsertData.notes = data.notes;

  const { error } = await supabase.from("monthly_budgets").upsert(upsertData, { 
    onConflict: 'user_id, subcategory_id, month_year' 
  });

  if (error) throw error;
  revalidatePath("/protected/plan");
  return { success: true };
}

export async function upsertGoal(data: {
  goalId?: string;
  subcategoryId: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const upsertData: {
    id?: string;
    user_id: string;
    subcategory_id: string;
    name: string;
    target_amount: number;
    target_date?: string;
    is_completed: boolean;
  } = {
    user_id: user.id,
    subcategory_id: data.subcategoryId,
    name: data.name,
    target_amount: data.targetAmount,
    is_completed: false,
  };

  if (data.goalId) upsertData.id = data.goalId;
  if (data.targetDate) upsertData.target_date = data.targetDate;

  const { error } = await supabase.from("goals").upsert(upsertData);

  if (error) throw error;
  revalidatePath("/protected/plan");
  return { success: true };
}

export async function getSubcategoryTransactions(subcategoryId: string, monthYear: string, limit: number = 5) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const dbMonthDate = `${monthYear}-01`;
  const nextMonthDate = new Date(dbMonthDate);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

  const { data, error } = await supabase
    .from("transactions")
    .select("id, date, payee, amount, type, description, account_id")
    .eq("user_id", user.id)
    .eq("subcategory_id", subcategoryId)
    .is("deleted_at", null)
    .gte("date", dbMonthDate)
    .lt("date", nextMonthDate.toISOString().split('T')[0])
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getMonthlyBudgetNotes(subcategoryId: string, monthYear: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabase
    .from("monthly_budgets")
    .select("notes, target_amount")
    .eq("user_id", user.id)
    .eq("subcategory_id", subcategoryId)
    .eq("month_year", `${monthYear}-01`)
    .maybeSingle();

  if (error) throw error;
  return data || { notes: null, target_amount: null };
}

// "use server";

// import { createClient } from "@/lib/supabase/server";

// export async function getPlanData(monthYear?: string) {
//   const supabase = await createClient();

//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error("User not authenticated");

//   // FIX: PostgreSQL DATE needs YYYY-MM-DD format
//   const rawMonth = monthYear || new Date().toISOString().slice(0, 7);
//   const dbMonthDate = `${rawMonth}-01`;

//   // 1. Get Categories & Subcategories (excluding "Ignore" category)
//   const { data: categories, error: catError } = await supabase
//     .from("categories")
//     .select(`id, name, subcategories ( id, name )`)
//     .eq('user_id', user.id)
//     .is("deleted_at", null)
//     .neq('name', 'Ignore')
//     .order("name");
//   if (catError) throw catError;

//   // 2. Get Monthly Budgets for THIS month (including target_amount)
//   const { data: monthlyBudgets } = await supabase
//     .from("monthly_budgets")
//     .select("*")
//     .eq("user_id", user.id)
//     .eq("month_year", dbMonthDate);

//   // 3. Get Spent amounts (Transactions for THIS month)
//   const nextMonthDate = new Date(dbMonthDate);
//   nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  
//   const { data: transactions } = await supabase
//     .from("transactions")
//     .select("subcategory_id, amount, type")
//     .eq("user_id", user.id)
//     .is("deleted_at", null)
//     .gte("date", dbMonthDate)
//     .lt("date", nextMonthDate.toISOString().split('T')[0]);

//   // Sum up transactions by subcategory
//   // PHASE 1 ENHANCEMENT: Income transactions with subcategory_id REDUCE spent (refunds/rebates)
//   const spentMap: Record<string, number> = {};
//   transactions?.forEach(t => {
//     const val = Math.abs(Number(t.amount));
//     if (t.subcategory_id) {
//       if (t.type === 'expense') {
//         // Expenses increase spent
//         spentMap[t.subcategory_id] = (spentMap[t.subcategory_id] || 0) + val;
//       } else if (t.type === 'income') {
//         // Income decreases spent (refunds/rebates)
//         spentMap[t.subcategory_id] = (spentMap[t.subcategory_id] || 0) - val;
//       }
//     }
//   });

//   // 4. Get goals
//   const { data: goals } = await supabase
//     .from("goals")
//     .select("*")
//     .eq('user_id', user.id)
//     .is("deleted_at", null)
//     .eq("is_completed", false);

//   type Goal = {
//     id: string;
//     name: string;
//     target_amount: number;
//     target_date: string;
//     subcategory_id?: string;
//   };

//   const goalsMap: Record<string, Goal> = {};
//   goals?.forEach(g => {
//     if (g.subcategory_id) {
//       goalsMap[g.subcategory_id] = g;
//     }
//   });

//   // 5. Ready to Assign Calculation
//   // Total Cash = only chequing and savings accounts
//   const { data: cashAccounts } = await supabase
//     .from("accounts")
//     .select("current_balance, type")
//     .eq('user_id', user.id)
//     .is("deleted_at", null)
//     .in("type", ["chequing", "savings"]);
//   const totalCash = cashAccounts?.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0) || 0;

//   const { data: allBudgets } = await supabase
//     .from("monthly_budgets")
//     .select("assigned_amount, subcategory_id")
//     .eq('user_id', user.id);
//   const totalAssigned = allBudgets?.reduce((sum, b) => sum + Number(b.assigned_amount || 0), 0) || 0;

//   // 6. PHASE 6: Get Previous Month's Budgets for Carryover
//   const prevMonthDate = new Date(dbMonthDate);
//   prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
//   const prevDbMonthDate = prevMonthDate.toISOString().slice(0, 10);

//   const { data: prevMonthBudgets } = await supabase
//     .from("monthly_budgets")
//     .select("*")
//     .eq("user_id", user.id)
//     .eq("month_year", prevDbMonthDate);

//   // Get Previous Month's Transactions for Carryover Calculation
//   const { data: prevTransactions } = await supabase
//     .from("transactions")
//     .select("subcategory_id, amount, type")
//     .eq("user_id", user.id)
//     .is("deleted_at", null)
//     .gte("date", prevDbMonthDate)
//     .lt("date", dbMonthDate);

//   // Calculate previous month's spent
//   const prevSpentMap: Record<string, number> = {};
//   prevTransactions?.forEach(t => {
//     const val = Math.abs(Number(t.amount));
//     if (t.subcategory_id) {
//       if (t.type === 'expense') {
//         prevSpentMap[t.subcategory_id] = (prevSpentMap[t.subcategory_id] || 0) + val;
//       } else if (t.type === 'income') {
//         prevSpentMap[t.subcategory_id] = (prevSpentMap[t.subcategory_id] || 0) - val;
//       }
//     }
//   });

//   // 7. Organize Data
//   type Subcategory = {
//     id: string;
//     name: string;
//   };

//   const categoryData = categories?.map((cat) => ({
//     id: cat.id,
//     name: cat.name,
//     subcategories: cat.subcategories.map((sub: Subcategory) => {
//       const budget = monthlyBudgets?.find(b => b.subcategory_id === sub.id);
//       const assigned = Number(budget?.assigned_amount || 0);
//       const spent = spentMap[sub.id] || 0;
//       const goal = goalsMap[sub.id];
      
//       // PHASE 6: Carryover Engine
//       // Calculate previous month's available balance
//       const prevBudget = prevMonthBudgets?.find(b => b.subcategory_id === sub.id);
//       const prevAssigned = Number(prevBudget?.assigned_amount || 0);
//       const prevSpent = prevSpentMap[sub.id] || 0;
//       const prevAvailable = prevAssigned - prevSpent;
      
//       // Only carry over positive balances
//       const carryover = Math.max(0, prevAvailable);
      
//       // Available = Assigned + Carryover - Spent
//       const available = assigned + carryover - spent;
      
//       // PHASE 1: "Planned" Logic Hierarchy
//       let planned = 0;
      
//       // Priority 1: Monthly budget target_amount (this month is special)
//       if (budget?.target_amount && Number(budget.target_amount) > 0) {
//         planned = Number(budget.target_amount);
//       }
//       // Priority 2: Goal calculation (Remaining Target / Months Left)
//       else if (goal && goal.target_date) {
//         const targetDate = new Date(goal.target_date);
//         const currentDate = new Date(dbMonthDate);
        
//         // Calculate months remaining (including current month)
//         const monthsRemaining = Math.max(1, 
//           (targetDate.getFullYear() - currentDate.getFullYear()) * 12 +
//           (targetDate.getMonth() - currentDate.getMonth()) + 1
//         );
        
//         // Calculate how much has been saved so far (sum of all assigned amounts for this subcategory)
//         const totalSaved = allBudgets?.filter(b => b.subcategory_id === sub.id)
//           .reduce((sum, b) => sum + Number(b.assigned_amount || 0), 0) || 0;
        
//         const remaining = Math.max(0, goal.target_amount - totalSaved);
//         planned = Math.ceil(remaining / monthsRemaining);
//       }
//       // Priority 3: Default to $0.00
//       else {
//         planned = 0;
//       }
      
//       return {
//         id: sub.id,
//         name: sub.name,
//         planned,
//         assigned,
//         spent,
//         available,
//         carryover, // Include carryover in the response for transparency
//         goal: goal ? {
//           id: goal.id,
//           name: goal.name,
//           target_amount: goal.target_amount,
//           target_date: goal.target_date,
//           current_saved: allBudgets?.filter(b => b.subcategory_id === sub.id)
//             .reduce((sum, b) => sum + Number(b.assigned_amount || 0), 0) || 0,
//         } : null,
//       };
//     })
//   }));

//   return {
//     readyToAssign: totalCash - totalAssigned,
//     totalCash,
//     totalAssigned,
//     monthYear: rawMonth,
//     categories: categoryData || [],
//   };
// }

// export async function updateAssignedAmount(
//   subcategoryId: string,
//   monthYear: string,
//   newAmount: number
// ) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error("Unauthenticated");

//   const dbMonthDate = `${monthYear}-01`;

//   // Use UPSERT: It updates if exists, inserts if not
//   const { error } = await supabase
//     .from("monthly_budgets")
//     .upsert({
//       user_id: user.id,
//       subcategory_id: subcategoryId,
//       month_year: dbMonthDate,
//       assigned_amount: newAmount,
//     }, { 
//       onConflict: 'user_id, subcategory_id, month_year',
//       ignoreDuplicates: false 
//     });

//   if (error) throw error;
//   // Client-side components handle their own state updates
//   return { success: true };
// }

// // PHASE 5: Comprehensive budget upsert with target_amount and notes
// export async function upsertMonthlyBudget(data: {
//   subcategoryId: string;
//   monthYear: string;
//   assignedAmount?: number;
//   targetAmount?: number;
//   notes?: string;
// }) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error("Unauthenticated");

//   const dbMonthDate = `${data.monthYear}-01`;

//   const upsertData: {
//     user_id: string;
//     subcategory_id: string;
//     month_year: string;
//     assigned_amount?: number;
//     target_amount?: number;
//     notes?: string;
//   } = {
//     user_id: user.id,
//     subcategory_id: data.subcategoryId,
//     month_year: dbMonthDate,
//   };

//   if (data.assignedAmount !== undefined) {
//     upsertData.assigned_amount = data.assignedAmount;
//   }
//   if (data.targetAmount !== undefined) {
//     upsertData.target_amount = data.targetAmount;
//   }
//   if (data.notes !== undefined) {
//     upsertData.notes = data.notes;
//   }

//   const { error } = await supabase
//     .from("monthly_budgets")
//     .upsert(upsertData, { 
//       onConflict: 'user_id, subcategory_id, month_year',
//       ignoreDuplicates: false 
//     });

//   if (error) throw error;
//   return { success: true };
// }

// // PHASE 5: Goal management
// export async function upsertGoal(data: {
//   goalId?: string;
//   subcategoryId: string;
//   name: string;
//   targetAmount: number;
//   targetDate?: string;
// }) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error("Unauthenticated");

//   const upsertData: {
//     id?: string;
//     user_id: string;
//     subcategory_id: string;
//     name: string;
//     target_amount: number;
//     target_date?: string;
//     is_completed: boolean;
//   } = {
//     user_id: user.id,
//     subcategory_id: data.subcategoryId,
//     name: data.name,
//     target_amount: data.targetAmount,
//     is_completed: false,
//   };

//   if (data.goalId) {
//     upsertData.id = data.goalId;
//   }

//   if (data.targetDate) {
//     upsertData.target_date = data.targetDate;
//   }

//   const { error } = await supabase
//     .from("goals")
//     .upsert(upsertData);

//   if (error) throw error;
//   return { success: true };
// }

// // PHASE 4: Get recent transactions for a subcategory
// export async function getSubcategoryTransactions(
//   subcategoryId: string,
//   monthYear: string,
//   limit: number = 5
// ) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error("Unauthenticated");

//   const dbMonthDate = `${monthYear}-01`;
//   const nextMonthDate = new Date(dbMonthDate);
//   nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

//   const { data: transactions, error } = await supabase
//     .from("transactions")
//     .select("id, date, payee, amount, type, description")
//     .eq("user_id", user.id)
//     .eq("subcategory_id", subcategoryId)
//     .is("deleted_at", null)
//     .gte("date", dbMonthDate)
//     .lt("date", nextMonthDate.toISOString().split('T')[0])
//     .order("date", { ascending: false })
//     .limit(limit);

//   if (error) throw error;

//   return transactions || [];
// }

// // PHASE 4: Get monthly budget notes
// export async function getMonthlyBudgetNotes(
//   subcategoryId: string,
//   monthYear: string
// ) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error("Unauthenticated");

//   const dbMonthDate = `${monthYear}-01`;

//   const { data, error } = await supabase
//     .from("monthly_budgets")
//     .select("notes, target_amount")
//     .eq("user_id", user.id)
//     .eq("subcategory_id", subcategoryId)
//     .eq("month_year", dbMonthDate)
//     .single();

//   if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found, which is ok

//   return data || { notes: null, target_amount: null };
// }
