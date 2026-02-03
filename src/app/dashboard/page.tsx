"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
  TimeScale,
  type ChartOptions,
} from "chart.js";
import { format, startOfDay, endOfDay } from "date-fns";
import { rangos, useVentasDashboard } from "@/hooks/useVentasDashboard";
import { useInsumosDashboard } from "@/hooks/useInsumosDashboard";
import { usePedidosDashboardRange } from "@/hooks/usePedidosDashboardRange";
import { usePagosDashboardRange } from "@/hooks/usePagosDashboardRange";
import { useCatalogoDashboard } from "@/hooks/useCatalogoDashboard";

ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
  TimeScale
);

const LOW_STOCK_THRESHOLD = 5;

// ✅ Logos locales (evita CORS / lentitud / fallos)
const METODOS_PAGO_UI: { key: "yape" | "plin" | "tarjeta"; nombre: string; logo: string }[] = [
  { key: "yape", nombre: "Yape", logo: "/brand/payments/yape.png" },
  { key: "plin", nombre: "Plin", logo: "/brand/payments/plin.png" },
  { key: "tarjeta", nombre: "Tarjeta", logo: "/brand/payments/tarjeta.png" },
];

function money(n: number) {
  return Number(n || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Paleta "pro" para dark (tipo Tabler):
 * - Azul/cyan para primary
 * - Grid/ticks con buen contraste
 * - Tooltips legibles
 */
const CHART_COLORS = {
  primary: "rgba(56,189,248,0.95)", // sky-400
  primaryFill: "rgba(56,189,248,0.14)",
  mutedText: "rgba(148,163,184,0.85)", // slate-400
  grid: "rgba(148,163,184,0.12)",
  tooltipBg: "rgba(15,23,42,0.95)", // slate-900
  tooltipText: "rgba(226,232,240,0.95)", // slate-200
};

// ✅ FIX TS: options separadas por tipo de chart
const commonBarOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: CHART_COLORS.tooltipBg,
      titleColor: CHART_COLORS.tooltipText,
      bodyColor: CHART_COLORS.tooltipText,
      borderColor: "rgba(148,163,184,0.25)",
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: CHART_COLORS.mutedText },
      grid: { color: CHART_COLORS.grid },
    },
    y: {
      ticks: { color: CHART_COLORS.mutedText },
      grid: { color: CHART_COLORS.grid },
      beginAtZero: true,
    },
  },
};

const commonLineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: CHART_COLORS.tooltipBg,
      titleColor: CHART_COLORS.tooltipText,
      bodyColor: CHART_COLORS.tooltipText,
      borderColor: "rgba(148,163,184,0.25)",
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: CHART_COLORS.mutedText },
      grid: { color: CHART_COLORS.grid },
    },
    y: {
      ticks: { color: CHART_COLORS.mutedText },
      grid: { color: CHART_COLORS.grid },
      beginAtZero: true,
    },
  },
};

const commonPieOptions: ChartOptions<"pie"> = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
      labels: {
        color: CHART_COLORS.mutedText,
        boxWidth: 14,
        boxHeight: 14,
      },
    },
    tooltip: {
      backgroundColor: CHART_COLORS.tooltipBg,
      titleColor: CHART_COLORS.tooltipText,
      bodyColor: CHART_COLORS.tooltipText,
      borderColor: "rgba(148,163,184,0.25)",
      borderWidth: 1,
      padding: 10,
    },
  },
};

