"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

type ProductStatus = "draft" | "published" | string;

export type ProductoMetaLite = {
  id: string;
  nombre?: string;
  imagen?: string;

  inCatalog?: boolean;
  status?: ProductStatus;

  // posibles nombres legacy
  preciosPorTamano?: Record<string, number>;
  preciosPorTamaño?: Record<string, number>;
  precio?: number;

  recetasPorTamano?: Record<string, any>;
  recetasPorTamaño?: Record<string, any>;

  stockPorTamano?: Record<string, number>;
  stockPorTamaño?: Record<string, number>;
  stockTotal?: number;
  stock?: number;

  sabores?: string[];
};

export type CatalogoRow = ProductoMetaLite & {
  stockTotalCalc: number;
  statusCalc: "draft" | "published";
  isAgotado: boolean;
  isStockBajo: boolean;
};

function getStatus(p: ProductoMetaLite): "draft" | "published" {
  return (p.status as any) === "published" ? "published" : "draft";
}

function getTamanos(p: ProductoMetaLite): string[] {
  const recetas = (p as any).recetasPorTamano || (p as any).recetasPorTamaño || {};
  return recetas && typeof recetas === "object" ? Object.keys(recetas) : [];
}

function getStockTotal(p: ProductoMetaLite): number {
  if (typeof p.stockTotal === "number" && Number.isFinite(p.stockTotal)) return p.stockTotal;

  const map: Record<string, any> | undefined =
    (p as any).stockPorTamano || (p as any).stockPorTamaño || (p as any).stockPorTamano;

  if (map && typeof map === "object") {
    return Object.values(map).reduce((acc: number, v: any) => {
      const n = Number(v);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  if (typeof (p as any).stock === "number" && Number.isFinite((p as any).stock)) return Number((p as any).stock);

  return 0;
}

function validateForPublishLite(p: ProductoMetaLite) {
  const missing: string[] = [];

  if (!p.nombre || String(p.nombre).trim().length === 0) missing.push("nombre");

  const preciosPorTamano = (p as any).preciosPorTamaño ?? (p as any).preciosPorTamano;
  const precioLegacyOk = (p as any).precio != null && Number((p as any).precio) > 0;

  const preciosOk =
    preciosPorTamano &&
    Object.keys(preciosPorTamano).length > 0 &&
    Object.entries(preciosPorTamano).every(([, v]) => Number(v) > 0);

  if (!preciosOk && !precioLegacyOk) missing.push("precios");

  if (!p.imagen || String(p.imagen).trim().length === 0) missing.push("imagen");

  const tamanos = getTamanos(p);
  if (tamanos.length === 0) missing.push("tamanos/receta");

  const stockTotal = getStockTotal(p);
  if (stockTotal <= 0) missing.push("stock");

  return { ok: missing.length === 0, missing };
}

export function useCatalogoDashboard(opts?: {
  collectionName?: string;
  topN?: number;
  lowStockThreshold?: number;
}) {
  const collectionName = opts?.collectionName ?? "productos";
  const topN = opts?.topN ?? 10;
  const lowStockThreshold = opts?.lowStockThreshold ?? 5;

  const [productos, setProductos] = useState<ProductoMetaLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, collectionName), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProductoMetaLite[];
      setProductos(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [collectionName]);

  const computed = useMemo(() => {
    const enCatalogo = productos.filter((p) => !!(p as any).inCatalog);

    const catalogoRows: CatalogoRow[] = enCatalogo.map((p) => {
      const stockTotalCalc = getStockTotal(p);
      const statusCalc = getStatus(p);
      const isAgotado = stockTotalCalc <= 0;
      const isStockBajo = stockTotalCalc > 0 && stockTotalCalc <= lowStockThreshold;

      return { ...p, stockTotalCalc, statusCalc, isAgotado, isStockBajo };
    });

    const agotados = catalogoRows.filter((p) => p.isAgotado);
    const stockBajo = catalogoRows.filter((p) => p.isStockBajo);

    const borradores = catalogoRows.filter((p) => p.statusCalc === "draft");
    const publicados = catalogoRows.filter((p) => p.statusCalc === "published");

    const publicables = borradores.filter((p) => validateForPublishLite(p).ok);

    const topStock = [...catalogoRows]
      .map((p) => ({ id: p.id, nombre: p.nombre ?? "Producto", stock: p.stockTotalCalc }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, topN);

    const barTopStock = {
      labels: topStock.map((x) => x.nombre),
      datasets: [
        {
          label: "Stock total",
          data: topStock.map((x) => x.stock),
          backgroundColor: "rgba(56,189,248,0.65)",
          borderColor: "rgba(56,189,248,0.95)",
          borderWidth: 1,
        },
      ],
    };

    // (opcional) pie por estado, lo dejamos por compatibilidad
    const pieEstado = {
      labels: ["Publicados", "Borradores", "Agotados"],
      datasets: [
        {
          data: [publicados.length, borradores.length, agotados.length],
          backgroundColor: [
            "rgba(16,185,129,0.65)",
            "rgba(148,163,184,0.55)",
            "rgba(244,63,94,0.65)",
          ],
          borderColor: [
            "rgba(16,185,129,0.95)",
            "rgba(148,163,184,0.85)",
            "rgba(244,63,94,0.95)",
          ],
          borderWidth: 1,
        },
      ],
    };

    return {
      catalogoRows,
      counts: {
        enCatalogo: catalogoRows.length,
        agotados: agotados.length,
        stockBajo: stockBajo.length,

        // mantenemos por si lo usas en alguna parte
        publicados: publicados.length,
        borradores: borradores.length,
        publicables: publicables.length,
      },
      charts: { barTopStock, pieEstado },
    };
  }, [productos, topN, lowStockThreshold]);

  return {
    loading,
    productos, // raw
    catalogoRows: computed.catalogoRows, // listo para tabla
    counts: computed.counts,
    charts: computed.charts,
  };
}