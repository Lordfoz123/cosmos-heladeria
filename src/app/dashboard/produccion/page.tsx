"use client";

import { ProduccionPanel } from "@/components/produccion/ProduccionPanel";

export default function ProduccionPage() {
  return (
    <main className="flex-1 p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-6xl mx-auto">
        <ProduccionPanel />
      </div>
    </main>
  );
}