function InsumosTable({
  insumos,
  loading,
}: {
  loading: boolean;
  insumos: { id: string; nombre: string; unidad: string; stock: number; costo: number }[];
}) {
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<"valor_desc" | "stock_desc" | "nombre_asc">("valor_desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const rows = useMemo(() => {
    const queryText = q.trim().toLowerCase();

    const base = insumos
      .map((i) => ({
        ...i,
        valor: Number(i.stock || 0) * Number(i.costo || 0),
      }))
      .filter((i) => {
        if (!queryText) return true;
        return (
          (i.nombre ?? "").toLowerCase().includes(queryText) ||
          (i.unidad ?? "").toLowerCase().includes(queryText)
        );
      });

    base.sort((a, b) => {
      if (orden === "nombre_asc") return (a.nombre ?? "").localeCompare(b.nombre ?? "");
      if (orden === "stock_desc") return Number(b.stock) - Number(a.stock);
      return Number(b.valor) - Number(a.valor);
    });

    return base;
  }, [insumos, q, orden]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const slice = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => setPage(1), [q, orden, insumos.length]);

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Cargando insumos…</div>;
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-3">
        <div className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar insumo (nombre o unidad)…"
            className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as any)}
            className="border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="valor_desc">Mayor valor</option>
            <option value="stock_desc">Mayor stock</option>
            <option value="nombre_asc">Nombre A–Z</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border/60">
              <th className="text-left p-3 text-muted-foreground font-semibold">Insumo</th>
              <th className="text-left p-3 text-muted-foreground font-semibold">Unidad</th>
              <th className="text-right p-3 text-muted-foreground font-semibold">Stock</th>
              <th className="text-right p-3 text-muted-foreground font-semibold">Costo</th>
              <th className="text-right p-3 text-muted-foreground font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No hay resultados.
                </td>
              </tr>
            ) : (
              slice.map((i) => (
                <tr key={i.id} className="border-b border-border/60 last:border-b-0">
                  <td className="p-3 font-semibold text-foreground">{i.nombre}</td>
                  <td className="p-3 text-muted-foreground">{i.unidad}</td>
                  <td className="p-3 text-right font-mono text-foreground">{Number(i.stock || 0)}</td>
                  <td className="p-3 text-right font-mono text-foreground">
                    S/ {Number(i.costo || 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-foreground">
                    S/ {(Number(i.valor) || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {rows.length} insumo(s) · Página{" "}
          <span className="font-bold text-foreground">{safePage}</span> de{" "}
          <span className="font-bold text-foreground">{pageCount}</span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className={[
              "px-3 py-2 rounded-lg text-sm font-extrabold border",
              safePage <= 1
                ? "opacity-60 pointer-events-none bg-muted border-border/60 text-muted-foreground"
                : "bg-card border-border/60 hover:bg-muted text-foreground",
            ].join(" ")}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
            className={[
              "px-3 py-2 rounded-lg text-sm font-extrabold border",
              safePage >= pageCount
                ? "opacity-60 pointer-events-none bg-muted border-border/60 text-muted-foreground"
                : "bg-card border-border/60 hover:bg-muted text-foreground",
            ].join(" ")}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

function CatalogoTable({
  loading,
  rows,
  lowStockThreshold = 5,
}: {
  loading: boolean;
  lowStockThreshold?: number;
  rows: Array<{
    id: string;
    nombre?: string;
    stockTotalCalc: number;
    isAgotado: boolean;
    isStockBajo: boolean;
  }>;
}) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "stock_bajo" | "agotados">("todos");
  const [orden, setOrden] = useState<"stock_asc" | "stock_desc" | "nombre_asc">("stock_asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const queryText = q.trim().toLowerCase();

    let list = rows.filter((r) => {
      const okQ = queryText ? String(r.nombre ?? "").toLowerCase().includes(queryText) : true;
      const okF =
        filtro === "todos" ||
        (filtro === "agotados" && r.isAgotado) ||
        (filtro === "stock_bajo" && r.isStockBajo);
      return okQ && okF;
    });

    list.sort((a, b) => {
      if (orden === "nombre_asc") return String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""));
      if (orden === "stock_desc") return (b.stockTotalCalc || 0) - (a.stockTotalCalc || 0);
      return (a.stockTotalCalc || 0) - (b.stockTotalCalc || 0);
    });

    return list;
  }, [rows, q, filtro, orden]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => setPage(1), [q, filtro, orden, rows.length]);

  if (loading) return <div className="text-center text-muted-foreground py-8">Cargando catálogo…</div>;

  return (
    <div className="mt-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto…"
          className="flex-1 border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as any)}
            className="border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todos">Todos</option>
            <option value="stock_bajo">Stock bajo (≤ {lowStockThreshold})</option>
            <option value="agotados">Agotados</option>
          </select>

          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as any)}
            className="border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="stock_asc">Stock ↑</option>
            <option value="stock_desc">Stock ↓</option>
            <option value="nombre_asc">Nombre A–Z</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border/60">
              <th className="text-left p-3 text-muted-foreground font-semibold">Producto</th>
              <th className="text-right p-3 text-muted-foreground font-semibold">Stock</th>
              <th className="text-right p-3 text-muted-foreground font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-muted-foreground">
                  No hay resultados.
                </td>
              </tr>
            ) : (
              slice.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-b-0">
                  <td className="p-3 font-semibold text-foreground">{r.nombre ?? "Producto"}</td>
                  <td className="p-3 text-right font-mono text-foreground">{r.stockTotalCalc}</td>
                  <td className="p-3 text-right">
                    {r.isAgotado ? (
                      <span className="px-2 py-1 rounded-full text-xs font-extrabold bg-destructive text-destructive-foreground">
                        Agotado
                      </span>
                    ) : r.isStockBajo ? (
                      <span className="px-2 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        Bajo
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {filtered.length} producto(s) · Página{" "}
          <span className="font-bold text-foreground">{safePage}</span> de{" "}
          <span className="font-bold text-foreground">{pageCount}</span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className={[
              "px-3 py-2 rounded-lg text-sm font-extrabold border",
              safePage <= 1
                ? "opacity-60 pointer-events-none bg-muted border-border/60 text-muted-foreground"
                : "bg-card border-border/60 hover:bg-muted text-foreground",
            ].join(" ")}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
            className={[
              "px-3 py-2 rounded-lg text-sm font-extrabold border",
              safePage >= pageCount
                ? "opacity-60 pointer-events-none bg-muted border-border/60 text-muted-foreground"
                : "bg-card border-border/60 hover:bg-muted text-foreground",
            ].join(" ")}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tab, setTab] = useState<"resumen" | "ventas" | "insumos" | "pedidos" | "catalogo">("resumen");

  const [rango, setRango] = useState(0);
  const [fechaIni, setFechaIni] = useState(() => format(startOfDay(new Date()), "yyyy-MM-dd"));
  const [fechaFin, setFechaFin] = useState(() => format(endOfDay(new Date()), "yyyy-MM-dd"));

  // ✅ Ventas = Pagadas (pagoConfirmado true) y rango por pagoConfirmadoAt
  const ventasDash = useVentasDashboard({
    pedidosCollection: "pedidos",
    rangoIndex: rango,
    fechaIni,
    fechaFin,
    modo: "pagadas",
    pagoConfirmadoField: "pagoConfirmado",
    pagoConfirmadoValue: true,
    fechaPagoField: "pagoConfirmadoAt",
    fechaField: "fecha",
    totalField: "total",
    productosField: "productos",
    medioPagoField: "medioPago",
  });

  const insumosDash = useInsumosDashboard({
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    collectionName: "insumos",
  });

  // ✅ Pagos por método en el resumen: basado en PAGADOS (consistente con ventas)
  const pedidosDash = usePedidosDashboardRange({
    pedidosCollection: "pedidos",
    rangoIndex: rango,
    fechaIni,
    fechaFin,
    pagosSoloPagados: true,
  });

  const pagosDash = usePagosDashboardRange({
    pedidosCollection: "pedidos",
    rangoIndex: rango,
    fechaIni,
    fechaFin,
  });

  const catalogoDash = useCatalogoDashboard({
    collectionName: "productos",
    topN: 10,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  });

  const ventasDayChartPro = useMemo(() => {
    const base = ventasDash.charts.ventasDayChart;

    return {
      ...base,
      datasets: (base.datasets ?? []).map((ds: any) => ({
        ...ds,
        fill: true,
        backgroundColor: CHART_COLORS.primaryFill,
        borderColor: CHART_COLORS.primary,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: CHART_COLORS.primary,
        pointBorderColor: "rgba(15,23,42,1)",
        pointBorderWidth: 2,
      })),
    };
  }, [ventasDash.charts.ventasDayChart]);

  const pagosPendientesLinePro = useMemo(() => {
    const base = pagosDash.charts.linePendientes;
    return {
      ...base,
      datasets: (base.datasets ?? []).map((ds: any) => ({
        ...ds,
        fill: true,
        backgroundColor: CHART_COLORS.primaryFill,
        borderColor: "rgba(251,191,36,0.95)", // amber
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "rgba(251,191,36,0.95)",
        pointBorderColor: "rgba(15,23,42,1)",
        pointBorderWidth: 2,
      })),
    };
  }, [pagosDash.charts.linePendientes]);

  const pageWrap = "min-h-screen bg-background text-foreground";
  const card = "bg-card text-card-foreground border border-border rounded-xl shadow-sm";
  const muted = "text-muted-foreground";

  const resumenCards = useMemo(() => {
    return [
      {
        title: "Pedidos activos",
        value: pedidosDash.counts.activos,
        sub: `${pedidosDash.counts.enEspera} en espera · ${pedidosDash.counts.tomado} en preparación`,
        valueClass: "text-primary",
      },
      {
        title: "Pagos pendientes",
        value: pagosDash.counts.pagosPendientes,
        sub: `Revisar: ${pagosDash.counts.voucherPorRevisar} · Sin voucher: ${pagosDash.counts.sinVoucher} · Efectivo: ${pagosDash.counts.efectivoPorCobrar}`,
        valueClass: "text-amber-600 dark:text-amber-400",
      },
      {
        title: "Vouchers por revisar",
        value: pagosDash.counts.voucherPorRevisar,
        sub: "Yape/Plin con voucher subido (no pagado)",
        valueClass: "text-cyan-700 dark:text-cyan-300",
      },
      {
        title: "Efectivo por cobrar",
        value: pagosDash.counts.efectivoPorCobrar,
        sub: "Pedidos en efectivo no cobrados",
        valueClass: "text-emerald-600 dark:text-emerald-400",
      },
      {
        title: "Rechazados (rango)",
        value: pagosDash.counts.rechazados,
        sub: "Pagos rechazados",
        valueClass: "text-destructive",
      },
      {
        title: "Monto en riesgo (S/)",
        value: `S/ ${money(pagosDash.counts.montoPendiente)}`,
        sub: "Suma de totales en pendientes",
        valueClass: "text-foreground",
      },
    ];
  }, [
    pedidosDash.counts.activos,
    pedidosDash.counts.enEspera,
    pedidosDash.counts.tomado,
    pagosDash.counts.pagosPendientes,
    pagosDash.counts.voucherPorRevisar,
    pagosDash.counts.sinVoucher,
    pagosDash.counts.efectivoPorCobrar,
    pagosDash.counts.rechazados,
    pagosDash.counts.montoPendiente,
  ]);

  const pillFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className={pageWrap}>
      <div className="max-w-6xl mx-auto p-4 flex flex-col gap-7">
        {/* Header + Tabs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Dashboard</h1>
            <p className={`text-sm ${muted} mt-1`}>
              Centro de control: pedidos, ventas e inventario en tiempo real.
            </p>
          </div>

          <div className="inline-flex rounded-full bg-muted/60 p-1.5 border border-border/60 shadow-sm gap-1">
            {(
              [
                ["resumen", "Resumen"],
                ["pedidos", "Pedidos"],
                ["ventas", "Ventas"],
                ["insumos", "Insumos"],
                ["catalogo", "Catálogo"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={[
                  "px-5 py-2 rounded-full font-extrabold transition",
                  pillFocus,
                  tab === k
                    ? "bg-card text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                ].join(" ")}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* RANGO */}
        {(tab === "resumen" || tab === "pedidos" || tab === "ventas") && (
          <div className="flex flex-wrap gap-3 items-end">
            {rangos.map((r, i) => (
              <button
                key={i}
                className={[
                  "px-4 py-2 font-extrabold rounded-full border transition",
                  pillFocus,
                  rango === i
                    ? "bg-primary text-primary-foreground shadow-sm border-primary/30"
                    : "bg-card border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
                onClick={() => setRango(i)}
                type="button"
              >
                {r.label}
              </button>
            ))}

            {rango === 3 && (
              <div className="flex gap-2 items-center ml-2">
                <input
                  type="date"
                  value={fechaIni}
                  onChange={(e) => setFechaIni(e.target.value)}
                  className="border border-border rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="mt-1 text-muted-foreground">a</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="border border-border rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>
        )}

        {/* ====== RESUMEN ====== */}
        {tab === "resumen" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resumenCards.map((c) => (
                <div key={c.title} className={`${card} p-6`}>
                  <div className={`text-xs ${muted} mb-1`}>{c.title}</div>
                  <div className={`text-2xl font-extrabold ${c.valueClass}`}>{c.value}</div>
                  <div className={`text-xs ${muted} mt-2`}>{c.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5 md:col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Pendientes (evolución)</h2>
                <Line data={pagosPendientesLinePro} options={commonLineOptions} />
              </div>

              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Estado de pagos (rango)</h2>
                <Pie data={pagosDash.charts.pieEstadoPago} options={commonPieOptions} />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5 md:col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Top productos (rango)</h2>
                <Bar data={pedidosDash.charts.topProductos} options={{ ...commonBarOptions, indexAxis: "y" }} />
              </div>

              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Pagos por método (pagados)</h2>

                <div className="flex flex-col gap-3">
                  {METODOS_PAGO_UI.map((m) => {
                    const n = pedidosDash.pagosPorMetodo?.conteo?.[m.key] ?? 0;
                    const s = pedidosDash.pagosPorMetodo?.monto?.[m.key] ?? 0;

                    return (
                      <div
                        key={m.key}
                        className="flex items-center justify-between border border-border/60 rounded-xl p-3 bg-background"
                      >
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.logo} alt={m.nombre} className="w-8 h-8 object-contain" />
                          <div className="min-w-0">
                            <div className="font-bold text-foreground leading-tight">{m.nombre}</div>
                            <div className={`text-xs ${muted} leading-tight`}>Pedidos: {n}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-xs ${muted}`}>Monto</div>
                          <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            S/ {money(s)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ====== PEDIDOS ====== */}
        {tab === "pedidos" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>En espera</div>
                <div className="text-2xl font-extrabold text-primary">{pedidosDash.counts.enEspera}</div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>En preparación</div>
                <div className="text-2xl font-extrabold text-primary">{pedidosDash.counts.tomado}</div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Entregados</div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {pedidosDash.counts.entregado}
                </div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Pagos pendientes</div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {pagosDash.counts.pagosPendientes}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5 md:col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Pedidos por hora (rango)</h2>
                <Bar data={pedidosDash.charts.pedidosPorHora} options={commonBarOptions} />
              </div>

              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Estados (rango)</h2>
                <Pie data={pedidosDash.charts.pieEstados} options={commonPieOptions} />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5 md:col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Pendientes por tipo (rango)</h2>
                <Bar data={pagosDash.charts.barPendientesBreakdown} options={commonBarOptions} />
              </div>

              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Estado de pagos (rango)</h2>
                <Pie data={pagosDash.charts.pieEstadoPago} options={commonPieOptions} />
              </div>
            </div>
          </>
        )}

        {/* ====== VENTAS ====== */}
        {tab === "ventas" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Ventas totales</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  S/ {ventasDash.stats.total.toFixed(2)}
                </div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Pedidos pagados</div>
                <div className="text-2xl font-bold text-primary">{ventasDash.stats.nPedidos}</div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Unidades vendidas</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {ventasDash.stats.totUnidades}
                </div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Promedio por pedido</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  S/ {ventasDash.stats.ticketPromedio.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5 col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Ventas por día</h2>
                <Line data={ventasDayChartPro} options={commonLineOptions} />
              </div>

              <div className={`${card} p-5 flex flex-col gap-10`}>
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-3">Top productos vendidos</h2>
                  <Bar data={ventasDash.charts.barData} options={{ ...commonBarOptions, indexAxis: "y" }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-3">Métodos de pago usados</h2>
                  <Pie data={ventasDash.charts.pieData} options={commonPieOptions} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ====== INSUMOS ====== */}
        {tab === "insumos" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Valor total inventario</div>
                <div className="text-2xl font-extrabold text-primary">
                  S/ {insumosDash.insumoStats.totalValor.toFixed(2)}
                </div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}># Insumos</div>
                <div className="text-2xl font-extrabold text-primary">{insumosDash.insumos.length}</div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Sin stock</div>
                <div className="text-2xl font-extrabold text-destructive">{insumosDash.insumoStats.sinStock}</div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Stock bajo (≤ {LOW_STOCK_THRESHOLD})</div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {insumosDash.insumoStats.stockBajo}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5 col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Top insumos por valor</h2>
                {insumosDash.loading ? (
                  <div className={`text-center ${muted} py-10`}>Cargando insumos...</div>
                ) : (
                  <Bar data={insumosDash.charts.insumosValorBar} options={commonBarOptions} />
                )}
              </div>

              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Unidades (distribución)</h2>
                {insumosDash.loading ? (
                  <div className={`text-center ${muted} py-10`}>Cargando...</div>
                ) : (
                  <Pie data={insumosDash.charts.insumosUnidadPie} options={commonPieOptions} />
                )}
              </div>
            </div>

            <div className={`${card} p-5 mt-6`}>
              <h2 className="text-lg font-bold text-foreground mb-4">Todos los insumos (tabla)</h2>
              <InsumosTable loading={insumosDash.loading} insumos={insumosDash.insumos} />
            </div>
          </>
        )}

        {/* ====== CATÁLOGO (tabla con stock) ====== */}
        {tab === "catalogo" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Productos en catálogo</div>
                <div className="text-2xl font-extrabold text-primary">{catalogoDash.counts.enCatalogo}</div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Stock bajo</div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {catalogoDash.counts.stockBajo}
                </div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Agotados</div>
                <div className="text-2xl font-extrabold text-destructive">{catalogoDash.counts.agotados}</div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Top stock (chart)</div>
                <div className="text-2xl font-extrabold text-foreground">Top 10</div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5 md:col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Top productos por stock</h2>
                <Bar data={catalogoDash.charts.barTopStock} options={commonBarOptions} />
              </div>

              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Estado (referencial)</h2>
                <Pie data={catalogoDash.charts.pieEstado} options={commonPieOptions} />
              </div>
            </div>

            <div className={`${card} p-5 mt-6`}>
              <h2 className="text-lg font-bold text-foreground mb-4">
                Todos los productos del catálogo (tabla)
              </h2>
              <CatalogoTable
                loading={catalogoDash.loading}
                rows={catalogoDash.catalogoRows}
                lowStockThreshold={LOW_STOCK_THRESHOLD}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}