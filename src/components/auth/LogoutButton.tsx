"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-extrabold text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={async () => {
        await signOut(auth);
        router.push("/login");
      }}
      title="Cerrar sesión"
    >
      Cerrar sesión
    </button>
  );
}