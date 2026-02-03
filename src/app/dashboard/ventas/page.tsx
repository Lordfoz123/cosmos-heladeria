"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Bar, Line, Pie } from "react-chartjs-2";
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
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  addDays,
  parseISO,
  isBefore,
  isAfter,
} from "date-fns";
import { useInsumosDashboard } from "@/hooks/useInsumosDashboard";
import { exportVentasGridPdf } from "@/lib/pdf/exportVentasGridPdf";
import { exportInsumosPdf } from "@/lib/pdf/exportInsumosPdf";

type ProductoVentaRow = {
  key: string;
  nombre: string;
  unidades: number;
  ingreso: number;
};

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

function toDate(ts: any) {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  if (typeof ts === "string") return parseISO(ts);
  return null;
}

const rangos = [
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
  { label: "Personalizado", get: null },
] as const;

const LOW_STOCK_THRESHOLD = 5;

// ✅ IMPORTANTE PARA PDF: usa logos locales para evitar CORS
// Debes tener:
// public/brand/payments/yape.png
// public/brand/payments/plin.png
// public/brand/payments/tarjeta.png
const METODOS_PAGO_UI: { key: string; nombre: string; logo: string }[] = [
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

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normMedioPago(v: any) {
  const mp = String(v ?? "").toLowerCase().trim();
  if (mp === "izipay") return "tarjeta";
  return mp || "otro";
}

function normSize(v: any) {
  const s = String(v ?? "").toLowerCase().trim();
  if (!s) return "otro";
  if (s.includes("8")) return "8oz";
  if (s.includes("16")) return "16oz";
  if (s.includes("32")) return "32oz";
  return s;
}

function prodKey(p: any, mode: "sabor" | "sabor_tamano") {
  const nombre = String(p?.nombre ?? "Producto").trim();
  const tam = normSize(p?.tamaño);
  return mode === "sabor" ? nombre : `${nombre} (${tam})`;
}

/** Paleta para pantalla */
const CHART_COLORS = {
  primary: "rgba(56,189,248,0.95)",
  primaryFill: "rgba(56,189,248,0.14)",
  mutedText: "rgba(148,163,184,0.85)",
  grid: "rgba(148,163,184,0.12)",
  tooltipBg: "rgba(15,23,42,0.95)",
  tooltipText: "rgba(226,232,240,0.95)",
};

/** Opciones pantalla */
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
    x: { ticks: { color: CHART_COLORS.mutedText }, grid: { color: CHART_COLORS.grid } },
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
    x: { ticks: { color: CHART_COLORS.mutedText }, grid: { color: CHART_COLORS.grid } },
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
      labels: { color: CHART_COLORS.mutedText, boxWidth: 14, boxHeight: 14 },
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

/** ✅ Opciones PDF (PRINT) */
const PRINT = {
  ticks: "#334155",
  grid: "rgba(15,23,42,0.08)",
  tooltipBg: "rgba(255,255,255,0.98)",
  tooltipText: "rgba(15,23,42,0.95)",
};

const printBarOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: PRINT.tooltipBg,
      titleColor: PRINT.tooltipText,
      bodyColor: PRINT.tooltipText,
      borderColor: "rgba(15,23,42,0.15)",
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: { ticks: { color: PRINT.ticks }, grid: { color: PRINT.grid } },
    y: { ticks: { color: PRINT.ticks }, grid: { color: PRINT.grid }, beginAtZero: true },
  },
};

const printLineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: PRINT.tooltipBg,
      titleColor: PRINT.tooltipText,
      bodyColor: PRINT.tooltipText,
      borderColor: "rgba(15,23,42,0.15)",
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: { ticks: { color: PRINT.ticks }, grid: { color: PRINT.grid } },
    y: { ticks: { color: PRINT.ticks }, grid: { color: PRINT.grid }, beginAtZero: true },
  },
};

