"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  IceCreamCone,
  ShoppingCart,
  GraduationCap,
  Settings,
  Package,
  TrendingUp,
  Users,
  Factory,
} from "lucide-react";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Producción", href: "/dashboard/produccion", icon: Factory },

  { name: "Catálogo de Sabores", href: "/dashboard/catalogo", icon: IceCreamCone },
  { name: "Inventario", href: "/dashboard/inventario", icon: Package },
  { name: "Ventas", href: "/dashboard/ventas", icon: TrendingUp },
  { name: "Capacitaciones", href: "/dashboard/capacitaciones", icon: GraduationCap },
  { name: "Gestión de Usuarios", href: "/dashboard/usuarios", icon: Users },
  { name: "Tienda Online", href: "/tienda", icon: ShoppingCart },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground shadow-sm">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <IceCreamCone className="h-6 w-6 text-primary" />
        <div className="ml-3">
          <span className="text-xl font-bold text-foreground block leading-tight">Cosmos</span>
          <span className="text-xs text-muted-foreground">Heladería Artesanal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-border p-3">
        <Link
          href="/dashboard/configuracion"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
          Configuración
        </Link>
      </div>
    </div>
  );
}