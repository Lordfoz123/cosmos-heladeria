"use client";

import React, { useEffect, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePathname, useRouter } from "next/navigation";

/**
 * ✅ Recomendación:
 * - Ya NO usar lista fija de emails en producción.
 * - Mejor: usar `isAdmin` desde AuthProvider (claims/rol).
 *
 * Este componente:
 * - si no hay user => manda a /login?next=...
 * - si no es admin => manda a /
 */
export default function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const nextUrl = useMemo(
    () => `/login?next=${encodeURIComponent(pathname || "/dashboard")}`,
    [pathname]
  );

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(nextUrl);
      return;
    }

    if (!isAdmin) {
      router.replace("/"); // o /no-autorizado
      return;
    }
  }, [loading, user, isAdmin, router, nextUrl]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  // mientras redirige
  if (!user || !isAdmin) return null;

  return <>{children}</>;
}