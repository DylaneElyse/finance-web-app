# Personal Finance Web App

<p align="center">
  A comprehensive zero-based budgeting application built with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#getting-started"><strong>Getting Started</strong></a> ·
  <a href="#budget-features"><strong>Budget Features</strong></a> ·
  <a href="#database-setup"><strong>Database Setup</strong></a>
</p>

---

## Overview

A full-featured personal finance management application inspired by zero-based budgeting principles (similar to YNAB). Track your income, expenses, savings goals, and budget allocations across multiple accounts with advanced features like carryover balances, pacing indicators, and goal tracking.

## Features

### 🏦 Account Management
- **Multiple Account Types**: Chequing, Savings, Credit Cards, Lines of Credit
- **Real-time Balance Tracking**: Monitor all your accounts in one place
- **Account Transfers**: Seamlessly transfer money between accounts
- **Soft Delete**: Archived accounts can be recovered

### 📊 Budget Planning (Zero-Based Budgeting)
- **Ready to Assign**: See unallocated income at a glance
- **Category Organization**: Organize spending into categories and subcategories
- **Monthly Budgets**: Assign money to categories each month
- **Carryover Engine**: Unused budget automatically rolls forward to the next month
- **Inline Editing**: Quick budget adjustments with optimistic UI updates

### 🎯 Goals & Targets
- **Savings Goals**: Set long-term savings targets with deadlines
- **Progress Tracking**: Visual progress bars show completion percentage
- **Time Remaining**: See how many months until your goal deadline
- **Monthly Targets**: Set spending targets for regular expenses
- **Flexible System**: Optional goal names for one-time savings or recurring budgets

### 📈 Advanced Financial Intelligence
- **Overspending Indicators**: Visual alerts (red/yellow) for budget overages
- **Pacing Indicators**: Color-coded bars show if you're on track for the month
  - Blue: Under budget (on track)
  - Yellow: Slightly over pace
  - Red: Significantly over pace
- **Transaction Categorization**: Assign every transaction to a budget category
- **Refunds & Rebates**: Income transactions reduce category spending
- **Account Transfer Handling**: Transfers balance out automatically

### 🔍 The Inspector (Side Drawer)
Click any subcategory name to open a detailed view:
- **Budget Summary**: See planned, assigned, spent, and available amounts
- **Goal Progress**: Visual progress bar with time remaining
- **Recent Transactions**: Last 5 transactions for the subcategory
- **Monthly Notes**: Add notes specific to each category/month
- **Quick Editing**: Edit targets and goals inline

### 💰 Transaction Management
- **Full Transaction History**: Track all income and expenses
- **Payee Management**: Quick-add payees with auto-suggest
- **Transaction Details**: Date, amount, payee, description, and category
- **Bulk Views**: View transactions by account or by category
- **Click-through Navigation**: Click spent amounts to see all transactions

### 📱 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: Theme switcher with persistent preferences
- **Fast & Optimistic**: UI updates instantly with rollback on errors
- **Keyboard Shortcuts**: Quick navigation and editing
- **Month Navigation**: Easily move between months with keyboard or buttons

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org) (App Router)
- **Database**: [Supabase](https://supabase.com) (PostgreSQL)
- **Authentication**: Supabase Auth with secure cookie-based sessions
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Type Safety**: TypeScript throughout

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account ([create one free](https://supabase.com))

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/finance-web-app.git
cd finance-web-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project in [Supabase Dashboard](https://supabase.com/dashboard)
2. Run the database schema (see [Database Setup](#database-setup))
3. Get your project URL and anon key from project settings

### 4. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## Database Setup

### Required Tables

The app uses the following database tables:

1. **accounts** - Bank accounts, credit cards, etc.
2. **categories** - Budget categories
3. **subcategories** - Budget subcategories (the actual budget items)
4. **transactions** - All income and expense transactions
5. **payees** - Merchants and payees
6. **monthly_budgets** - Budget assignments and targets per month
7. **goals** - Long-term savings goals

### Schema Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add notes column to monthly_budgets (if not exists)
ALTER TABLE monthly_budgets 
ADD COLUMN IF NOT EXISTS notes TEXT;
```

### Row Level Security (RLS)

All tables should have RLS enabled with policies that ensure users can only access their own data:

```sql
-- Example RLS policy (apply to all tables)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own accounts"
ON accounts
FOR ALL
USING (auth.uid() = user_id);
```

## Budget Features

### Ready to Assign Calculation

```
Ready to Assign = Total Cash - Total Assigned
```

Where:
- **Total Cash** = Sum of chequing and savings accounts
- **Total Assigned** = All money allocated to budget categories

Income from the "Ignore" category (Ready to Assign, Starting Balance, Account Transfers) is tracked but doesn't affect the RTA calculation.

### The Carryover Engine

Positive budget balances automatically roll forward:

```
Available = Assigned + Carryover - Spent
```

If you budget $100 but only spend $60, the remaining $40 automatically becomes available next month!

### Planned Amount Hierarchy

The "Planned" column follows this priority:

1. **Monthly Target**: If set for this specific month
2. **Goal Calculation**: Remaining target ÷ months remaining
3. **Default**: $0.00

### Transaction Types

- **Income**: Adds to account balance, reduces category spending if assigned to a category
- **Expense**: Reduces account balance, increases category spending
- **Transfer**: Balances out between accounts (one income, one expense)

## Project Structure

```
├── app/
│   ├── auth/              # Authentication pages
│   ├── protected/         # Protected app pages
│   │   ├── accounts/      # Account management
│   │   ├── transactions/  # Transaction views
│   │   ├── plan/         # Budget planning (main feature)
│   │   └── settings/      # Categories & payee management
│   └── layout.tsx
├── actions/               # Server actions for data mutations
│   ├── accounts.ts
│   ├── transactions.ts
│   ├── plan.ts           # Budget & goal operations
│   └── ...
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── ...
├── lib/
│   └── supabase/         # Supabase client configuration
└── types/                # TypeScript type definitions
```

## Key Concepts

### Zero-Based Budgeting

Every dollar has a job! Allocate all your income to categories until "Ready to Assign" reaches $0.

### The Four Rules

1. **Give Every Dollar a Job**: Assign all income to categories
2. **Embrace Your True Expenses**: Budget for irregular expenses monthly
3. **Roll With The Punches**: Adjust categories as needed
4. **Age Your Money**: Build a buffer by spending last month's income

### Category Organization

- **Ignore Category**: Special category for account transfers and starting balances
- **Regular Categories**: Organize your spending (Groceries, Bills, Fun, etc.)
- **Subcategories**: The actual budget line items

## Development

### Adding New Features

1. Create database tables/columns in Supabase
2. Update TypeScript types in `types/`
3. Create server actions in `actions/`
4. Build UI components in `components/`
5. Add pages in `app/protected/`

### Code Style

- Use TypeScript for type safety
- Follow Next.js App Router conventions
- Server actions for mutations, direct queries for reads
- Optimistic UI updates for better UX

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Environment Variables

Required for production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Troubleshooting

### Common Issues

**RTA shows incorrect amount**
- Verify account balances are correct
- Check that all transactions are properly categorized
- Ensure Ignore category is set up correctly

**Transactions not appearing**
- Check date range filters
- Verify transaction isn't soft-deleted
- Ensure proper category assignment

**Budget not updating**
- Check browser console for errors
- Verify RLS policies allow user access
- Try refreshing the page

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Inspired by [YNAB (You Need A Budget)](https://www.ynab.com)
- Built with [Next.js](https://nextjs.org) and [Supabase](https://supabase.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

**Happy Budgeting! 💰**
