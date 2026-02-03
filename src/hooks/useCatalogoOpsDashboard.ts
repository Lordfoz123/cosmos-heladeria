"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { endOfDay, startOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";

type ProductoDoc = {
  id: string;
  nombre?: string;
  inCatalog?: boolean;

  stockTotal?: number;
  stockPorTamano?: Record<string, number>;
  stockPorTamaño?: Record<string, number>;
  stock?: number; // legacy

  status?: string;
};

type PedidoDoc = {
  id: string;
  estado?: string;
  fecha?: any;
  productos?: Array<{ nombre?: string; tamaño?: string; tamano?: string; cantidad?: number }>;
};

function toMillis(fecha: any): number {
  if (!fecha) return 0;
  if (fecha instanceof Date) return fecha.getTime();
  if (typeof fecha?.toDate === "function") return fecha.toDate().getTime();
  if (typeof fecha?.seconds === "number") return fecha.seconds * 1000;
  if (typeof fecha === "string") {
    const d = new Date(fecha);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

function computeRange(opts: { rangoIndex: number; fechaIni: string; fechaFin: string }) {
  const now = new Date();

  if (opts.rangoIndex === 0) {
    return { from: startOfDay(now).getTime(), to: endOfDay(now).getTime() };
  }
  if (opts.rangoIndex === 1) {
    return { from: startOfDay(subDays(now, 6)).getTime(), to: endOfDay(now).getTime() };
  }
  if (opts.rangoIndex === 2) {
    return { from: startOfMonth(now).getTime(), to: endOfMonth(now).getTime() };
  }

  const ini = opts.fechaIni ? startOfDay(new Date(opts.fechaIni)).getTime() : 0;
  const fin = opts.fechaFin ? endOfDay(new Date(opts.fechaFin)).getTime() : Date.now();
  return { from: ini, to: fin };
}

function getStockTotal(p: ProductoDoc): number {
  if (typeof p.stockTotal === "number" && Number.isFinite(p.stockTotal)) return p.stockTotal;

  const map: any =
    p.stockPorTamano ||
    (p as any).stockPorTamaño ||
    (p as any).stockPorTamano ||
    undefined;

  if (map && typeof map === "object") {
    return Object.values(map).reduce((acc: number, v: any) => {
      const n = Number(v);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  if (typeof (p as any).stock === "number" && Number.isFinite((p as any).stock)) return Number((p as any).stock);

  return 0;
}

export function useCatalogoOpsDashboard(opts: {
  productosCollection?: string;
  pedidosCollection?: string;

  estadoField?: string;
  entregadoValue?: string;
  fechaField?: string;

  rangoIndex: number;
  fechaIni: string;
  fechaFin: string;

  lowStockThreshold?: number;
  topN?: number;
}) {
  const productosCollection = opts.productosCollection ?? "productos";
  const pedidosCollection = opts.pedidosCollection ?? "pedidos";
  const estadoField = opts.estadoField ?? "estado";
  const entregadoValue = opts.entregadoValue ?? "entregado";
  const fechaField = opts.fechaField ?? "fecha";
  const lowStockThreshold = opts.lowStockThreshold ?? 5;
  const topN = opts.topN ?? 10;

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoDoc[]>([]);
  const [pedidos, setPedidos] = useState<PedidoDoc[]>([]);

  useEffect(() => {
    setLoading(true);
    const unsub1 = onSnapshot(collection(db, productosCollection), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProductoDoc[];
      setProductos(rows);
      setLoading(false);
    });
    return () => unsub1();
  }, [productosCollection]);

  useEffect(() => {
    const unsub2 = onSnapshot(collection(db, pedidosCollection), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PedidoDoc[];
      setPedidos(rows);
    });
    return () => unsub2();
  }, [pedidosCollection]);

  const range = useMemo(
    () => computeRange({ rangoIndex: opts.rangoIndex, fechaIni: opts.fechaIni, fechaFin: opts.fechaFin }),
    [opts.rangoIndex, opts.fechaIni, opts.fechaFin]
  );

  const computed = useMemo(() => {
    const catalogo = productos.filter((p) => !!(p as any).inCatalog);

    const catalogoRows = catalogo.map((p) => {
      const stockTotal = getStockTotal(p);
      return {
        ...p,
        nombre: p.nombre ?? "Producto",
        stockTotal,
      };
    });

    const totalProductosCatalogo = catalogoRows.length;
    const stockTotalCatalogo = catalogoRows.reduce((acc, p) => acc + (Number(p.stockTotal) || 0), 0);

    const agotados = catalogoRows.filter((p) => (Number(p.stockTotal) || 0) <= 0);
    const stockBajo = catalogoRows.filter((p) => {
      const s = Number(p.stockTotal) || 0;
      return s > 0 && s <= lowStockThreshold;
    });

    // Ventas en rango (por nombre; ideal sería por productoId si lo tienes)
    const vendidosPorNombre: Record<string, number> = {};

    const pedidosRango = pedidos
      .filter((p) => String((p as any)[estadoField] ?? "") === entregadoValue)
      .filter((p) => {
        const ms = toMillis((p as any)[fechaField]);
        return ms >= range.from && ms <= range.to;
      });

    for (const ped of pedidosRango) {
      const items = Array.isArray(ped.productos) ? ped.productos : [];
      for (const it of items) {
        const nombre = String(it?.nombre ?? "").trim();
        if (!nombre) continue;
        const qty = Number(it?.cantidad ?? 1) || 1;
        vendidosPorNombre[nombre] = (vendidosPorNombre[nombre] || 0) + qty;
      }
    }

    // Solo consideramos vendidos de items que existen en catálogo (match por nombre)
    const setCatalogoNombres = new Set(catalogoRows.map((p) => String(p.nombre ?? "").trim()));
    const vendidosCatalogoEntries = Object.entries(vendidosPorNombre).filter(([n]) =>
      setCatalogoNombres.has(String(n).trim())
    );

    const unidadesVendidasCatalogo = vendidosCatalogoEntries.reduce((acc, [, n]) => acc + (Number(n) || 0), 0);

    const topVendidos = [...vendidosCatalogoEntries]
      .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
      .slice(0, topN);

    const barTopVendidos = {
      labels: topVendidos.map(([n]) => n),
      datasets: [
        {
          label: "Unidades vendidas",
          data: topVendidos.map(([, n]) => n),
          backgroundColor: "rgba(16,185,129,0.65)", // emerald
          borderColor: "rgba(16,185,129,0.95)",
          borderWidth: 1,
        },
      ],
    };

    const topStockBajo = [...catalogoRows]
      .filter((p) => {
        const s = Number(p.stockTotal) || 0;
        return s > 0 && s <= lowStockThreshold;
      })
      .sort((a, b) => (Number(a.stockTotal) || 0) - (Number(b.stockTotal) || 0))
      .slice(0, topN);

    const barStockBajo = {
      labels: topStockBajo.map((p) => p.nombre),
      datasets: [
        {
          label: `Stock (≤ ${lowStockThreshold})`,
          data: topStockBajo.map((p) => p.stockTotal),
          backgroundColor: "rgba(251,191,36,0.65)", // amber
          borderColor: "rgba(251,191,36,0.95)",
          borderWidth: 1,
        },
      ],
    };

    return {
      catalogoRows,
      counts: {
        totalProductosCatalogo,
        stockTotalCatalogo,
        agotados: agotados.length,
        stockBajo: stockBajo.length,
        unidadesVendidasCatalogo,
        pedidosVendidosCatalogo: pedidosRango.length,
      },
      charts: {
        barTopVendidos,
        barStockBajo,
      },
    };
  }, [
    productos,
    pedidos,
    range.from,
    range.to,
    estadoField,
    entregadoValue,
    fechaField,
    lowStockThreshold,
    topN,
  ]);

  return {
    loading,
    range,
    catalogoRows: computed.catalogoRows,
    counts: computed.counts,
    charts: computed.charts,
  };
}