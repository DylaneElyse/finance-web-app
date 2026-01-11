# Personal Finance Web App 💰

<p align="center">
  A comprehensive zero-based budgeting application built with Next.js 15 and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#getting-started"><strong>Getting Started</strong></a> ·
  <a href="#budget-features"><strong>Budget Features</strong></a> ·
  <a href="#database-setup"><strong>Database Setup</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a>
</p>

---

## Overview

A full-featured personal finance management application inspired by zero-based budgeting principles. Track your income, expenses, savings goals, and budget allocations across multiple accounts with advanced features like carryover balances, pacing indicators, goal tracking, and an intelligent inspector drawer.

Built with modern web technologies including Next.js 15 App Router, React 19, Supabase for authentication and database, and styled with Tailwind CSS and shadcn/ui components.

## ✨ Features

### 🏦 Account Management
- **Multiple Account Types**: Chequing, Savings, Credit Cards, Lines of Credit
- **Real-time Balance Tracking**: Monitor all your accounts in one place with instant updates
- **Account Transfers**: Seamlessly transfer money between accounts with automatic reconciliation
- **Soft Delete**: Archived accounts and transactions can be recovered
- **Detailed Account Views**: Click through to see all transactions for any account

### 📊 Budget Planning (Zero-Based Budgeting)
- **Ready to Assign (RTA)**: See unallocated income at a glance with real-time updates
- **Category Organization**: Organize spending into categories and subcategories
- **Monthly Budgets**: Assign money to categories each month with inline editing
- **Carryover Engine**: Unused budget automatically rolls forward to the next month
- **Optimistic UI**: Instant budget updates with automatic rollback on errors
- **Keyboard Navigation**: Arrow keys for quick month switching

### 🎯 Goals & Targets
- **Savings Goals**: Set long-term savings targets with deadlines and custom names
- **Progress Tracking**: Visual progress bars show completion percentage and amount saved
- **Time Remaining**: See how many months/years until your goal deadline
- **Monthly Targets**: Set spending targets for regular expenses
- **Flexible System**: Optional goal names for one-time savings or recurring budgets
- **Goal Indicators**: Visual alerts when assigned amount falls short of planned targets

### 📈 Advanced Financial Intelligence
- **Overspending Indicators**: Visual alerts (red/yellow) for budget overages
  - 🔴 **Red Alert**: Cash overspending (spent more than assigned + carryover)
  - 🟡 **Yellow Warning**: Goal shortfall (assigned less than planned target)
- **Pacing Indicators**: Color-coded progress bars show if you're on track for the month
  - 🔵 **Blue**: Under budget (on track)
  - 🟡 **Yellow**: Slightly over pace (0-20% ahead)
  - 🔴 **Red**: Significantly over pace (>20% ahead)
- **Transaction Categorization**: Assign every transaction to a budget category
- **Refunds & Rebates**: Income transactions reduce category spending
- **Account Transfer Handling**: Transfers balance out automatically via Ignore category

### 🔍 The Inspector (Side Drawer)
Click any subcategory name to open a detailed view:
- **Budget Summary**: See planned, assigned, spent, available, and carryover amounts
- **Goal Progress**: Visual progress bar with percentage and time remaining indicators
- **Recent Transactions**: Last 5 transactions for the subcategory with color-coded amounts
- **Monthly Notes**: Add and edit notes specific to each category/month combination
- **Quick Editing**: Edit targets and goals inline with instant saves
- **Empty States**: Helpful messages when no data exists

### 💰 Transaction Management
- **Full Transaction History**: Track all income and expenses with detailed information
- **Payee Management**: Quick-add payees with auto-suggest and automatic creation
- **Transaction Details**: Date, amount, payee, description, category, and account
- **Bulk Views**: View transactions by account, by category, or all together
- **Click-through Navigation**: Click spent amounts in budget to see all related transactions
- **Soft Delete with Recovery**: 
  - Deleted transactions can be restored (last 50 deletions kept)
  - Permanent delete option for complete removal
- **Smart Categorization**: Transactions update budget calculations in real-time

