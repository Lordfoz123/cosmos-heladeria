import React, { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100vh] w-full bg-background text-foreground p-6">
          Cargando…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}