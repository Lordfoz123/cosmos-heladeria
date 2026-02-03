"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/auth/AuthProvider";

export type WishlistItem = {
  id: string;
  nombre: string;
  imagen?: string;
};

type WishlistContextValue = {
  items: WishlistItem[];
  has: (id: string) => boolean;
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  toggle: (item: WishlistItem) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [items, setItems] = useState<WishlistItem[]>([]);

  // load on login
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    try {
      const key = `wishlist:${user.uid}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as WishlistItem[]) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [user?.uid]);

  // persist on change
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(`wishlist:${user.uid}`, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, user?.uid]);

  const value = useMemo<WishlistContextValue>(() => {
    const has = (id: string) => items.some((x) => x.id === id);

    const add = (item: WishlistItem) => {
      setItems((prev) => {
        if (prev.some((x) => x.id === item.id)) return prev;
        toast.success("Añadido a wishlist");
        return [item, ...prev];
      });
    };

    const remove = (id: string) => {
      setItems((prev) => {
        if (!prev.some((x) => x.id === id)) return prev;
        toast("Quitado de wishlist");
        return prev.filter((x) => x.id !== id);
      });
    };

    const toggle = (item: WishlistItem) => {
      setItems((prev) => {
        const exists = prev.some((x) => x.id === item.id);
        if (exists) {
          toast("Quitado de wishlist");
          return prev.filter((x) => x.id !== item.id);
        }
        toast.success("Añadido a wishlist");
        return [item, ...prev];
      });
    };

    const clear = () => setItems([]);

    return { items, has, add, remove, toggle, clear };
  }, [items]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}