### 📱 User Experience
- **Responsive Design**: Fully responsive layout for desktop, tablet, and mobile
- **Dark/Light Mode**: Theme switcher with persistent preferences via next-themes
- **Fast & Optimistic**: UI updates instantly with automatic rollback on errors
- **Keyboard Shortcuts**: Quick navigation and editing (arrow keys, Enter, Escape)
- **Month Navigation**: Easily move between months with keyboard or buttons
- **Loading States**: Skeleton loaders for smooth data fetching experience
- **Empty States**: Helpful guidance when starting or when no data exists
- **Toast Notifications**: Success and error feedback for all operations

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router, Server Actions, React Server Components)
- **Frontend**: [React 19](https://react.dev) with TypeScript
- **Database**: [Supabase](https://supabase.com) (PostgreSQL with real-time capabilities)
- **Authentication**: Supabase Auth with secure cookie-based sessions (SSR support via @supabase/ssr)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com) with tailwindcss-animate
- **Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
- **Icons**: [Lucide React](https://lucide.dev)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes) for dark mode
- **Type Safety**: TypeScript 5 throughout with strict mode
- **Linting**: ESLint 9 with Next.js configuration

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** or **yarn** package manager
- A **Supabase account** ([create one free](https://supabase.com))

### 1. Clone the Repository

```bash
git clone https://github.com/DylaneElyse/finance-web-app.git
cd finance-web-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project in [Supabase Dashboard](https://supabase.com/dashboard)
2. Wait for the database to be provisioned
3. Run the database schema (see [Database Setup](#database-setup) section)
4. Enable Row Level Security (RLS) on all tables
5. Get your project URL and anon key from **Project Settings → API**

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Replace with your actual Supabase credentials.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see your app!

### 6. Create Your First Account

1. Sign up for a new account
2. Navigate to the protected area
3. Create your first account (bank account, credit card, etc.)
4. Start adding transactions and budgeting!

## 🗄️ Database Setup

### Database Schema Overview

The application uses 7 main tables:

| Table | Description |
|-------|-------------|
| **accounts** | Bank accounts, credit cards, lines of credit |
| **categories** | Top-level budget categories |
| **subcategories** | Budget line items (the actual budget entries) |
| **transactions** | All income and expense transactions |
| **payees** | Merchants and payees for transactions |
| **monthly_budgets** | Budget assignments, targets, and notes per month |
| **goals** | Long-term savings goals with target amounts and dates |

### Required Schema

Create these tables in your Supabase SQL Editor. Each table should have:
- A `user_id` column (UUID) referencing `auth.users(id)`
- Row Level Security (RLS) enabled
- Policies ensuring users can only access their own data
- A `deleted_at` column (TIMESTAMP) for soft delete functionality
- Proper indexes on frequently queried columns

### Essential SQL Migration

Run this SQL in your Supabase SQL Editor to add required columns:

```sql
-- Add notes column to monthly_budgets (if not exists)
ALTER TABLE monthly_budgets 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add target_amount column to monthly_budgets (if not exists)
ALTER TABLE monthly_budgets 
ADD COLUMN IF NOT EXISTS target_amount DECIMAL(15, 2);

-- Ensure soft delete columns exist on all tables
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE payees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
```

### Row Level Security (RLS) Setup

**IMPORTANT**: All tables must have RLS enabled. Apply these policies to each table:

```sql
-- Example: Enable RLS on accounts table
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own accounts"
ON accounts
FOR ALL
USING (auth.uid() = user_id);

-- Repeat for all tables: categories, subcategories, transactions, 
-- payees, monthly_budgets, goals
```

### Special Categories Setup

Create the **Ignore** category for system transactions:

```sql
-- Insert Ignore category (do this after signing up)
INSERT INTO categories (user_id, name, sort_order)
VALUES (auth.uid(), 'Ignore', 0);

-- Insert subcategories under Ignore
INSERT INTO subcategories (user_id, category_id, name, sort_order)
VALUES 
  (auth.uid(), (SELECT id FROM categories WHERE name = 'Ignore'), 'Ready to Assign', 0),
  (auth.uid(), (SELECT id FROM categories WHERE name = 'Ignore'), 'Starting Balance', 1),
  (auth.uid(), (SELECT id FROM categories WHERE name = 'Ignore'), 'Account Transfers', 2);
```

## 📖 Budget Features

### Ready to Assign (RTA) Calculation

```
Ready to Assign = Total Cash - Total Assigned
```

Where:
- **Total Cash** = Sum of balances in chequing and savings accounts
- **Total Assigned** = All money allocated to budget categories this month

Income transactions assigned to the "Ignore" category (Ready to Assign, Starting Balance, Account Transfers) are tracked separately and don't affect the RTA calculation.

### The Carryover Engine 🔄

One of the most powerful features! Positive budget balances automatically roll forward:

```
Previous Available = Previous Assigned - Previous Spent
Carryover = max(0, Previous Available)  // Only positive balances carry forward
Current Available = Current Assigned + Carryover - Current Spent
```

**Example**: If you budget $100 for groceries but only spend $60, the remaining $40 automatically becomes available next month! This encourages saving and prevents "use it or lose it" spending.

**Note**: Negative balances (overspending) do NOT carry forward automatically. You must explicitly budget to cover overspending.

### Planned Amount Hierarchy

The "Planned" column displays the expected budget amount using this priority:

1. **Monthly Target**: If set for this specific month
2. **Goal Calculation**: `(Target Amount - Current Saved) ÷ Months Remaining`
3. **Default**: $0.00 if no target or goal exists

### Transaction Types

- **Income** 💰: Adds to account balance; if assigned to a category, reduces spending
- **Expense** 💸: Reduces account balance; increases category spending
- **Transfer** 🔄: Balances out between accounts (paired income/expense via Ignore category)

### Pacing Logic (Desktop)

The colored progress bar under the Available amount shows spending pace:

```
% Month Passed = (Days Elapsed / Total Days in Month) × 100
% Budget Spent = (Spent / Assigned) × 100
Pacing Difference = % Budget Spent - % Month Passed
```

- **Blue Bar** 🔵: On track or under-spending
- **Yellow Bar** 🟡: 0-20% over pace (slight concern)
- **Red Bar** 🔴: >20% over pace (significant concern)

Only appears for the current month when assigned amount > 0.

## 📁 Project Structure

```
finance-web-app/
├── app/
│   ├── auth/                    # Authentication pages
│   │   ├── login/              # Login page
│   │   ├── sign-up/            # Registration page
│   │   ├── forgot-password/    # Password reset
│   │   ├── update-password/    # Password update
│   │   └── confirm/            # Email confirmation handler
│   ├── protected/              # Protected app pages (requires auth)
│   │   ├── dashboard/          # Dashboard overview
│   │   ├── accounts/           # Account management
│   │   ├── transactions/       # All transactions view
│   │   ├── plan/              # 🎯 Budget planning (main feature)
│   │   └── settings/           # App settings
│   │       ├── categories/     # Category management
│   │       └── payees/         # Payee management
│   ├── layout.tsx              # Root layout with theme provider
│   ├── globals.css             # Global styles and CSS variables
│   └── page.tsx                # Landing page
├── actions/                    # Server actions for data mutations
│   ├── accounts.ts             # Account CRUD operations
│   ├── transactions.ts         # Transaction CRUD + recovery
│   ├── plan.ts                 # Budget, goals, carryover logic
│   ├── categories.ts           # Category management
│   └── payees.ts               # Payee management
├── components/                 # Reusable UI components
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx           # Inspector drawer
│   │   └── ...
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── transaction-form-dialog.tsx
│   ├── accounts-table.tsx
│   └── ...
├── lib/
│   ├── supabase/               # Supabase client configuration
│   │   ├── client.ts           # Client-side client
│   │   ├── server.ts           # Server-side client
│   │   └── proxy.ts            # API proxy (if needed)
│   └── utils.ts                # Utility functions (cn, etc.)
├── types/                      # TypeScript type definitions
│   ├── finance.ts              # Financial data types
│   └── supabase.ts             # Database table types
├── .env.local                  # Environment variables (create this)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## 🧮 Key Concepts

### Zero-Based Budgeting Philosophy

**Every dollar has a job!** Allocate all your income to categories until "Ready to Assign" reaches $0.

### The Four Rules

1. **Give Every Dollar a Job**: Assign all income to categories
2. **Embrace Your True Expenses**: Budget monthly for irregular expenses (car insurance, Christmas gifts)
3. **Roll With The Punches**: Adjust categories as needed (move money between categories)
4. **Age Your Money**: Build a buffer by spending last month's income

### Category Organization

- **Ignore Category** 🚫: Special system category for transfers and starting balances
  - Ready to Assign
  - Starting Balance
  - Account Transfers
- **Regular Categories** 📂: Your spending categories (Bills, Groceries, Fun, etc.)
- **Subcategories** 📄: The actual budget line items you assign money to

### Soft Delete Philosophy

All deletions are "soft" by default:
- Items are marked with `deleted_at` timestamp
- Can be restored within a reasonable timeframe
- Last 50 deleted transactions accessible for recovery
- Permanent delete option available for complete removal

## 💻 Development

### Available Scripts

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding New Features

1. **Database First**: Create tables/columns in Supabase SQL Editor
2. **Type Definitions**: Update TypeScript types in `types/supabase.ts`
3. **Server Actions**: Create data mutation functions in `actions/`
4. **UI Components**: Build React components in `components/`
5. **Pages**: Add routes in `app/protected/`
6. **Test**: Verify with development server and browser tools

### Code Style Guidelines

- ✅ Use TypeScript for all files (strict mode enabled)
- ✅ Follow Next.js 15 App Router conventions
- ✅ Use Server Actions for mutations, direct Supabase queries for reads
- ✅ Implement optimistic UI updates for better UX
- ✅ Add loading and empty states for all async operations
- ✅ Use shadcn/ui components for consistent design
- ✅ Prefer server components; use client components only when needed
- ✅ Include proper error handling with user-friendly messages

### State Management Patterns

- **Server State**: Fetched directly in Server Components
- **Client State**: React hooks (useState, useEffect) for interactive features
- **Optimistic Updates**: Store previous state for rollback on error
- **Local Storage**: Theme preferences and UI state (collapsed categories)

## 🚀 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DylaneElyse/finance-web-app)

**Manual Deployment:**

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy! 🎉

### Environment Variables

Required for all environments:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Security Note**: Never commit `.env.local` to version control. The anon key is safe for client-side use as long as you have proper RLS policies.

### Production Checklist

- ✅ RLS enabled on all tables
- ✅ Proper RLS policies (users can only access their own data)
- ✅ Environment variables configured
- ✅ Database indexes created for performance
- ✅ Supabase project on appropriate plan for usage
- ✅ Error monitoring set up (optional)
- ✅ Regular database backups enabled in Supabase

## 🐛 Troubleshooting

### Common Issues

**❌ RTA shows incorrect amount**
- ✅ Verify all account balances are correct
- ✅ Check that all transactions are properly categorized
- ✅ Ensure "Ignore" category exists with proper subcategories
- ✅ Verify no duplicate transactions

**❌ Transactions not appearing**
- ✅ Check date range filters
- ✅ Verify transaction isn't soft-deleted (`deleted_at IS NULL`)
- ✅ Ensure proper category/account assignment
- ✅ Check browser console for JavaScript errors

**❌ Budget not updating**
- ✅ Open browser DevTools and check console for errors
- ✅ Verify RLS policies allow user access to tables
- ✅ Check that you're signed in (session hasn't expired)
- ✅ Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**❌ Authentication errors**
- ✅ Verify environment variables are set correctly
- ✅ Check Supabase project is active (not paused)
- ✅ Ensure email confirmation is enabled in Supabase Auth settings
- ✅ Clear browser cookies and try again

**❌ "Failed to fetch" or network errors**
- ✅ Check Supabase URL is correct
- ✅ Verify anon key is correct and not expired
- ✅ Check browser network tab for blocked requests
- ✅ Ensure CORS is properly configured in Supabase

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Review Supabase logs in the dashboard
3. Verify database schema matches requirements
4. Check RLS policies are correctly configured
5. Open an issue on GitHub with details

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Guidelines

- Follow existing code style and conventions
- Add TypeScript types for all new code
- Include comments for complex logic
- Test thoroughly before submitting PR
- Update documentation if needed

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by [YNAB (You Need A Budget)](https://www.ynab.com)
- Built with [Next.js](https://nextjs.org) by Vercel
- Powered by [Supabase](https://supabase.com) - the open source Firebase alternative
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons by [Lucide](https://lucide.dev)

## 🎯 Roadmap

### Planned Features
- [ ] **Bulk Operations**: Assign to multiple subcategories at once
- [ ] **Goal Templates**: Pre-defined goals (emergency fund, vacation, etc.)
- [ ] **Recurring Transactions**: Automatic scheduled transaction creation
- [ ] **Reports & Analytics**: Monthly spending analysis and trend charts
- [ ] **Budget Templates**: Copy entire budget from previous month
- [ ] **Notifications**: Email/push alerts when approaching budget limits
- [ ] **Multi-Currency**: Support for different currencies with conversion
- [ ] **CSV Import**: Import transactions from bank exports
- [ ] **Mobile App**: Native iOS/Android apps with React Native
- [ ] **Shared Budgets**: Multi-user budgets for couples/families

### UI Improvements
- [ ] Drag-and-drop reordering of categories/subcategories
- [ ] Enhanced keyboard shortcuts and accessibility
- [ ] Advanced mobile optimizations and gestures
- [ ] Smooth animations and micro-interactions
- [ ] Customizable dashboard widgets

---

<p align="center">
  <strong>Happy Budgeting! 💰</strong>
</p>

<p align="center">
  Made with ❤️ by <a href="https://github.com/DylaneElyse">DylaneElyse</a>
</p>

<p align="center">
  <a href="https://github.com/DylaneElyse/finance-web-app/issues">Report Bug</a> ·
  <a href="https://github.com/DylaneElyse/finance-web-app/issues">Request Feature</a>
</p>
