// types/finance.ts
import { Database } from './supabase'

// Helper types to make code cleaner
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// 1. Base Table Types
export type Account = Tables<'accounts'>
export type Category = Tables<'categories'>
export type Subcategory = Tables<'subcategories'>
export type Merchant = Tables<'merchants'>
export type Transaction = Tables<'transactions'>
export type Budget = Tables<'monthly_budgets'>
export type Goal = Tables<'goals'>

// 2. Database Enums
export type AccountType = Enums<'account_type'>
export type TransactionType = Enums<'transaction_type'>

// 3. Complex Transaction Type (for your History/Table views)
// This uses TypeScript's '&' to combine the base transaction with its related data
export type TransactionWithDetails = Transaction & {
  accounts?: Account | null
  merchants?: Merchant | null
  subcategories?: (Subcategory & { 
    categories: Category 
  }) | null
}

// 4. Budget Tracking (YNAB Style)
export interface CategoryBudgetSummary {
  subcategoryId: string
  subcategoryName: string
  categoryName: string
  assigned: number     // monthly_budgets.assigned_amount
  spent: number        // Calculated: Sum of transactions this month
  activity: number     // Current spending vs assigned
  available: number   // assigned - spent + carryover
}