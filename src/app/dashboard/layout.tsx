import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import ClientGate from "./ClientGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientGate>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </ClientGate>
  );
}