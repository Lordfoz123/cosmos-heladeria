"use client";

import { useEffect, useMemo, useState } from "react";
import InventarioInsumos from "@/components/InventarioInsumos";
import ProductosYRecetas from "@/components/ProductosYRecetas";
import HistorialMovimientos from "@/components/HistorialMovimientos";
import PedidosColumna from "@/components/PedidosColumna";
import { Package, Boxes, History, ShoppingCart, AlertTriangle } from "lucide-react";
import { usePendingOrdersCount } from "@/hooks/usePendingOrdersCount";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

type Insumo = { stock?: number };

const LOW_STOCK_THRESHOLD = 5;

export default function InventarioPage() {
  const [tab, setTab] = useState<"productos" | "pedidos" | "insumos" | "historial">("productos");
  const pendingCount = usePendingOrdersCount();

  // ✅ Alerta de insumos (realtime)
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      setInsumos(snap.docs.map((d) => d.data() as Insumo));
    });
    return () => unsub();
  }, []);

  const { sinStock, bajoStock } = useMemo(() => {
    let sinStock = 0;
    let bajoStock = 0;

    for (const i of insumos) {
      const s = Number(i.stock) || 0;
      if (s === 0) sinStock++;
      else if (s <= LOW_STOCK_THRESHOLD) bajoStock++;
    }

    return { sinStock, bajoStock };
  }, [insumos]);

  const showInsumosAlert = sinStock > 0 || bajoStock > 0;
  const insumosAlertCritical = sinStock > 0;
  const insumosAlertText = insumosAlertCritical ? `${sinStock} sin stock` : `${bajoStock} bajos`;

  const tabBase =
    "px-7 md:px-8 py-2.5 md:py-3 rounded-full font-extrabold text-base md:text-lg transition relative " +
    "focus:outline-none focus:ring-2 focus:ring-ring";

  const tabActive = "bg-primary text-primary-foreground shadow-sm border border-primary/30";

  const tabInactive =
    "bg-card text-muted-foreground border border-border/60 hover:bg-muted hover:text-foreground shadow-sm";

  return (
    <main className="flex-1 p-8 bg-background min-h-screen">
      <div className="w-full flex justify-center mb-12">
        <div className="inline-flex rounded-full bg-muted/60 p-1.5 border border-border/60 shadow-sm flex-wrap gap-2">
          <button
            onClick={() => setTab("productos")}
            className={`${tabBase} ${tab === "productos" ? tabActive : tabInactive}`}
          >
            <span className="inline-flex items-center gap-2">
              <Package size={20} /> Productos
            </span>
          </button>

          <button
            onClick={() => setTab("pedidos")}
            className={`${tabBase} ${tab === "pedidos" ? tabActive : tabInactive}`}
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingCart size={20} /> Pedidos
            </span>

            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-6 h-6 px-2 flex items-center justify-center border border-destructive/30 shadow-sm">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab("insumos")}
            className={`${tabBase} ${tab === "insumos" ? tabActive : tabInactive}`}
          >
            <span className="inline-flex items-center gap-2">
              <Boxes size={20} /> Insumos
            </span>

            {showInsumosAlert && (
              <span
                className={[
                  "absolute -top-2 -right-2 text-xs font-extrabold rounded-full min-w-6 h-6 px-2",
                  "flex items-center justify-center border shadow-sm",
                  // ✅ sólidos
                  insumosAlertCritical
                    ? "bg-red-600 text-white border-red-700"
                    : "bg-amber-600 text-white border-amber-700",
                ].join(" ")}
                title={
                  insumosAlertCritical
                    ? `Hay ${sinStock} insumos sin stock`
                    : `Hay ${bajoStock} insumos con stock bajo (<= ${LOW_STOCK_THRESHOLD})`
                }
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                {insumosAlertText}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab("historial")}
            className={`${tabBase} ${tab === "historial" ? tabActive : tabInactive}`}
          >
            <span className="inline-flex items-center gap-2">
              <History size={20} /> Historial
            </span>
          </button>
        </div>
      </div>

      {tab === "productos" && <ProductosYRecetas />}
      {tab === "pedidos" && <PedidosColumna />}
      {tab === "insumos" && <InventarioInsumos />}
      {tab === "historial" && <HistorialMovimientos />}
    </main>
  );
}