const printPieOptions: ChartOptions<"pie"> = {
  responsive: true,
  plugins: {
    legend: { position: "top", labels: { color: PRINT.ticks, boxWidth: 14, boxHeight: 14 } },
    tooltip: {
      backgroundColor: PRINT.tooltipBg,
      titleColor: PRINT.tooltipText,
      bodyColor: PRINT.tooltipText,
      borderColor: "rgba(15,23,42,0.15)",
      borderWidth: 1,
      padding: 10,
    },
  },
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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
      .map((i) => ({ ...i, valor: Number(i.stock || 0) * Number(i.costo || 0) }))
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
    <div className="mt-4">
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

function PagosPorMetodoPanel({
  conteo,
  monto,
  variant = "screen",
}: {
  conteo: Record<string, number>;
  monto: Record<string, number>;
  variant?: "screen" | "print";
}) {
  const isPrint = variant === "print";

  return (
    <div className="flex flex-col gap-3">
      {METODOS_PAGO_UI.map((m) => {
        const n = conteo[m.key] ?? 0;
        const s = monto[m.key] ?? 0;

        return (
          <div
            key={m.key}
            className={[
              "flex items-center justify-between rounded-xl p-3",
              isPrint ? "border border-slate-200 bg-white" : "border border-border/60 bg-background",
            ].join(" ")}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.logo} alt={m.nombre} className="w-9 h-9 object-contain" />
              <div className="min-w-0">
                <div
                  className={[
                    "font-extrabold leading-tight",
                    isPrint ? "text-slate-900" : "text-foreground",
                  ].join(" ")}
                >
                  {m.nombre}
                </div>
                <div className={["text-xs leading-tight", isPrint ? "text-slate-500" : "text-muted-foreground"].join(" ")}>
                  Pedidos: {n}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className={["text-xs", isPrint ? "text-slate-500" : "text-muted-foreground"].join(" ")}>
                Monto
              </div>
              <div
                className={[
                  "font-extrabold",
                  isPrint ? "text-emerald-600" : "text-emerald-600 dark:text-emerald-400",
                ].join(" ")}
              >
                S/ {money(s)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductosTablaPdf({ rows }: { rows: ProductoVentaRow[] }) {
  const slice = rows.slice(0, 25);
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <table className="w-full text-sm text-slate-900">
        <thead className="bg-slate-50">
          <tr className="border-b border-slate-200">
            <th className="text-left p-3 text-slate-600 font-semibold">Producto</th>
            <th className="text-right p-3 text-slate-600 font-semibold">Unidades</th>
            <th className="text-right p-3 text-slate-600 font-semibold">Ingreso (S/)</th>
          </tr>
        </thead>
        <tbody>
          {slice.length === 0 ? (
            <tr>
              <td colSpan={3} className="p-6 text-center text-slate-500">
                No hay resultados.
              </td>
            </tr>
          ) : (
            slice.map((r) => (
              <tr key={r.key} className="border-b border-slate-200 last:border-b-0">
                <td className="p-3 font-semibold">{r.nombre}</td>
                <td className="p-3 text-right font-mono">{r.unidades}</td>
                <td className="p-3 text-right font-mono font-bold">S/ {money(r.ingreso)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function InsumosTablaPdfPage({
  title,
  insumos,
}: {
  title: string;
  insumos: { id: string; nombre: string; unidad: string; stock: number; costo: number }[];
}) {
  const rows = insumos
    .map((i) => ({ ...i, valor: Number(i.stock || 0) * Number(i.costo || 0) }))
    .sort((a, b) => Number(b.valor) - Number(a.valor));

  return (
    <div data-pdf-table-page="true" className="rounded-2xl border border-slate-200 bg-white p-4 mt-4">
      <div className="font-extrabold mb-2 text-slate-900">{title}</div>

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <table className="w-full text-sm text-slate-900">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="text-left p-3 text-slate-600 font-semibold">Insumo</th>
              <th className="text-left p-3 text-slate-600 font-semibold">Unidad</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Stock</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Costo</th>
              <th className="text-right p-3 text-slate-600 font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No hay resultados.
                </td>
              </tr>
            ) : (
              rows.map((i) => (
                <tr key={i.id} className="border-b border-slate-200 last:border-b-0">
                  <td className="p-3 font-semibold">{i.nombre}</td>
                  <td className="p-3 text-slate-700">{i.unidad}</td>
                  <td className="p-3 text-right font-mono">{Number(i.stock || 0)}</td>
                  <td className="p-3 text-right font-mono">S/ {Number(i.costo || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-bold">S/ {Number(i.valor || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardVentas() {
  const [tab, setTab] = useState<"ventas" | "insumos">("ventas");

  const [ventas, setVentas] = useState<any[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(true);

  const [rango, setRango] = useState(0);
  const [fechaIni, setFechaIni] = useState(() => format(startOfDay(new Date()), "yyyy-MM-dd"));
  const [fechaFin, setFechaFin] = useState(() => format(endOfDay(new Date()), "yyyy-MM-dd"));

  const [exportingPdf, setExportingPdf] = useState(false);

  // Toggle agrupación de productos
  const [groupMode, setGroupMode] = useState<"sabor" | "sabor_tamano">("sabor_tamano");

  // refs export PDF (VENTAS)
  const headerRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const ventasDiaRef = useRef<HTMLDivElement | null>(null);
  const pagosMetodoRef = useRef<HTMLDivElement | null>(null);
  const topIngresoRef = useRef<HTMLDivElement | null>(null);
  const topUnidadesRef = useRef<HTMLDivElement | null>(null);
  const tablaRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);

  // refs export PDF (INSUMOS)
  const insHeaderRef = useRef<HTMLDivElement | null>(null);
  const insCardsRef = useRef<HTMLDivElement | null>(null);
  const insChartsRef = useRef<HTMLDivElement | null>(null);
  const insTablePagesRef = useRef<HTMLDivElement | null>(null);

  const insumosDash = useInsumosDashboard({
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    collectionName: "insumos",
  });

  const { ini, fin, rangoLabel } = useMemo(() => {
    let ini: Date, fin: Date;
    let rangoLabel: string = rangos[rango]?.label ?? "Rango";
    if (rango < 3) {
      [ini, fin] = rangos[rango].get!();
    } else {
      ini = startOfDay(parseISO(fechaIni));
      fin = endOfDay(parseISO(fechaFin));
      rangoLabel = `Personalizado (${fechaIni} a ${fechaFin})`;
    }
    return { ini, fin, rangoLabel };
  }, [rango, fechaIni, fechaFin]);

  useEffect(() => {
    if (tab !== "ventas") return;

    setLoadingVentas(true);

    const q = query(collection(db, "pedidos"), where("pagoConfirmado", "==", true));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((p) => {
            // ✅ ventas por fecha de confirmación de pago
            const f = toDate((p as any).pagoConfirmadoAt ?? (p as any).fecha);
            return f && !isBefore(f, ini) && !isAfter(f, fin);
          });

        setVentas(arr);
        setLoadingVentas(false);
      },
      (err) => {
        console.error("ventas onSnapshot error:", err);
        setLoadingVentas(false);
      }
    );

    return () => unsub();
  }, [tab, ini, fin]);

  const total = useMemo(() => ventas.reduce((acc, v) => acc + safeNumber(v.total), 0), [ventas]);
  const nPedidos = ventas.length;

  const totUnidades = useMemo(() => {
    return ventas.reduce((a, v) => {
      const prods = Array.isArray(v.productos) ? v.productos : [];
      return a + prods.reduce((s: number, p: any) => s + (safeNumber(p.cantidad) || 1), 0);
    }, 0);
  }, [ventas]);

  const ticketPromedio = nPedidos > 0 ? total / nPedidos : 0;
  const itemsPorPedido = nPedidos > 0 ? totUnidades / nPedidos : 0;

  const pagosPorMetodo = useMemo(() => {
    const conteo: Record<string, number> = {};
    const monto: Record<string, number> = {};

    ventas.forEach((v) => {
      const k = normMedioPago(v.medioPago);
      conteo[k] = (conteo[k] || 0) + 1;
      monto[k] = (monto[k] || 0) + safeNumber(v.total);
    });

    for (const m of METODOS_PAGO_UI) {
      conteo[m.key] = conteo[m.key] ?? 0;
      monto[m.key] = monto[m.key] ?? 0;
    }

    return { conteo, monto };
  }, [ventas]);

  const { fechasLabels, ventasPorDia } = useMemo(() => {
    const fechasMap: Record<string, number> = {};
    ventas.forEach((v) => {
      // ✅ clave: por pagoConfirmadoAt para que el chart coincida con ventas pagadas
      const dt = toDate(v.pagoConfirmadoAt ?? v.fecha);
      if (!dt) return;
      const f = format(dt, "yyyy-MM-dd");
      fechasMap[f] = (fechasMap[f] || 0) + safeNumber(v.total);
    });

    const labels: string[] = [];
    let cur = startOfDay(ini);
    const end = startOfDay(fin);
    while (cur <= end) {
      labels.push(format(cur, "yyyy-MM-dd"));
      cur = addDays(cur, 1);
    }

    return { fechasLabels: labels, ventasPorDia: labels.map((f) => fechasMap[f] || 0) };
  }, [ventas, ini, fin]);

  const ventasDayChart = {
    labels: fechasLabels,
    datasets: [
      {
        label: "Ventas S/",
        data: ventasPorDia,
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
      },
    ],
  };

  const pieTamanos = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of ventas) {
      const items = Array.isArray(v.productos) ? v.productos : [];
      for (const p of items) {
        const t = normSize(p.tamaño);
        map[t] = (map[t] || 0) + (safeNumber(p.cantidad) || 1);
      }
    }

    const labels = Object.keys(map);
    const data = labels.map((k) => map[k]);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            "rgba(56,189,248,0.75)",
            "rgba(16,185,129,0.75)",
            "rgba(251,191,36,0.75)",
            "rgba(148,163,184,0.65)",
          ],
          borderWidth: 1,
          borderColor: "rgba(2,6,23,0.35)",
        },
      ],
    };
  }, [ventas]);

  const { productosRows, barTopIngreso, barTopUnidades, pieMedios } = useMemo(() => {
    const agg: Record<string, { nombre: string; unidades: number; ingreso: number }> = {};

    ventas.forEach((v) => {
      const items = Array.isArray(v.productos) ? v.productos : [];
      items.forEach((p: any) => {
        const nombre = String(p.nombre ?? "Producto");
        const key = prodKey(p, groupMode);

        const qty = safeNumber(p.cantidad) || 1;
        const subtotal = safeNumber(p.subtotal);
        const precioUnitario = safeNumber(p.precioUnitario ?? p.precioUnit ?? p.precio);

        const ingreso = subtotal > 0 ? subtotal : precioUnitario > 0 ? precioUnitario * qty : 0;

        if (!agg[key]) agg[key] = { nombre, unidades: 0, ingreso: 0 };
        agg[key].unidades += qty;
        agg[key].ingreso += ingreso;
      });
    });

    const productosRows: ProductoVentaRow[] = Object.entries(agg).map(([key, v]) => ({
      key,
      nombre: v.nombre,
      unidades: v.unidades,
      ingreso: v.ingreso,
    }));

    const topIngreso = [...productosRows].sort((a, b) => b.ingreso - a.ingreso).slice(0, 10);
    const topUnidades = [...productosRows].sort((a, b) => b.unidades - a.unidades).slice(0, 10);

    const barTopIngreso = {
      labels: topIngreso.map((x) => x.nombre),
      datasets: [
        {
          label: "Ingreso (S/)",
          data: topIngreso.map((x) => x.ingreso),
          backgroundColor: "rgba(16,185,129,0.65)",
          borderColor: "rgba(16,185,129,0.95)",
          borderWidth: 1,
        },
      ],
    };

    const barTopUnidades = {
      labels: topUnidades.map((x) => x.nombre),
      datasets: [
        {
          label: "Unidades vendidas",
          data: topUnidades.map((x) => x.unidades),
          backgroundColor: "rgba(56,189,248,0.65)",
          borderColor: "rgba(56,189,248,0.95)",
          borderWidth: 1,
        },
      ],
    };

    const medios: Record<string, number> = {};
    ventas.forEach((v) => {
      const k = normMedioPago(v.medioPago);
      medios[k] = (medios[k] || 0) + 1;
    });

    const methodColors: Record<string, string> = {
      yape: "rgba(139,92,246,0.9)",
      plin: "rgba(56,189,248,0.9)",
      efectivo: "rgba(52,211,153,0.9)",
      tarjeta: "rgba(148,163,184,0.85)",
      culqi: "rgba(251,191,36,0.9)",
      paypal: "rgba(99,102,241,0.9)",
      otro: "rgba(148,163,184,0.6)",
    };

    const pieMedios = {
      labels: Object.keys(medios),
      datasets: [
        {
          data: Object.values(medios),
          backgroundColor: Object.keys(medios).map(
            (k) => methodColors[k] || "rgba(56,189,248,0.9)"
          ),
          borderColor: "rgba(2,6,23,0.4)",
          borderWidth: 1,
        },
      ],
    };

    return { productosRows, barTopIngreso, barTopUnidades, pieMedios };
  }, [ventas, groupMode]);

  async function onExportPdf() {
    setExportingPdf(true);
    try {
      if (tab === "ventas") {
        if (
          !headerRef.current ||
          !cardsRef.current ||
          !ventasDiaRef.current ||
          !pagosMetodoRef.current ||
          !topIngresoRef.current ||
          !topUnidadesRef.current ||
          !tablaRef.current
        ) {
          return;
        }

        const fileName = `reporte-ventas-${format(new Date(), "yyyy-MM-dd")}.pdf`;

        await exportVentasGridPdf({
          fileName,
          headerEl: headerRef.current,
          cardsEl: cardsRef.current,
          ventasPorDiaEl: ventasDiaRef.current,
          pagosMetodoEl: pagosMetodoRef.current,
          topIngresoEl: topIngresoRef.current,
          topUnidadesEl: topUnidadesRef.current,
          tablaEl: tablaRef.current,
          footerEl: footerRef.current ?? undefined,
          bgColor: "#ffffff",
        });

        return;
      }

      // INSUMOS multipágina
      if (!insHeaderRef.current || !insCardsRef.current || !insChartsRef.current || !insTablePagesRef.current) {
        return;
      }

      const fileName = `reporte-insumos-${format(new Date(), "yyyy-MM-dd")}.pdf`;

      await exportInsumosPdf({
        fileName,
        headerEl: insHeaderRef.current,
        cardsEl: insCardsRef.current,
        chartsEl: insChartsRef.current,
        tablePagesEl: insTablePagesRef.current,
        bgColor: "#ffffff",
      });
    } finally {
      setExportingPdf(false);
    }
  }

  const pillFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const pageWrap = "min-h-screen bg-background text-foreground";
  const card = "bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm";
  const muted = "text-muted-foreground";

  // Tabla PDF (insumos) paginada
  const insumosSortedForPdf = useMemo(() => {
    return [...insumosDash.insumos].sort((a: any, b: any) => {
      const va = Number(a.stock || 0) * Number(a.costo || 0);
      const vb = Number(b.stock || 0) * Number(b.costo || 0);
      return vb - va;
    });
  }, [insumosDash.insumos]);

  const insumoPdfChunks = useMemo(() => {
    return chunk(insumosSortedForPdf, 18);
  }, [insumosSortedForPdf]);

  return (
    <div className={pageWrap}>
      <div className="max-w-6xl mx-auto p-4 flex flex-col gap-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground">Ventas</h1>
            <p className={`text-sm ${muted} mt-1`}>PDF A4 (cuadrícula) y PDF Insumos multipágina.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportPdf}
              disabled={exportingPdf || (tab === "ventas" ? loadingVentas : insumosDash.loading)}
              className={[
                "px-4 py-2 rounded-xl font-extrabold border transition",
                exportingPdf || (tab === "ventas" ? loadingVentas : insumosDash.loading)
                  ? "opacity-60 pointer-events-none bg-muted border-border/60 text-muted-foreground"
                  : "bg-card border-border/60 hover:bg-muted text-foreground",
              ].join(" ")}
            >
              {exportingPdf ? "Generando PDF…" : "Descargar PDF"}
            </button>

            <div className="inline-flex rounded-full bg-muted/60 p-1.5 border border-border/60 shadow-sm gap-1">
              <button
                onClick={() => setTab("ventas")}
                className={[
                  "px-5 py-2 rounded-full font-extrabold transition",
                  pillFocus,
                  tab === "ventas"
                    ? "bg-card text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                ].join(" ")}
                type="button"
              >
                Ventas
              </button>

              <button
                onClick={() => setTab("insumos")}
                className={[
                  "px-5 py-2 rounded-full font-extrabold transition",
                  pillFocus,
                  tab === "insumos"
                    ? "bg-card text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                ].join(" ")}
                type="button"
              >
                Insumos (balance)
              </button>
            </div>
          </div>
        </div>

        {tab === "ventas" && (
          <>
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
                  <span className={`mt-1 ${muted}`}>a</span>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="border border-border rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>

            {/* Resumen cards (pantalla) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Ventas totales</div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  S/ {money(total)}
                </div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Pedidos pagados</div>
                <div className="text-2xl font-extrabold text-primary">{nPedidos}</div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Unidades vendidas</div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {totUnidades}
                </div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Promedio por pedido</div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  S/ {money(ticketPromedio)}
                </div>
              </div>
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Items por pedido</div>
                <div className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-300">
                  {itemsPorPedido.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Controles de agrupación */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-bold text-foreground">Agrupar top productos:</div>
              <button
                type="button"
                onClick={() => setGroupMode("sabor")}
                className={[
                  "px-3 py-2 rounded-lg font-extrabold border transition",
                  pillFocus,
                  groupMode === "sabor"
                    ? "bg-primary text-primary-foreground border-primary/30"
                    : "bg-card border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                Por sabor
              </button>
              <button
                type="button"
                onClick={() => setGroupMode("sabor_tamano")}
                className={[
                  "px-3 py-2 rounded-lg font-extrabold border transition",
                  pillFocus,
                  groupMode === "sabor_tamano"
                    ? "bg-primary text-primary-foreground border-primary/30"
                    : "bg-card border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                Sabor + tamaño
              </button>
            </div>

            {/* Gráficos (pantalla) */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5 md:col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Ventas por día</h2>
                <Line data={ventasDayChart} options={commonLineOptions} />
              </div>

              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Pagos por método (rango)</h2>
                <PagosPorMetodoPanel conteo={pagosPorMetodo.conteo} monto={pagosPorMetodo.monto} />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Distribución por tamaño</h2>
                <Pie data={pieTamanos} options={commonPieOptions} />
              </div>

              <div className={`${card} p-5 md:col-span-2`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Métodos de pago (chart)</h2>
                <Pie data={pieMedios} options={commonPieOptions} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Top productos por ingreso</h2>
                <Bar data={barTopIngreso} options={{ ...commonBarOptions, indexAxis: "y" }} />
              </div>

              <div className={`${card} p-5`}>
                <h2 className="text-lg font-bold text-foreground mb-4">Top productos por unidades</h2>
                <Bar data={barTopUnidades} options={{ ...commonBarOptions, indexAxis: "y" }} />
              </div>
            </div>

            {/* Reporte oculto (VENTAS) blanco para PDF */}
            <div className="sr-only">
              <div className="p-8 bg-white text-slate-900 w-[900px]">
                <div ref={headerRef} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/logo-cosmos.png"
                        alt="Cosmos"
                        className="h-10 w-auto object-contain"
                      />
                      <div className="min-w-0">
                        <div className="text-2xl font-extrabold leading-tight">Reporte de Ventas</div>
                        <div className="text-sm text-slate-600">{rangoLabel}</div>
                        <div className="text-xs text-slate-500">
                          Generado: {format(new Date(), "yyyy-MM-dd HH:mm")}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500">Total ventas</div>
                      <div className="text-2xl font-extrabold text-emerald-600">S/ {money(total)}</div>
                    </div>
                  </div>

                  <div className="mt-4 h-[1px] bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
                </div>

                <div ref={cardsRef} className="grid grid-cols-5 gap-3 mt-4">
                  {[
                    ["Ventas totales", `S/ ${money(total)}`],
                    ["Pedidos pagados", `${nPedidos}`],
                    ["Unidades vendidas", `${totUnidades}`],
                    ["Promedio por pedido", `S/ ${money(ticketPromedio)}`],
                    ["Items por pedido", `${itemsPorPedido.toFixed(2)}`],
                  ].map(([t, v]) => (
                    <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-[11px] text-slate-500">{t}</div>
                      <div className="text-lg font-extrabold mt-1 text-slate-900">{v}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div ref={ventasDiaRef} className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-extrabold mb-2 text-slate-900">Ventas por día</div>
                    <Line data={ventasDayChart} options={printLineOptions} />
                  </div>

                  <div ref={pagosMetodoRef} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-extrabold mb-2 text-slate-900">Pagos por método</div>
                    <PagosPorMetodoPanel
                      conteo={pagosPorMetodo.conteo}
                      monto={pagosPorMetodo.monto}
                      variant="print"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div ref={topIngresoRef} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-extrabold mb-2 text-slate-900">Top productos por ingreso</div>
                    <Bar data={barTopIngreso} options={{ ...printBarOptions, indexAxis: "y" }} />
                  </div>

                  <div ref={topUnidadesRef} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-extrabold mb-2 text-slate-900">Top productos por unidades</div>
                    <Bar data={barTopUnidades} options={{ ...printBarOptions, indexAxis: "y" }} />
                  </div>
                </div>

                <div ref={tablaRef} className="rounded-2xl border border-slate-200 bg-white p-4 mt-4">
                  <div className="font-extrabold mb-2 text-slate-900">Productos vendidos (Top 25)</div>
                  <ProductosTablaPdf rows={productosRows} />
                </div>

                <div ref={footerRef} className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <div>Cosmos · Reporte interno</div>
                  <div>{format(new Date(), "yyyy-MM-dd HH:mm")}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "insumos" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`${card} p-6 text-center`}>
                <div className={`text-xs ${muted} mb-1`}>Valor total inventario</div>
                <div className="text-2xl font-extrabold text-primary">
                  S/ {money(insumosDash.insumoStats.totalValor)}
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

            {/* ===== Reporte oculto (INSUMOS) multipágina ===== */}
            <div className="sr-only">
              <div className="p-8 bg-white text-slate-900 w-[900px]">
                <div ref={insHeaderRef} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/logo-cosmos.png"
                        alt="Cosmos"
                        className="h-10 w-auto object-contain"
                      />
                      <div className="min-w-0">
                        <div className="text-2xl font-extrabold leading-tight">Reporte de Insumos</div>
                        <div className="text-xs text-slate-500">
                          Generado: {format(new Date(), "yyyy-MM-dd HH:mm")}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500">Valor total inventario</div>
                      <div className="text-2xl font-extrabold text-primary">
                        S/ {money(insumosDash.insumoStats.totalValor)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-[1px] bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
                </div>

                <div ref={insCardsRef} className="grid grid-cols-4 gap-3 mt-4">
                  {[
                    ["Valor total inventario", `S/ ${money(insumosDash.insumoStats.totalValor)}`],
                    ["# Insumos", `${insumosDash.insumos.length}`],
                    ["Sin stock", `${insumosDash.insumoStats.sinStock}`],
                    [`Stock bajo (≤ ${LOW_STOCK_THRESHOLD})`, `${insumosDash.insumoStats.stockBajo}`],
                  ].map(([t, v]) => (
                    <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-[11px] text-slate-500">{t}</div>
                      <div className="text-lg font-extrabold mt-1 text-slate-900">{v}</div>
                    </div>
                  ))}
                </div>

                <div ref={insChartsRef} className="grid grid-cols-3 gap-3 mt-4">
                  <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-extrabold mb-2 text-slate-900">Top insumos por valor</div>
                    {insumosDash.loading ? (
                      <div className="text-sm text-slate-500">Cargando…</div>
                    ) : (
                      <Bar data={insumosDash.charts.insumosValorBar} options={printBarOptions} />
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-extrabold mb-2 text-slate-900">Unidades (distribución)</div>
                    {insumosDash.loading ? (
                      <div className="text-sm text-slate-500">Cargando…</div>
                    ) : (
                      <Pie data={insumosDash.charts.insumosUnidadPie} options={printPieOptions} />
                    )}
                  </div>
                </div>

                {/* Páginas de tabla */}
                <div ref={insTablePagesRef}>
                  {insumoPdfChunks.map((chunkRows, idx) => (
                    <InsumosTablaPdfPage
                      key={idx}
                      title={idx === 0 ? "Todos los insumos" : "Todos los insumos (continuación)"}
                      insumos={chunkRows as any}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}