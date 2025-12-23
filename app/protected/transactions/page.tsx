import { TransactionsList } from "@/components/transactions-list";
import { TransactionsPageHeader } from "@/components/transactions-page-header";
import { Suspense } from "react";

export default function Transactions() {
  return (
    <div className="flex-1 flex flex-col w-full px-4 py-4">
      <TransactionsPageHeader />
      <Suspense fallback={
        <div className="w-full p-8 text-center text-slate-500">
          Loading transactions...
        </div>
      }>
        <TransactionsList />
      </Suspense>
    </div>
  );
}
