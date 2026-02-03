"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Plus, X } from "lucide-react";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

type ColumnKey = "por_hacer" | "en_proceso" | "listo";

type CardLote = {
  id: string;
  title: string;
  sub: string;
  status: ColumnKey;
};

export function ProduccionTab() {
  const [open, setOpen] = useState(false);

  const columns = useMemo(() => {
    const seed: CardLote[] = [
      {
        id: "seed-base-coco",
        title: "Base Coco (Sub-receta)",
        sub: "Batch 10 kg · Pendiente",
        status: "por_hacer",
      },
      {
        id: "seed-pulpa-frutos-rojos",
        title: "Pulpa Frutos Rojos (Sub-receta)",
        sub: "Batch 10 kg · Pendiente",
        status: "por_hacer",
      },
      {
        id: "seed-helado-frutos-rojos",
        title: "Helado Frutos Rojos (Final)",
        sub: "Batch 10 kg · En proceso",
        status: "en_proceso",
      },
    ];

    return {
      por_hacer: seed.filter((s) => s.status === "por_hacer"),
      en_proceso: seed.filter((s) => s.status === "en_proceso"),
      listo: seed.filter((s) => s.status === "listo"),
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-card-foreground shadow-[0_8px_28px_-18px_rgba(0,0,0,0.65)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-foreground leading-none">Producción</h2>
              <div className="text-sm text-muted-foreground mt-1">
                Lotes, sub-recetas y control de insumos por pesaje real.
              </div>
            </div>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-6 py-2.5 font-extrabold shadow-sm",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
            )}
          >
            <Plus className="h-5 w-5" />
            Nuevo lote
          </motion.button>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KanbanCol title="Por hacer" items={columns.por_hacer} />
        <KanbanCol title="En proceso" items={columns.en_proceso} />
        <KanbanCol title="Listo" items={columns.listo} />
      </div>

      {/* Modal (placeholder del Wizard) */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="bg-card text-card-foreground w-full max-w-lg rounded-2xl shadow-2xl relative border border-border/60 p-0"
              initial={{ opacity: 0, y: 38, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 35, scale: 0.97 }}
              transition={{ duration: 0.28, type: "spring", damping: 20, stiffness: 210 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-5 right-7 text-2xl text-muted-foreground hover:text-foreground transition"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="p-7">
                <h3 className="font-extrabold text-xl text-foreground">Nuevo lote</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Siguiente paso: wizard con sub-recetas, pesaje real y cierre de lote.
                </p>

                <div className="mt-5 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Aquí conectaremos:
                  <ul className="list-disc ml-5 mt-2">
                    <li>Selección de receta (Base/Pulpa/Helado)</li>
                    <li>Ingreso de gramos/kg por ingrediente</li>
                    <li>Output real (kg)</li>
                    <li>Actualizar stock en insumos + movimientos</li>
                  </ul>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className={cn(
                      "px-5 py-2 rounded-full font-bold shadow-sm transition-all duration-200",
                      "bg-muted hover:bg-muted/80 text-foreground border border-border/60",
                      "focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                    onClick={() => setOpen(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KanbanCol({ title, items }: { title: string; items: CardLote[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="font-extrabold text-foreground mb-3">{title}</div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sin items.</div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className="rounded-xl border border-border/60 bg-muted/30 p-4"
            >
              <div className="font-extrabold text-foreground">{it.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{it.sub}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}