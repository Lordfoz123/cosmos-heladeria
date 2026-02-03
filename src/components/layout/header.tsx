"use client";

import { useState } from "react";
import { Bell, Search, Sun, Moon, User, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function withThemeTransition(run: () => void) {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  run();
  window.setTimeout(() => root.classList.remove("theme-transition"), 260);
}

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

export function Header() {
  const router = useRouter();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === "dark";

  const { user } = useAuth();
  const email = user?.email ?? "";
  const displayName = user?.displayName ?? "";
  const photoURL = user?.photoURL ?? "";
  const initials = initialsFromUser(displayName, email);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function doLogout() {
    try {
      setLoggingOut(true);
      await signOut(auth);
      router.replace("/login");
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-card/85 text-card-foreground px-6 backdrop-blur-md shadow-sm">
        {/* Search */}
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar sabores, ventas, pedidos..."
              className="pl-10 bg-background text-foreground border-border/60 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
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

          {/* Notifications (placeholder) */}
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full border border-transparent hover:border-border/60 hover:bg-muted"
            aria-label="Notificaciones"
            type="button"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          </Button>

          {/* User dropdown */}
          <div className="flex items-center gap-3 border-l border-border/60 pl-4">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Menú de usuario"
                >
                  <Avatar className="h-9 w-9 ring-1 ring-border/60">
                    <AvatarImage
                      src={photoURL || undefined}
                      alt={displayName || email || "Usuario"}
                    />
                    <AvatarFallback className="bg-primary/20 text-foreground">
                      {user ? (
                        <span className="text-xs font-extrabold">{initials}</span>
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-sm leading-tight hidden sm:block text-left">
                    <p className="font-semibold text-foreground">
                      {displayName || (email ? email.split("@")[0] : "Invitado")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {email || "Sin sesión"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {displayName || (email ? email.split("@")[0] : "Invitado")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {email || "Sin sesión"}
                    </span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* ✅ Logout en rojo + cierra dropdown antes de abrir modal */}
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!user) return;

                    setDropdownOpen(false); // 👈 cierra el menú
                    // pequeño delay opcional para que la animación del dropdown termine
                    window.setTimeout(() => setConfirmOpen(true), 50);
                  }}
                  disabled={!user}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Modal confirm (misma línea gráfica que tus modales) */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            onClick={() => (loggingOut ? null : setConfirmOpen(false))}
          >
            <motion.div
              className="bg-card text-card-foreground w-full max-w-md rounded-2xl shadow-2xl relative border border-border/60 p-0"
              initial={{ opacity: 0, y: 38, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 35, scale: 0.97 }}
              transition={{
                duration: 0.32,
                type: "spring",
                damping: 20,
                stiffness: 210,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close X */}
              <button
                className="absolute top-5 right-7 text-2xl text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                onClick={() => setConfirmOpen(false)}
                aria-label="Cerrar"
                type="button"
                disabled={loggingOut}
              >
                ×
              </button>

              <div className="p-7">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20 p-2">
                    <LogOut className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-extrabold text-xl text-foreground">
                      ¿Cerrar sesión?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vas a salir del panel. Luego tendrás que iniciar sesión de
                      nuevo.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className={[
                      "px-5 py-2 rounded-full font-bold shadow-sm transition-all duration-200",
                      "bg-muted hover:bg-muted/80 text-foreground border border-border/60",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      loggingOut ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                    onClick={() => setConfirmOpen(false)}
                    disabled={loggingOut}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className={[
                      "px-5 py-2 rounded-full font-bold shadow-sm transition-all duration-200",
                      "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      loggingOut ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                    onClick={doLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? "Cerrando..." : "Sí, cerrar sesión"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}