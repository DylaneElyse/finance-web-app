import { AccountsList } from "@/components/accounts-list";
import { AccountsPageHeader } from "@/components/accounts-page-header";
import { Suspense } from "react";

export default function Accounts() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl px-4">
        <AccountsPageHeader />
        <Suspense fallback={
          <div className="w-full p-8 text-center text-slate-500">
            Loading accounts...
          </div>
        }>
          <AccountsList />
        </Suspense>
      </div>
    </main>
  );
}
