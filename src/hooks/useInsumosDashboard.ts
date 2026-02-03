"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

export type Insumo = {
  id: string;
  nombre: string;
  unidad: string;
  stock: number;
  costo: number;
};

const TOP_VALOR_N = 10; // barras máximas del gráfico (Top N)
const TOP_UNIDAD_N = 6; // categorías máximas del pie (Top N + Otros)

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function useInsumosDashboard({
  lowStockThreshold = 5,
  collectionName = "insumos",
}: {
  lowStockThreshold?: number;
  collectionName?: string;
}) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, collectionName),
      (snap) => {
        setInsumos(
          snap.docs.map((d) => {
            const data: any = d.data();
            return {
              id: d.id,
              nombre: data.nombre ?? "—",
              unidad: data.unidad ?? "—",
              stock: safeNumber(data.stock),
              costo: safeNumber(data.costo),
            } as Insumo;
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [collectionName]);

  const insumoStats = useMemo(() => {
    const insumosConValor = insumos.map((i) => ({
      ...i,
      valor: safeNumber(i.stock) * safeNumber(i.costo),
    }));

    const totalValor = insumosConValor.reduce((acc, i) => acc + i.valor, 0);

    const sinStock = insumosConValor.filter((i) => safeNumber(i.stock) === 0).length;

    const stockBajo = insumosConValor.filter((i) => {
      const s = safeNumber(i.stock);
      return s > 0 && s <= lowStockThreshold;
    }).length;

    // ===== Top por valor (para gráfico) =====
    const ordenadosValor = [...insumosConValor].sort((a, b) => b.valor - a.valor);

    const topValor = ordenadosValor.slice(0, TOP_VALOR_N);
    const restoValor = ordenadosValor.slice(TOP_VALOR_N);

    const otrosValor = restoValor.reduce((acc, i) => acc + i.valor, 0);

    const topValorConOtros =
      restoValor.length > 0
        ? [
            ...topValor,
            {
              id: "otros",
              nombre: "Otros",
              unidad: "—",
              stock: 0,
              costo: 0,
              valor: otrosValor,
            },
          ]
        : topValor;

    // ===== Conteo por unidad (para pie) =====
    const byUnidad: Record<string, number> = {};
    for (const i of insumosConValor) {
      const u = (i.unidad || "—").trim() || "—";
      byUnidad[u] = (byUnidad[u] || 0) + 1;
    }

    return {
      totalValor,
      sinStock,
      stockBajo,
      topValorConOtros,
      byUnidad,
    };
  }, [insumos, lowStockThreshold]);

  // ===== Chart: Top insumos por valor (Top 10 + Otros) =====
  const insumosValorBar = useMemo(() => {
    return {
      labels: insumoStats.topValorConOtros.map((i: any) => i.nombre),
      datasets: [
        {
          label: "Valor (S/)",
          data: insumoStats.topValorConOtros.map((i: any) => safeNumber(i.valor)),
          backgroundColor: insumoStats.topValorConOtros.map((i: any) =>
            i.nombre === "Otros" ? "rgba(148,163,184,0.55)" : "rgba(37,82,133,0.85)"
          ),
          borderColor: insumoStats.topValorConOtros.map((i: any) =>
            i.nombre === "Otros" ? "rgba(148,163,184,0.9)" : "rgba(37,82,133,1)"
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [insumoStats.topValorConOtros]);

  // ===== Chart: Unidades (distribución) (Top 6 + Otros) =====
  const insumosUnidadPie = useMemo(() => {
    const entries = Object.entries(insumoStats.byUnidad).sort((a, b) => b[1] - a[1]);

    const top = entries.slice(0, TOP_UNIDAD_N);
    const rest = entries.slice(TOP_UNIDAD_N);

    const otros = rest.reduce((acc, [, n]) => acc + n, 0);

    const finalEntries = otros > 0 ? [...top, ["Otros", otros] as const] : top;

    const labels = finalEntries.map(([k]) => k);

    const colors = [
      "rgba(51,223,137,0.75)", // verde
      "rgba(37,82,133,0.75)",  // azul
      "rgba(251,191,36,0.70)", // amber
      "rgba(34,211,238,0.70)", // cyan
      "rgba(168,85,247,0.70)", // violet
      "rgba(244,63,94,0.70)",  // rose
      "rgba(148,163,184,0.65)", // otros (slate)
    ];

    return {
      labels,
      datasets: [
        {
          data: finalEntries.map(([, n]) => n),
          backgroundColor: labels.map((l, idx) =>
            l === "Otros" ? "rgba(148,163,184,0.65)" : colors[idx % (colors.length - 1)]
          ),
          borderColor: labels.map((l) =>
            l === "Otros" ? "rgba(148,163,184,0.9)" : "rgba(255,255,255,0.08)"
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [insumoStats.byUnidad]);

  return {
    insumos,
    loading,
    insumoStats,
    charts: { insumosValorBar, insumosUnidadPie },
  };
}