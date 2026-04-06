"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom"; 
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react"; 

type CartItem = {
  producto: {
    id: string;
    nombre: string;
    imagen?: string;
    precio: number;
    descripcion?: string;
  };
  tamaño: string;
  cantidad: number;
};

type CartSliderProps = {
  show: boolean;
  cart: CartItem[];
  onClose: () => void;
  updateCantidad: (index: number, cantidad: number) => void;
  removeFromCart: (index: number) => void;
  total: number;
  finalizarCompra: () => void;
};

function formatPEN(amount: number) {
  const n = Number(amount || 0);
  return `S/ ${n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CartSlider({
  show,
  cart,
  onClose,
  updateCantidad,
  removeFromCart,
  total,
  finalizarCompra,
}: CartSliderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop con Blur */}
          <motion.div
            className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Panel Lateral adaptativo al modo oscuro */}
          <motion.aside
            className="fixed top-0 right-0 z-[99999] w-full max-w-md h-full bg-background text-foreground shadow-2xl flex flex-col rounded-l-[2rem] border-l border-border overflow-hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            {/* Header del Carrito */}
            <div className="px-8 py-6 bg-card border-b border-border flex items-center justify-between shrink-0 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-md">
                    <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight leading-none">Mi Orden</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {cart.length} {cart.length === 1 ? "Producto" : "Productos"} en total
                    </p>
                </div>
              </div>
              <button
                className="w-10 h-10 bg-muted hover:bg-accent text-muted-foreground rounded-full flex items-center justify-center transition-colors"
                onClick={onClose}
                aria-label="Cerrar carrito"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Productos */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative bg-background">
              {cart.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground space-y-4 px-8 text-center animate-in fade-in duration-500">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-2">
                    <ShoppingBag className="w-10 h-10 opacity-20" />
                  </div>
                  <p className="font-bold uppercase tracking-widest">Tu carrito está vacío</p>
                  <p className="text-xs font-medium leading-relaxed">Aún no has agregado ningún helado. ¡Explora nuestro catálogo y date un gusto!</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-card p-3 rounded-2xl border border-border shadow-sm flex gap-4 items-center group transition-all hover:shadow-md"
                  >
                    {/* Imagen del Producto */}
                    <div className="w-20 h-24 shrink-0 bg-muted rounded-xl border border-border overflow-hidden relative">
                        <img
                        src={item.producto.imagen || "/placeholder.png"}
                        alt={item.producto.nombre}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    </div>

                    {/* Info del Producto */}
                    <div className="flex-1 min-w-0 py-2 flex flex-col justify-between h-full">
                      <div>
                        <h4 className="font-bold text-sm truncate leading-tight mb-1.5" title={item.producto.nombre}>
                            {item.producto.nombre}
                        </h4>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted px-2 py-1 rounded-md tracking-widest">
                            {item.tamaño}
                        </span>
                      </div>
                      <div className="font-bold text-emerald-500 text-sm tabular-nums tracking-tighter mt-2">
                        {formatPEN(Number(item.producto.precio))}
                      </div>
                    </div>

                    {/* Controles de Cantidad y Eliminar */}
                    <div className="flex flex-col items-end justify-between h-full gap-3 shrink-0 py-1">
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Quitar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center bg-muted border border-border rounded-xl p-1 shadow-sm">
                        <button
                          onClick={() => updateCantidad(idx, item.cantidad - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-background text-foreground shadow-sm hover:text-destructive transition-colors disabled:opacity-40"
                          disabled={item.cantidad <= 1}
                          aria-label="Reducir"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold tabular-nums">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => updateCantidad(idx, item.cantidad + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-colors"
                          aria-label="Aumentar"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer: Total y Finalizar */}
            <div className="p-8 bg-card border-t border-border shrink-0 shadow-2xl relative z-10">
              <div className="flex justify-between items-end mb-6">
                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Total a Pagar</span>
                <span className="text-3xl font-bold text-emerald-500 tracking-tighter tabular-nums leading-none">
                  {formatPEN(Number(total))}
                </span>
              </div>

              <button
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90"
                onClick={finalizarCompra}
                disabled={cart.length === 0}
              >
                Procesar Pago <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body 
  );
}