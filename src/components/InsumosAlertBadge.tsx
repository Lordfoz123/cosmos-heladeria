"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { AlertTriangle } from "lucide-react";

type Insumo = {
  id?: string;
  stock?: number;
};

export default function InsumosAlertBadge({ lowThreshold = 5 }: { lowThreshold?: number }) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      setInsumos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  const { sinStock, bajoStock } = useMemo(() => {
    let sinStock = 0;
    let bajoStock = 0;

    for (const i of insumos) {
      const s = Number(i.stock) || 0;
      if (s === 0) sinStock++;
      else if (s <= lowThreshold) bajoStock++;
    }

    return { sinStock, bajoStock };
  }, [insumos, lowThreshold]);

  if (sinStock === 0 && bajoStock === 0) return null;

  const isCritical = sinStock > 0;
  const text = isCritical ? `${sinStock} sin stock` : `${bajoStock} bajos`;

  return (
    <span
      className={[
        "ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold",
        "text-white shadow-sm border",
        // ✅ sólidos (sin transparencias)
        isCritical ? "bg-red-600 border-red-700" : "bg-amber-600 border-amber-700",
      ].join(" ")}
      title={
        isCritical
          ? `Hay ${sinStock} insumos sin stock`
          : `Hay ${bajoStock} insumos con stock bajo (<= ${lowThreshold})`
      }
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}