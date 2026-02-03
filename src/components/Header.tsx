"use client";

import { useCarrito } from "@/components/CarritoContext";
import CartSlider from "@/components/CartSlider";
import Link from "next/link";
import { ShoppingCart, IceCreamCone, Bell } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

type HeaderProps = {
  /**
   * Si es false, no muestra la campanita.
   * (Por defecto true para no romper tu UI actual)
   */
  showNotifications?: boolean;
};

export default function Header({ showNotifications = true }: HeaderProps) {
  const {
    carrito,
    showCart,
    setShowCart,
    updateCantidad,
    removeFromCart,
    total,
    finalizarCompra,
  } = useCarrito();

  // Si luego conectas notificaciones reales, aquí pones el count.
  const notifCount = 0;

  const iconBtn =
    "relative h-10 w-10 rounded-full inline-flex items-center justify-center " +
    "bg-card hover:bg-muted border border-border/60 " +
    "text-muted-foreground hover:text-foreground " +
    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-card/85 text-card-foreground backdrop-blur-md border-b border-border/60 flex items-center justify-between px-4 md:px-10 py-3">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="rounded-full bg-primary/20 p-2 border border-primary/25 transition-transform group-hover:scale-105">
            <IceCreamCone className="w-7 h-7 text-white" strokeWidth={2} />
          </span>

          <span className="font-extrabold text-xl md:text-2xl text-foreground tracking-tight leading-none">
            Cosmos{" "}
            <span className="font-light text-base md:text-xl text-muted-foreground">
              Tienda
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Toggle tema */}
          <ThemeToggle />

          {/* Campanita (placeholder) */}
          {showNotifications && (
            <button className={iconBtn} aria-label="Notificaciones" type="button">
              <Bell className="h-5 w-5" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center bg-destructive text-destructive-foreground border border-destructive/30 shadow-sm">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setShowCart(true)}
            className={[
              "relative inline-flex items-center gap-2 rounded-xl px-4 md:px-5 py-2 font-extrabold",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "border border-primary/30 shadow-sm transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
            ].join(" ")}
            aria-label="Ver carrito"
            type="button"
          >
            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
            <span className="hidden md:inline">Carrito</span>

            {carrito.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground border border-destructive/30 font-extrabold rounded-full min-w-6 h-6 px-2 flex items-center justify-center text-xs shadow-sm">
                {carrito.length > 99 ? "99+" : carrito.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <CartSlider
        show={showCart}
        cart={carrito}
        onClose={() => setShowCart(false)}
        updateCantidad={updateCantidad}
        removeFromCart={removeFromCart}
        total={total}
        finalizarCompra={finalizarCompra}
      />
    </>
  );
}