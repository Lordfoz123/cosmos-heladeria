"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import ClientGate from "./ClientGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Estado compartido para abrir/cerrar el Sidebar desde el Header
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ClientGate>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        
        {/* 1. SIDEBAR
           Recibe el estado para saber si mostrarse en móvil 
           y la función para cerrarse.
        */}
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        {/* 2. CONTENIDO PRINCIPAL */}
        <div className="flex flex-1 flex-col h-full overflow-hidden">
          
          {/* 3. HEADER 
             Recibe la función onMenuClick para abrir el sidebar al tocar la hamburguesa.
          */}
          <Header onMenuClick={() => setIsSidebarOpen(true)} />

          {/* 4. ÁREA DE TRABAJO (Scrollable) */}
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 custom-scrollbar">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ClientGate>
  );
}