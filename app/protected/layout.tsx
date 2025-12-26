import { Sidebar } from "@/components/sidebar";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex">
      <Suspense fallback={
        <div className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-slate-50 border-r">
          <div className="p-6">
            <h1 className="text-xl font-bold text-blue-600">FinanceApp</h1>
          </div>
          <div className="px-4 text-sm text-slate-400">Loading...</div>
        </div>
      }>
        <Sidebar />
      </Suspense>
      <div className="ml-64 flex-1 flex flex-col">
        {children}
      </div>
    </main>
  );
}
