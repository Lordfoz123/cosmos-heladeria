"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import { endOfDay, isAfter, isBefore, parseISO, startOfDay, subDays } from "date-fns";

type PedidoProducto = {
  productoId?: string;
  nombre?: string;
  tamaño?: string;
  cantidad?: number;
  precioUnit?: number;
};

export type Pedido = {
  id: string;
  estado?: string; // "en espera" | "tomado" | "entregado"
  fecha?: any; // Timestamp/Date/string
  total?: number;
  medioPago?: string;
  pagoConfirmado?: boolean;
  minutosEntrega?: number;
  nombreCliente?: string;
  productos?: PedidoProducto[];
  historial?: { fecha: any; estado: string; usuario?: string; minutosEntrega?: number }[];
};

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  if (typeof ts === "number") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts === "string") {
    // acepta "yyyy-MM-dd" o ISO
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d;
    try {
      const p = parseISO(ts);
      return Number.isNaN(p.getTime()) ? null : p;
    } catch {
      return null;
    }
  }
  return null;
}

function getHistDate(p: Pedido, estado: string): Date | null {
  const h = Array.isArray(p.historial) ? p.historial : [];
  const found = [...h].reverse().find((x) => x.estado === estado);
  return found ? toDate(found.fecha) : null;
}

// rangos iguales a ventas (puedes importarlos si ya los exportas)
export const rangosPedidos = [
  {
    label: "Hoy",
    get: () => {
      const ini = startOfDay(new Date());
      const fin = endOfDay(new Date());
      return [ini, fin] as const;
    },
  },
  {
    label: "Últimos 7 días",
    get: () => {
      const fin = endOfDay(new Date());
      const ini = startOfDay(subDays(fin, 6));
      return [ini, fin] as const;
    },
  },
  {
    label: "Este mes",
    get: () => {
      const now = new Date();
      const ini = new Date(now.getFullYear(), now.getMonth(), 1);
      const fin = endOfDay(new Date());
      return [ini, fin] as const;
    },
  },
  { label: "Personalizado", get: null as null | (() => readonly [Date, Date]) },
] as const;

export function usePedidosDashboardRange({
  pedidosCollection = "pedidos",
  rangoIndex = 0,
  fechaIni,
  fechaFin,
}: {
  pedidosCollection?: string;
  rangoIndex: number;
  fechaIni: string; // yyyy-MM-dd
  fechaFin: string; // yyyy-MM-dd
}) {
  const [allPedidos, setAllPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  // realtime sin orderBy (estable)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, pedidosCollection),
      (snap) => {
        setAllPedidos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [pedidosCollection]);

  const { ini, fin } = useMemo(() => {
    if (rangoIndex < 3) return { ini: rangosPedidos[rangoIndex].get!()[0], fin: rangosPedidos[rangoIndex].get!()[1] };
    return { ini: startOfDay(new Date(fechaIni)), fin: endOfDay(new Date(fechaFin)) };
  }, [rangoIndex, fechaIni, fechaFin]);

  const pedidos = useMemo(() => {
    return allPedidos.filter((p) => {
      const f = toDate(p.fecha);
      if (!f) return false;
      return !isBefore(f, ini) && !isAfter(f, fin);
    });
  }, [allPedidos, ini, fin]);

  const counts = useMemo(() => {
    const enEspera = pedidos.filter((p) => p.estado === "en espera").length;
    const tomado = pedidos.filter((p) => p.estado === "tomado").length;
    const entregado = pedidos.filter((p) => p.estado === "entregado").length;

    const activos = enEspera + tomado;

    const pagosPendientes = pedidos.filter((p) => {
      const mp = String(p.medioPago ?? "");
      const confirmado = !!p.pagoConfirmado;

      if (mp === "tarjeta") return false;
      if (mp === "yape" || mp === "plin") return !confirmado;
      if (mp === "efectivo") return !confirmado;
      return false;
    }).length;

    return { enEspera, tomado, entregado, activos, pagosPendientes };
  }, [pedidos]);

  const atrasados = useMemo(() => {
    const now = new Date();
    const late = pedidos.filter((p) => {
      if (p.estado !== "tomado") return false;
      const mins = Number(p.minutosEntrega || 0);
      if (!mins) return false;
      const tomadoAt = getHistDate(p, "tomado");
      if (!tomadoAt) return false;
      const elapsedMin = (now.getTime() - tomadoAt.getTime()) / 60000;
      return elapsedMin > mins;
    });

    return { count: late.length, list: late };
  }, [pedidos]);

  const avgTimes = useMemo(() => {
    const waits: number[] = [];
    const preps: number[] = [];

    for (const p of pedidos) {
      const created = toDate(p.fecha);
      const tomadoAt = getHistDate(p, "tomado");
      const entregadoAt = getHistDate(p, "entregado");

      if (created && tomadoAt) waits.push((tomadoAt.getTime() - created.getTime()) / 60000);
      if (tomadoAt && entregadoAt) preps.push((entregadoAt.getTime() - tomadoAt.getTime()) / 60000);
    }

    const avgWaitMin = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
    const avgPrepMin = preps.length ? preps.reduce((a, b) => a + b, 0) / preps.length : 0;

    return { avgWaitMin, avgPrepMin };
  }, [pedidos]);

  const charts = useMemo(() => {
    // Pedidos por hora (solo útil si el rango es corto; igual funciona)
    const buckets = new Array(24).fill(0);
    for (const p of pedidos) {
      const d = toDate(p.fecha);
      if (!d) continue;
      buckets[d.getHours()] += 1;
    }

    const pedidosPorHora = {
      labels: buckets.map((_, h) => `${String(h).padStart(2, "0")}:00`),
      datasets: [
        {
          label: "Pedidos",
          data: buckets,
          backgroundColor: "rgba(37,82,133,0.20)",
          borderColor: "#255285",
          borderWidth: 1,
        },
      ],
    };

    // Estados
    const estadosMap: Record<string, number> = {};
    for (const p of pedidos) {
      const s = String(p.estado ?? "sin_estado");
      estadosMap[s] = (estadosMap[s] || 0) + 1;
    }

    const pieEstados = {
      labels: Object.keys(estadosMap),
      datasets: [
        {
          data: Object.values(estadosMap),
          backgroundColor: ["#255285", "#33df89", "#f9b579", "#ff7c70", "#94a3b8"],
          borderWidth: 0,
        },
      ],
    };

    // Top productos
    const prodMap: Record<string, number> = {};
    for (const p of pedidos) {
      for (const it of p.productos ?? []) {
        const key = `${it.nombre ?? "Producto"}${it.tamaño ? ` (${it.tamaño})` : ""}`;
        prodMap[key] = (prodMap[key] || 0) + Number(it.cantidad || 1);
      }
    }

    const top = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const topProductos = {
      labels: top.map(([k]) => k),
      datasets: [
        {
          label: "Unidades",
          data: top.map(([_, v]) => v),
          backgroundColor: "#33df89",
        },
      ],
    };

    return { pedidosPorHora, pieEstados, topProductos };
  }, [pedidos]);

  // últimos pedidos del rango
  const recent = useMemo(() => {
    return [...pedidos]
      .map((p) => ({ p, d: toDate(p.fecha) }))
      .filter((x) => x.d)
      .sort((a, b) => b.d!.getTime() - a.d!.getTime())
      .slice(0, 10)
      .map((x) => x.p);
  }, [pedidos]);

  return {
    loading,
    range: { ini, fin },
    pedidos,
    counts,
    atrasados,
    avgTimes,
    charts,
    recent,
  };
}