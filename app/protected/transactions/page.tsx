import { TransactionsList } from "@/components/transactions-list";
import { TransactionsPageHeader } from "@/components/transactions-page-header";
import { Suspense } from "react";

export default function Transactions() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl px-4">
        <TransactionsPageHeader />
        <Suspense fallback={
          <div className="w-full p-8 text-center text-slate-500">
            Loading transactions...
          </div>
        }>
          <TransactionsList />
        </Suspense>
      </div>
    </main>
  );
}
