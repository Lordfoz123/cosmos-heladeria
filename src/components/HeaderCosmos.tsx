"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  BarChart3,
  Menu, 
  X     
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
  logoHref?: string; 
  showThemeToggle?: boolean; 
  showWishlist?: boolean; 
  showCart?: boolean; 
  rightSlot?: React.ReactNode;
  loginNext?: string; 
};

// 🔥 EL MENÚ EXACTO QUE PIDIÓ EL CLIENTE (RUTA CORREGIDA) 🔥
const NAV_LINKS = [
  { name: "Inicio", href: "/" },
  { name: "Nosotros", href: "/nosotros" },
  { name: "Productos", href: "/tienda" },
  { name: "Contáctanos", href: "/contacto" },
  { name: "Encuéntranos", href: "/encuentranos" }, // 🔥 RUTA ACTUALIZADA A /encuentranos 🔥
];

export default function HeaderCosmos({
  logoHref = "/",
  showThemeToggle = true,
  showWishlist = true,
  showCart = true,
  rightSlot,
  loginNext,
}: HeaderCosmosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentTheme = resolvedTheme ?? theme;
  const isDark = currentTheme === "dark";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [wishlistOpen, setWishlistOpen] = useState(false);
  const wishlistRef = useRef<HTMLDivElement | null>(null);

  const carritoApi = useCarrito();
  const carrito = carritoApi?.carrito ?? [];
  const setShowCart = carritoApi?.setShowCart;
  
  const wishlist = carritoApi?.wishlist ?? [];
  const removeFromWishlist = carritoApi?.removeFromWishlist;
  
  const wishlistPreview = wishlist.slice(0, 4);

  // 🔥 ELIMINADO EL CORREO ANTIGUO, SOLO QUEDA EL OFICIAL 🔥
  const adminEmails = [
    "infinitasposibilidadescosmos@gmail.com"
  ];
  
  const isAdmin = adminEmails.includes(user?.email || "");

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

  function goDashboard() {
    setDropdownOpen(false);
    router.push("/dashboard");
  }

  return (
    <>
      <header className="sticky top-0 z-40">
        <div className="px-4 pt-3">
          <div className="h-16 rounded-2xl border border-border/60 bg-card/70 text-card-foreground backdrop-blur-md shadow-sm flex items-center justify-between px-4 relative">
            
            {/* IZQUIERDA: LOGO */}
            <Link href={logoHref} className="flex items-center gap-3 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mounted && isDark ? "/brand/logo-cosmos-dark.png" : "/brand/logo-cosmos.png"}
                alt="Cosmos"
                className="h-6 w-auto object-contain"
              />
            </Link>

            {/* CENTRO: NAVEGACIÓN DESKTOP */}
            <nav className="hidden lg:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    className={`text-sm font-extrabold transition-colors relative py-2 ${
                      isActive ? "text-[#bcd4dc]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <motion.div 
                        layoutId="active-nav-underline"
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#bcd4dc] rounded-t-full"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* DERECHA: HERRAMIENTAS Y USUARIO */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Botón Theme Toggle */}
              {showThemeToggle && mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => withThemeTransition(() => setTheme(isDark ? "light" : "dark"))}
                  className="rounded-full border border-transparent hover:border-border/60 hover:bg-muted hidden sm:flex"
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
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#bcd4dc] text-black text-[11px] font-extrabold grid place-items-center border border-background">
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
                            className="inline-flex items-center gap-2 text-sm font-extrabold text-[#bcd4dc] hover:underline"
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
                                    onClick={() => removeFromWishlist?.(w.id)}
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
                  className="relative inline-flex items-center justify-center sm:justify-start gap-2 rounded-full w-10 sm:w-auto h-10 sm:px-4 sm:py-2 font-extrabold border border-border/60 bg-background/60 hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  aria-label="Carrito"
                  title="Carrito"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span className="hidden sm:inline">Carrito</span>

                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1 rounded-full bg-[#bcd4dc] text-black text-[11px] font-extrabold grid place-items-center border border-background">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Botón de Menú Móvil (Hamburguesa) */}
              <button 
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menú"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Usuario Login / Dropdown */}
              {!user ? (
                <button
                  type="button"
                  onClick={goLogin}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 font-extrabold border border-border/60 bg-card hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  aria-label="Iniciar sesión"
                  title="Iniciar sesión"
                  disabled={authLoading}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Iniciar sesión</span>
                </button>
              ) : (
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="hidden sm:flex items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ml-1"
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

                    {isAdmin && (
                      <>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            goDashboard();
                          }}
                          className="font-medium cursor-pointer"
                        >
                          <BarChart3 className="mr-2 h-4 w-4 text-[#bcd4dc]" />
                          Panel Administrativo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        goCuenta();
                      }}
                      className="cursor-pointer"
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
                      className="text-destructive focus:text-destructive cursor-pointer"
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

      {/* 🔥 MENÚ MÓVIL DESPLEGABLE (OVERLAY) 🔥 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl pt-28 px-6 lg:hidden flex flex-col"
          >
            <button 
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-muted text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>

            <nav className="flex flex-col gap-6 mt-8">
              {NAV_LINKS.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-3xl font-black text-foreground tracking-tighter border-b border-border/50 pb-4"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="mt-auto pb-12 flex flex-col gap-4">
              {!user ? (
                <button
                  onClick={() => { setMobileMenuOpen(false); goLogin(); }}
                  className="w-full py-4 rounded-2xl font-black bg-primary text-primary-foreground flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" /> Iniciar Sesión
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border">
                    <Avatar className="h-12 w-12 ring-1 ring-border/60">
                      <AvatarImage src={photoURL ? photoURL : undefined} />
                      <AvatarFallback className="bg-primary/20"><span className="font-extrabold">{initials}</span></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground leading-tight">{displayName || "Usuario"}</p>
                      <p className="text-xs text-muted-foreground">{email}</p>
                    </div>
                  </div>
                  
                  {isAdmin && (
                     <button onClick={() => { setMobileMenuOpen(false); goDashboard(); }} className="w-full py-4 rounded-2xl font-bold bg-muted text-foreground flex items-center justify-center gap-2 border border-border">
                       <BarChart3 className="w-5 h-5 text-[#bcd4dc]" /> Panel Admin
                     </button>
                  )}

                  <button onClick={() => { setMobileMenuOpen(false); doLogout(); }} className="w-full py-4 rounded-2xl font-bold bg-destructive/10 text-destructive flex items-center justify-center gap-2 border border-destructive/20">
                    <LogOut className="w-5 h-5" /> Cerrar Sesión
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}