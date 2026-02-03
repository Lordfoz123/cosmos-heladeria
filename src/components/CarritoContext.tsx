"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

type Producto = {
  id: string;
  nombre: string;
  imagen?: string;
  precio: number;
  descripcion?: string;
};

type CartItem = {
  producto: Producto;
  tamaño: string;
  cantidad: number;
};

type CarritoContextType = {
  carrito: CartItem[];
  showCart: boolean;
  addToCart: (producto: Producto, tamaño: string) => void;
  updateCantidad: (index: number, cantidad: number) => void;
  removeFromCart: (index: number) => void;
  total: number;
  setShowCart: (show: boolean) => void;
  finalizarCompra: () => void;
  limpiarCarrito: () => void;
};

const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return ctx;
}

function safeParseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Validación mínima para evitar romper la app por data vieja/corrupta
    return parsed
      .filter((x: any) => x && typeof x === "object")
      .map((x: any) => ({
        producto: {
          id: String(x?.producto?.id ?? ""),
          nombre: String(x?.producto?.nombre ?? ""),
          imagen: x?.producto?.imagen ? String(x.producto.imagen) : undefined,
          precio: Number(x?.producto?.precio ?? 0),
          descripcion: x?.producto?.descripcion ? String(x.producto.descripcion) : undefined,
        },
        tamaño: String(x?.tamaño ?? ""),
        cantidad: Math.max(1, Math.floor(Number(x?.cantidad ?? 1))),
      }))
      .filter((x: CartItem) => x.producto.id && x.producto.nombre && Number.isFinite(x.producto.precio));
  } catch {
    return [];
  }
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const storageKey = useMemo(() => {
    return user?.uid ? `cart:${user.uid}` : "cart:guest";
  }, [user?.uid]);

  // ✅ Cargar carrito desde localStorage cuando cambia el usuario (o al montar)
  useEffect(() => {
    // localStorage solo existe en cliente
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    setCarrito(safeParseCart(raw));
  }, [storageKey]);

  // ✅ Persistir carrito en localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(carrito ?? []));
    } catch {
      // ignore (quota, private mode, etc)
    }
  }, [carrito, storageKey]);

  function addToCart(producto: Producto, tamaño: string) {
    if (!tamaño) return;

    setCarrito((prev) => {
      const idx = prev.findIndex((it) => it.producto.id === producto.id && it.tamaño === tamaño);
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? { ...item, cantidad: item.cantidad + 1 } : item));
      }
      return [...prev, { producto, tamaño, cantidad: 1 }];
    });

    setShowCart(true);
  }

  function updateCantidad(index: number, cantidad: number) {
    setCarrito((old) => {
      const nuevo = [...old];
      if (!nuevo[index]) return old;

      if (cantidad > 0) nuevo[index] = { ...nuevo[index], cantidad };
      else nuevo.splice(index, 1);

      return nuevo;
    });
  }

  function removeFromCart(index: number) {
    setCarrito((old) => old.filter((_, i) => i !== index));
  }

  function finalizarCompra() {
    setShowCart(false);
    router.push("/checkout"); // Solo navega a checkout
  }

  function limpiarCarrito() {
    setCarrito([]);
  }

  const total = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);
  }, [carrito]);

  return (
    <CarritoContext.Provider
      value={{
        carrito,
        showCart,
        addToCart,
        updateCantidad,
        removeFromCart,
        total,
        setShowCart,
        finalizarCompra,
        limpiarCarrito,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}