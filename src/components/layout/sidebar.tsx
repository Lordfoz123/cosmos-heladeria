"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image"; // ✅ Importado para los logos
import { useTheme } from "next-themes"; // ✅ Importado para detectar el tema
import {
  LayoutDashboard,
  ShoppingCart,
  GraduationCap,
  Settings,
  Package,
  BookOpen,
  Factory,
  Store,
  Truck,
  TrendingUp,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventario", href: "/dashboard/inventario", icon: Package },
  { name: "Recetario", href: "/dashboard/recetas", icon: BookOpen },
  { name: "Producción", href: "/dashboard/produccion", icon: Factory },
  { name: "Catálogo", href: "/dashboard/catalogo", icon: Store },
  { name: "Pedidos", href: "/dashboard/pedidos", icon: Truck },
  { name: "Ventas", href: "/dashboard/ventas", icon: TrendingUp },
  { name: "Tienda Online", href: "/tienda", icon: ShoppingCart },
  { name: "Capacitaciones", href: "/dashboard/capacitaciones", icon: GraduationCap },
  { name: "Usuarios", href: "/dashboard/usuarios", icon: Users },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { theme, resolvedTheme } = useTheme();

  // ✅ Detectar si es modo oscuro para cambiar el logo
  const isDark = (resolvedTheme ?? theme) === "dark";
  const logoSrc = isDark ? "/brand/logo-cosmos-dark.png" : "/brand/logo-cosmos.png";

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  return (
    <>
      {/* 1. OVERLAY MÓVIL */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] md:hidden animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 2. SIDEBAR PRINCIPAL */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[70] h-full bg-card border-r border-border text-card-foreground shadow-2xl transition-all duration-300 ease-in-out flex flex-col",
          "md:translate-x-0 md:static md:shadow-none",
          isOpen ? "translate-x-0 w-72" : "-translate-x-full",
          isCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
        
        {/* --- HEADER SIDEBAR (LOGO SOLO) --- */}
        <div className={cn(
          "flex h-16 items-center px-4 border-b border-border transition-all duration-300 relative shrink-0",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center justify-center w-full overflow-hidden">
            {/* Contenedor del Logo con tamaños originales */}
            <div className={cn(
              "relative transition-all duration-300",
              isCollapsed ? "h-8 w-8" : "h-10 w-28"
            )}>
               <Image 
                src={logoSrc} 
                alt="Logo Cosmos" 
                fill
                className="object-contain"
                priority
               />
            </div>
          </div>

          <button 
            onClick={() => setIsOpen(false)} 
            className="md:hidden p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* --- BOTÓN TOGGLE ESCRITORIO --- */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 bg-card border border-border rounded-full p-1.5 shadow-md text-muted-foreground hover:text-primary hover:border-primary transition-all z-50 items-center justify-center"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* --- NAVEGACIÓN --- */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1 custom-scrollbar">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={cn(
                  "group flex items-center rounded-xl py-3 transition-all duration-200 relative",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed ? "justify-center px-0" : "px-4 gap-3"
                )}
              >
                <item.icon
                  className={cn(
                    "transition-all duration-200 shrink-0",
                    isCollapsed ? "h-6 w-6" : "h-5 w-5",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />

                <span className={cn(
                  "whitespace-nowrap transition-all duration-300 origin-left",
                  isCollapsed ? "w-0 opacity-0 overflow-hidden absolute" : "w-auto opacity-100 static"
                )}>
                  {item.name}
                </span>

                {isCollapsed && isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/30 rounded-l-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* --- FOOTER / CONFIGURACIÓN --- */}
        <div className="border-t border-border p-4 bg-muted/5 shrink-0">
          <Link
            href="/dashboard/configuracion"
            title={isCollapsed ? "Configuración" : ""}
            className={cn(
              "flex items-center rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
              isCollapsed ? "justify-center px-0" : "px-3 gap-3"
            )}
          >
            <Settings className={cn("shrink-0", isCollapsed ? "h-6 w-6" : "h-5 w-5")} />
            <span className={cn(
              "whitespace-nowrap transition-all duration-300",
              isCollapsed ? "w-0 opacity-0 overflow-hidden absolute" : "w-auto opacity-100 static"
            )}>
              Configuración
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}