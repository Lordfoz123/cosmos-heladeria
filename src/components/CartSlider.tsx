"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  return `S/${n.toLocaleString("es-PE", {
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
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="fixed top-0 right-0 z-50 w-full max-w-md h-full bg-card text-card-foreground shadow-2xl p-7 flex flex-col border-l border-border/60"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              stiffness: 330,
              damping: 34,
              duration: 0.28,
            }}
          >
            <button
              className="absolute top-6 right-7 text-3xl text-muted-foreground hover:text-foreground hover:scale-110 transition"
              onClick={onClose}
              aria-label="Cerrar carrito"
              type="button"
            >
              ×
            </button>

            <h2 className="text-2xl font-extrabold mb-7 flex items-center gap-2 pl-2 text-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
                aria-hidden="true"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                <path d="M17 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                <path d="M17 17h-11v-14h-2" />
                <path d="M6 5l14 1l-1 7h-13" />
              </svg>
              Carrito de compras
              {cart.length > 0 && (
                <span className="ml-2 px-3 py-0.5 bg-primary/10 text-primary text-sm rounded-full font-semibold border border-primary/15">
                  {cart.length} producto{cart.length > 1 ? "s" : ""}
                </span>
              )}
            </h2>

            <div className="flex-1 overflow-y-auto pr-2">
              {cart.length === 0 ? (
                <div className="text-muted-foreground text-center my-24 font-medium text-lg select-none">
                  Tu carrito está vacío
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 items-center border-b border-border/60 py-4 group hover:bg-muted/60 transition rounded-xl px-2"
                  >
                    <img
                      src={item.producto.imagen || "/placeholder.png"}
                      alt={item.producto.nombre}
                      className="w-14 h-12 object-cover rounded-lg border border-border/60 shadow-sm bg-background"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground flex items-center justify-between gap-2">
                        <span className="truncate">{item.producto.nombre}</span>
                      </div>

                      <div className="text-xs text-muted-foreground mb-1">
                        {item.tamaño}
                      </div>

                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold">
                        {formatPEN(Number(item.producto.precio))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCantidad(idx, item.cantidad - 1)}
                          className={[
                            "px-2 pb-0.5 rounded-l font-extrabold border transition",
                            "bg-muted hover:bg-muted/80 text-foreground border-border/60",
                            item.cantidad <= 1
                              ? "opacity-50 cursor-not-allowed"
                              : "",
                          ].join(" ")}
                          disabled={item.cantidad <= 1}
                          aria-label="Reducir"
                          type="button"
                        >
                          -
                        </button>

                        <span className="font-extrabold px-2 text-foreground">
                          {item.cantidad}
                        </span>

                        <button
                          onClick={() => updateCantidad(idx, item.cantidad + 1)}
                          className="px-2 pb-0.5 rounded-r font-extrabold border transition bg-muted hover:bg-muted/80 text-foreground border-border/60"
                          aria-label="Aumentar"
                          type="button"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-xs text-destructive/70 mt-1 hover:underline hover:text-destructive"
                        aria-label="Quitar producto"
                        type="button"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total y finalizar */}
            <div className="pt-6 border-t border-border/60 mt-8">
              <div className="flex justify-between text-lg font-extrabold px-2">
                <span className="text-foreground">Total</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {formatPEN(Number(total))}
                </span>
              </div>

              <button
                className="mt-6 w-full bg-primary text-primary-foreground py-3 rounded-xl font-extrabold shadow-xl hover:bg-primary/90 transition text-lg disabled:opacity-60"
                onClick={finalizarCompra}
                disabled={cart.length === 0}
                type="button"
              >
                Finalizar compra
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}