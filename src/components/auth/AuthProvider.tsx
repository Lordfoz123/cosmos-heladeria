"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

type Role = "admin" | "user" | null;

type AuthContextValue = {
  user: User | null;
  loading: boolean;

  // claims
  role: Role;
  isAdmin: boolean;

  // util
  refreshClaims: () => Promise<void>;
  refreshUser: () => Promise<void>; // ✅ para refrescar displayName/photoURL en vivo
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<Role>(null);
  const isAdmin = role === "admin";

  async function readClaims(u: User, forceRefresh: boolean) {
    await u.getIdToken(forceRefresh);
    const res = await u.getIdTokenResult();
    const r = (res.claims.role as Role) ?? null;
    setRole(r);
  }

  const refreshClaims = async () => {
    const u = auth.currentUser;
    if (!u) return;
    await readClaims(u, true);
  };

  // ✅ fuerza relectura de displayName/photoURL para actualizar el Header al instante
  const refreshUser = async () => {
    const u = auth.currentUser;
    if (!u) return;

    await u.reload();

    // Firebase a veces mantiene la misma referencia; clonamos para forzar re-render
    const refreshed = auth.currentUser;
    setUser(refreshed ? ({ ...refreshed } as User) : null);
  };

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setRole(null);
        setLoading(false);
        return;
      }

      // ✅ TEMP: imprime el ID token para poder usarlo en curl
      // ⚠️ Quitar después de probar (no dejar tokens en logs)
      try {
        const t = await u.getIdToken();
        console.log("ID_TOKEN:", t);
      } catch (e) {
        console.log("No se pudo obtener ID token", e);
      }

      try {
        await readClaims(u, false);
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({ user, loading, role, isAdmin, refreshClaims, refreshUser }),
    [user, loading, role, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}