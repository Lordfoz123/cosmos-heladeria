"use client";

import { useState } from "react";
import { Sun, Moon, LogOut, Menu, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image"; 

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onMenuClick?: () => void;
}

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
    return (parts[0]?.[0] ?? "A").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
  }
  return (email?.slice(0, 2) || "A").toUpperCase();
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const isDark = (resolvedTheme ?? theme) === "dark";
  const logoSrc = isDark ? "/brand/logo-cosmos-dark.png" : "/brand/logo-cosmos.png";

  const { user } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // 🔥 LÓGICA DE ADMINISTRADOR CON TU CORREO REAL 🔥
  const isAdmin = user?.email === "lordfoz1@gmail.com"; 

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

  const initials = initialsFromUser(user?.displayName, user?.email);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-card/85 text-card-foreground px-4 md:px-6 backdrop-blur-md shadow-sm w-full">
        
        {/* LADO IZQUIERDO: Logo (solo móvil) + Menú Móvil */}
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-lg hover:bg-muted"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </Button>

          <div className="md:hidden flex items-center mr-2">
            <Image 
              src={logoSrc} 
              alt="Cosmos Logo" 
              width={32} 
              height={32} 
              className="object-contain"
            />
          </div>
        </div>

        {/* LADO DERECHO: Acciones */}
        <div className="flex items-center gap-1 sm:gap-3">
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => withThemeTransition(() => setTheme(isDark ? "light" : "dark"))}
            className="rounded-full hover:bg-muted"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Perfil */}
          <div className="ml-1 sm:ml-2 pl-2 sm:pl-4 border-l border-border/60">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-full outline-none group">
                  <Avatar className="h-9 w-9 ring-1 ring-border/60 group-hover:ring-primary transition-all">
                    <AvatarImage src={user?.photoURL || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block text-left leading-tight">
                    <p className="text-sm font-bold truncate max-w-[120px]">{user?.displayName || "Usuario"}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">{user?.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 mt-2">
                <DropdownMenuLabel className="lg:hidden">
                    <p className="text-sm font-bold">{user?.displayName || "Usuario"}</p>
                    <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator className="lg:hidden" />
                
                {/* 🔥 PESTAÑA DE DASHBOARD PARA ADMINS 🔥 */}
                {isAdmin && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push("/dashboard"); 
                      }} 
                      className="cursor-pointer font-medium"
                    >
                      <BarChart3 className="mr-2 h-4 w-4 text-emerald-500" />
                      Ir al Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Modal de Logout */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loggingOut && setConfirmOpen(false)}
          >
            <motion.div
              className="bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-border p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                   <Image src={logoSrc} alt="Cosmos" width={48} height={48} />
                </div>
                <h3 className="text-xl font-bold mb-2">¿Cerrar sesión?</h3>
                <p className="text-sm text-muted-foreground mb-6">Vas a salir del panel de Cosmos Heladería.</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loggingOut} className="rounded-xl">
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={doLogout} disabled={loggingOut} className="rounded-xl font-bold">
                    {loggingOut ? "Cerrando..." : "Sí, salir"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}