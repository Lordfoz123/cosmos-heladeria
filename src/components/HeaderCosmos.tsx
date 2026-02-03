"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

import { useAuth } from "@/components/auth/AuthProvider";
import { useCarrito } from "@/components/CarritoContext";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";

import {
  ShoppingBag,
  User,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Heart,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react";

type WishlistItem = {
  id: string;
  nombre: string;
  imagen?: string;
};

function initialsFromUser(displayName?: string | null, email?: string | null) {
  const name = (displayName || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "A";
    const second = parts[1]?.[0] ?? (parts[0]?.[1] ?? "");
    return (first + second).toUpperCase();
  }

  const e = (email || "").trim();
  if (e) {
    const local = e.split("@")[0] || "A";
    return (local.slice(0, 2) || "A").toUpperCase();
  }

  return "A";
}

function withThemeTransition(run: () => void) {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  run();
  window.setTimeout(() => root.classList.remove("theme-transition"), 260);
}

export type HeaderCosmosProps = {
  logoHref?: string; // default "/"
  showThemeToggle?: boolean; // default true
  showWishlist?: boolean; // default true
  showCart?: boolean; // default true
  // render slot: botón extra a la derecha (ej: Descargar PDF, Ir a tienda, etc.)
  rightSlot?: React.ReactNode;
  // para el botón login redirect
  loginNext?: string; // default: current pathname
};

export default function HeaderCosmos({
  logoHref = "/",
  showThemeToggle = true,
  showWishlist = true,
  showCart = true,
  rightSlot,
  loginNext,
}: HeaderCosmosProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentTheme = resolvedTheme ?? theme;
  const isDark = currentTheme === "dark";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // wishlist dropdown
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const wishlistRef = useRef<HTMLDivElement | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const wishlistPreview = wishlist.slice(0, 4);

  // carrito
  const carritoApi = useCarrito();
  const carrito = carritoApi?.carrito ?? [];
  const setShowCart = carritoApi?.setShowCart;

  const cartCount = useMemo(() => {
    return (carrito ?? []).reduce((acc: number, item: any) => {
      const c = Number(item?.cantidad);
      return acc + (Number.isFinite(c) ? c : 0);
    }, 0);
  }, [carrito]);

  const email = user?.email ?? "";
  const displayName = user?.displayName ?? "";
  const photoURL = user?.photoURL ?? "";
  const initials = initialsFromUser(displayName, email);

  const nextPath = loginNext ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  // cerrar wishlist cuando haces click afuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wishlistOpen) return;
      const target = e.target as Node;
      if (wishlistRef.current && !wishlistRef.current.contains(target)) {
        setWishlistOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [wishlistOpen]);

  // cargar wishlist por usuario
  useEffect(() => {
    if (!user) {
      setWishlist([]);
      setWishlistOpen(false);
      return;
    }
    try {
      const key = `wishlist:${user.uid}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as WishlistItem[]) : [];
      setWishlist(Array.isArray(parsed) ? parsed : []);
    } catch {
      setWishlist([]);
    }
  }, [user?.uid]);

  function persistWishlist(next: WishlistItem[]) {
    if (!user) return;
    setWishlist(next);
    try {
      localStorage.setItem(`wishlist:${user.uid}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function removeWishlistItem(id: string) {
    persistWishlist(wishlist.filter((w) => w.id !== id));
  }

  async function doLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
      setDropdownOpen(false);
      setWishlistOpen(false);
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    } finally {
      setLoggingOut(false);
    }
  }

  function goLogin() {
    router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  function goCuenta() {
    setDropdownOpen(false);
    router.push(`/cuenta`);
  }

  function goWishlistPage() {
    setWishlistOpen(false);
    router.push("/wishlist");
  }

  return (
    <header className="sticky top-0 z-40">
      <div className="px-4 pt-3">
        <div className="h-16 rounded-2xl border border-border/60 bg-card/70 text-card-foreground backdrop-blur-md shadow-sm flex items-center justify-between px-4">
          <Link href={logoHref} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mounted && isDark ? "/brand/logo-cosmos-dark.png" : "/brand/logo-cosmos.png"}
              alt="Cosmos"
              className="h-6 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-3">
            {showThemeToggle && mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => withThemeTransition(() => setTheme(isDark ? "light" : "dark"))}
                className="rounded-full border border-transparent hover:border-border/60 hover:bg-muted"
                aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                title={isDark ? "Modo claro" : "Modo oscuro"}
                type="button"
              >
                {isDark ? (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            )}

            {/* slot extra: botón de acción */}
            {rightSlot}

            {/* Wishlist dropdown (solo logeado) */}
            {showWishlist && user && (
              <div className="relative" ref={wishlistRef}>
                <button
                  type="button"
                  onClick={() => setWishlistOpen((v) => !v)}
                  className="inline-flex items-center justify-center rounded-full h-10 w-10 border border-border/60 bg-background/60 hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring relative"
                  aria-label="Wishlist"
                  title="Wishlist"
                >
                  <Heart className="h-5 w-5 text-muted-foreground" />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-extrabold grid place-items-center border border-background">
                      {wishlist.length > 9 ? "9+" : wishlist.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {wishlistOpen && (
                    <motion.div
                      className="absolute right-0 mt-2 w-[360px] max-w-[88vw] rounded-2xl border border-border/60 bg-card text-card-foreground shadow-2xl overflow-hidden"
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="p-4 border-b border-border/60 flex items-center justify-between">
                        <div>
                          <div className="font-extrabold">Wishlist</div>
                          <div className="text-xs text-muted-foreground">
                            {wishlist.length === 0
                              ? "Aún no tienes favoritos"
                              : `${wishlist.length} favorito${wishlist.length > 1 ? "s" : ""}`}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={goWishlistPage}
                          className="inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:underline"
                        >
                          Ver todo <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="max-h-[320px] overflow-auto">
                        {wishlist.length === 0 ? (
                          <div className="p-6 text-sm text-muted-foreground">
                            Guarda tus productos favoritos tocando el corazón en cada producto.
                          </div>
                        ) : (
                          <div className="p-2">
                            {wishlistPreview.map((w) => (
                              <div
                                key={w.id}
                                className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/60 transition"
                              >
                                <div className="h-11 w-11 rounded-xl overflow-hidden border border-border/60 bg-muted shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={w.imagen || "/placeholder.png"}
                                    alt={w.nombre}
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-sm truncate">{w.nombre}</div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeWishlistItem(w.id)}
                                  className="rounded-full h-9 w-9 grid place-items-center border border-border/60 bg-background/60 hover:bg-muted transition"
                                  title="Quitar"
                                  aria-label="Quitar"
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Carrito con contador */}
            {showCart && (
              <button
                type="button"
                onClick={() => setShowCart?.(true)}
                className="relative inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold border border-border/60 bg-background/60 hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Carrito"
                title="Carrito"
              >
                <ShoppingBag className="h-4 w-4" />
                Carrito

                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-extrabold grid place-items-center border border-background">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            )}

            {!user ? (
              <button
                type="button"
                onClick={goLogin}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-extrabold border border-border/60 bg-card hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Iniciar sesión"
                title="Iniciar sesión"
                disabled={authLoading}
              >
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </button>
            ) : (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Menú de usuario"
                  >
                    <Avatar className="h-9 w-9 ring-1 ring-border/60">
                      <AvatarImage
                        src={photoURL ? photoURL : undefined}
                        alt={displayName || email || "Usuario"}
                      />
                      <AvatarFallback className="bg-primary/20 text-foreground">
                        <span className="text-xs font-extrabold">{initials}</span>
                      </AvatarFallback>
                    </Avatar>

                    <div className="text-sm leading-tight hidden md:block text-left">
                      <p className="font-semibold text-foreground">
                        {displayName || (email ? email.split("@")[0] : "Usuario")}
                      </p>
                      <p className="text-xs text-muted-foreground">{email}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {displayName || (email ? email.split("@")[0] : "Usuario")}
                      </span>
                      <span className="text-xs text-muted-foreground">{email}</span>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      goCuenta();
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Mi cuenta
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      doLogout();
                    }}
                    disabled={loggingOut}
                    className="text-destructive focus:text-destructive"
                  >
                    {loggingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cerrando...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar sesión
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}