import { Sidebar } from "@/components/sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col">
        {children}
      </div>
    </main>
  );
}
