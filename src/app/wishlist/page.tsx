"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

import { useAuth } from "@/components/auth/AuthProvider";
import { useWishlist } from "@/components/WishlistContext";
import { useCarrito } from "@/components/CarritoContext";
import CartSlider from "@/components/CartSlider";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ArrowLeft,
  Heart,
  Trash2,
  ShoppingBag,
  Sun,
  Moon,
  User,
  LogOut,
  Loader2,
} from "lucide-react";

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

export default function WishlistPage() {
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();
  const { items, remove, clear } = useWishlist();

  const {
    carrito,
    showCart,
    setShowCart,
    updateCantidad,
    removeFromCart,
    total,
    finalizarCompra,
  } = useCarrito();

  // contador carrito
  const cartCount = useMemo(() => {
    return (carrito ?? []).reduce((acc: number, item: any) => {
      const c = Number(item?.cantidad);
      return acc + (Number.isFinite(c) ? c : 0);
    }, 0);
  }, [carrito]);

  // theme
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentTheme = resolvedTheme ?? theme;
  const isDark = currentTheme === "dark";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/wishlist");
  }, [authLoading, user, router]);

  const email = user?.email ?? "";
  const displayName = user?.displayName ?? "";
  const photoURL = user?.photoURL ?? "";
  const initials = initialsFromUser(displayName, email);

  async function doLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
      setDropdownOpen(false);
      router.replace(`/login?next=/tienda`);
    } finally {
      setLoggingOut(false);
    }
  }

  function goCuenta() {
    setDropdownOpen(false);
    router.push(`/cuenta`);
  }

  if (!user) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center text-muted-foreground">
        Cargando...
      </main>
    );
  }

  return (
    <main className="min-h-[100vh] w-full bg-background text-foreground">
      {/* HEADER igual a tienda */}
      <header className="sticky top-0 z-40">
        <div className="px-4 pt-3">
          <div className="h-16 rounded-2xl border border-border/60 bg-card/70 text-card-foreground backdrop-blur-md shadow-sm flex items-center justify-between px-4">
            <Link href="/tienda" className="flex items-center gap-3">
              <img
                src={
                  mounted && isDark
                    ? "/brand/logo-cosmos-dark.png"
                    : "/brand/logo-cosmos.png"
                }
                alt="Cosmos"
                className="h-6 w-auto object-contain"
              />
              
            </Link>

            <div className="flex items-center gap-3">
              {/* theme toggle */}
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    withThemeTransition(() => setTheme(isDark ? "light" : "dark"))
                  }
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

              {/* carrito con contador */}
              <button
                type="button"
                onClick={() => setShowCart(true)}
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

              {/* dropdown usuario */}
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
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link
              href="/tienda"
              className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a tienda
            </Link>

            <h1 className="text-3xl font-extrabold mt-2 flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-600" />
              Mi wishlist
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              {items.length === 0
                ? "Aún no tienes productos guardados."
                : `${items.length} producto${items.length > 1 ? "s" : ""} guardado${
                    items.length > 1 ? "s" : ""
                  }.`}
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-extrabold border border-border/60 bg-card hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
              Vaciar wishlist
            </button>
          )}
        </div>

        {/* Empty */}
        {items.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-border/60 bg-card p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl border border-border/60 bg-muted grid place-items-center">
              <Heart className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold">Tu wishlist está vacía</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              En la tienda toca el corazón de un producto para guardarlo aquí.
            </p>
            <Link
              href="/tienda"
              className="inline-flex mt-6 items-center justify-center rounded-full px-6 py-3 font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              Ir a la tienda
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.imagen || "/placeholder.png"}
                      alt={it.nombre}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      className="absolute top-3 right-3 h-10 w-10 rounded-full grid place-items-center border border-border/60 bg-background/70 backdrop-blur hover:bg-muted transition"
                      aria-label="Quitar de wishlist"
                      title="Quitar"
                    >
                      <Trash2 className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="p-4 flex-1">
                    <div className="font-extrabold text-foreground line-clamp-2">
                      {it.nombre}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ID: {it.id}
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex gap-2">
                    <Link
                      href={`/producto/${it.id}`}
                      className="flex-1 inline-flex items-center justify-center rounded-xl px-3 py-2 font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 transition"
                    >
                      Ver producto
                    </Link>

                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-border/60 bg-card hover:bg-muted transition"
                      aria-label="Quitar"
                      title="Quitar"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <div className="mt-10 flex justify-center">
              <Link
                href="/tienda"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-extrabold border border-border/60 bg-card hover:bg-muted transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Seguir comprando
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Cart slider */}
      <CartSlider
        show={showCart}
        cart={carrito as any}
        onClose={() => setShowCart(false)}
        updateCantidad={updateCantidad as any}
        removeFromCart={removeFromCart as any}
        total={total}
        finalizarCompra={finalizarCompra}
      />
    </main>
  );
}