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

// 🔥 TIPO PARA EL WISHLIST AÑADIDO 🔥
type WishlistItem = {
  id: string;
  nombre: string;
  imagen?: string;
};

type CarritoContextType = {
  // Carrito
  carrito: CartItem[];
  showCart: boolean;
  addToCart: (producto: Producto, tamaño: string) => void;
  updateCantidad: (index: number, cantidad: number) => void;
  removeFromCart: (index: number) => void;
  total: number;
  setShowCart: (show: boolean) => void;
  finalizarCompra: () => void;
  limpiarCarrito: () => void;
  
  // 🔥 WISHLIST AÑADIDO AL CONTEXTO 🔥
  wishlist: WishlistItem[];
  addToWishlist: (producto: any) => void;
  removeFromWishlist: (id: string) => void;
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

// 🔥 FUNCIÓN PARA PARSEAR EL WISHLIST DE FORMA SEGURA 🔥
function safeParseWishlist(raw: string | null): WishlistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x: any) => x && typeof x === "object" && x.id);
  } catch {
    return [];
  }
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  // ESTADOS DEL CARRITO
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // 🔥 ESTADO DEL WISHLIST 🔥
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // KEYS DE ALMACENAMIENTO (Por usuario o por invitado)
  const cartStorageKey = useMemo(() => {
    return user?.uid ? `cart:${user.uid}` : "cart:guest";
  }, [user?.uid]);

  const wishlistStorageKey = useMemo(() => {
    return user?.uid ? `wishlist:${user.uid}` : "wishlist:guest";
  }, [user?.uid]);

  // ✅ CARGAR DATOS DESDE LOCALSTORAGE AL INICIAR O CAMBIAR USUARIO
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawCart = window.localStorage.getItem(cartStorageKey);
      setCarrito(safeParseCart(rawCart));

      const rawWishlist = window.localStorage.getItem(wishlistStorageKey);
      setWishlist(safeParseWishlist(rawWishlist));
    }
  }, [cartStorageKey, wishlistStorageKey]);

  // ✅ PERSISTIR CARRITO EN LOCALSTORAGE
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(carrito ?? []));
    } catch {}
  }, [carrito, cartStorageKey]);

  // 🔥 PERSISTIR WISHLIST EN LOCALSTORAGE 🔥
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(wishlistStorageKey, JSON.stringify(wishlist ?? []));
    } catch {}
  }, [wishlist, wishlistStorageKey]);

  // ==========================================
  // FUNCIONES DEL CARRITO
  // ==========================================
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
    router.push("/checkout"); 
  }

  function limpiarCarrito() {
    setCarrito([]);
  }

  const total = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);
  }, [carrito]);

  // ==========================================
  // 🔥 FUNCIONES DEL WISHLIST 🔥
  // ==========================================
  function addToWishlist(producto: any) {
    setWishlist((prev) => {
      if (prev.some((w) => w.id === producto.id)) return prev; // Si ya existe, no lo duplica
      return [...prev, { id: producto.id, nombre: producto.nombre, imagen: producto.imagen }];
    });
  }

  function removeFromWishlist(id: string) {
    setWishlist((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <CarritoContext.Provider
      value={{
        // Carrito
        carrito,
        showCart,
        addToCart,
        updateCantidad,
        removeFromCart,
        total,
        setShowCart,
        finalizarCompra,
        limpiarCarrito,
        
        // Wishlist
        wishlist,
        addToWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}