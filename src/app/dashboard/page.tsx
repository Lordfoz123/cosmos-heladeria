"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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
  Filler,
  type ChartOptions,
} from "chart.js";
import { format, startOfDay, subDays, isAfter, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { 
  FileText, 
  Table as TableIcon, 
  TrendingUp, 
  BarChart3, 
  Wallet,
  Calendar,
  Package,
  Package2,
  XCircle,
  AlertCircle,
  Milk, 
  Layers, 
  IceCream2, 
  TestTube,
  ImageIcon,
  Trophy,
  Clock,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"; 

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(
  BarElement, LineElement, PointElement, CategoryScale, 
  LinearScale, ArcElement, Tooltip, Legend, TimeScale, Filler
);

function toDate(ts: any) {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  return null;
}

function obtenerNombreCliente(item: any) {
  if (!item) return "Cliente General";
  if (typeof item.cliente === 'string') return item.cliente;
  if (item.cliente?.nombre) return item.cliente.nombre;
  if (item.nombreCliente) return item.nombreCliente;
  return "Cliente General";
}

const getPoteIcon = (nombreTamano: string) => {
  if (!nombreTamano) return "/icons/pote-16oz.png";
  const nombre = nombreTamano.toLowerCase();
  if (nombre.includes("8")) return "/icons/pote-8oz.png";
  if (nombre.includes("16")) return "/icons/pote-16oz.png";
  if (nombre.includes("32") || nombre.includes("litro") || nombre.includes("25")) return "/icons/pote-32oz.png";
  return "/icons/pote-16oz.png";
};

const METODOS_PAGO_UI = [
  { key: "yape", nombre: "Yape", logo: "/brand/payments/yape.png" },
  { key: "plin", nombre: "Plin", logo: "/brand/payments/plin.png" },
  { key: "tarjeta", nombre: "Tarjeta", logo: "/brand/payments/tarjeta.png" },
];

const CHART_COLORS = {
  primary: "rgba(56,189,248,0.95)", 
  primaryFill: "rgba(56,189,248,0.14)",
  emerald: "rgba(16, 185, 129, 0.9)",
  emeraldFill: "rgba(16, 185, 129, 0.15)",
  amber: "rgba(245, 158, 11, 0.9)",
  amberFill: "rgba(245, 158, 11, 0.15)",
  mutedText: "rgba(148,163,184,0.85)", 
  grid: "rgba(148,163,184,0.12)",
  tooltipBg: "rgba(15,23,42,0.95)", 
  tooltipText: "rgba(226,232,240,0.95)", 
};

const commonBarOptions: ChartOptions<"bar"> = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: CHART_COLORS.tooltipBg, titleColor: CHART_COLORS.tooltipText, bodyColor: CHART_COLORS.tooltipText, padding: 10 } },
  scales: { x: { ticks: { color: CHART_COLORS.mutedText }, grid: { color: CHART_COLORS.grid } }, y: { ticks: { color: CHART_COLORS.mutedText }, grid: { color: CHART_COLORS.grid }, beginAtZero: true } },
};

function MiniTable({ rows, title, columns }: { rows: any[], title: string, columns: { key: string, label: string, isNum?: boolean }[] }) {
    return (
        <div className="rounded-[2.5rem] border border-border bg-card overflow-hidden h-full flex flex-col shadow-sm">
            <div className="p-6 border-b border-border bg-muted/30">
                <h3 className="font-extrabold text-sm uppercase tracking-widest text-muted-foreground">{title}</h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px] p-2">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card z-10">
                        <tr className="border-b border-border">
                            {columns.map(c => (
                                <th key={c.key} className={`px-4 py-3 text-muted-foreground font-bold uppercase tracking-wider ${c.isNum ? 'text-right' : 'text-left'}`}>{c.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={columns.length} className="p-6 text-center text-muted-foreground italic font-medium">No hay datos suficientes</td></tr>
                        ) : (
                            rows.map((r, i) => (
                                <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors group">
                                    {columns.map((c, colIdx) => (
                                        <td key={c.key} className={`px-4 py-3 font-semibold text-foreground/80 ${c.isNum ? 'text-right tabular-nums font-black text-foreground' : ''}`}>
                                            {colIdx === 0 && r.imagen !== undefined ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-background border border-border overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                                                        {r.imagen ? <img src={r.imagen} className="w-full h-full object-cover transition-transform group-hover:scale-110"/> : <ImageIcon className="w-4 h-4 text-muted-foreground"/>}
                                                    </div>
                                                    <span className="truncate">{r[c.key]}</span>
                                                </div>
                                            ) : (
                                                typeof r[c.key] === 'string' && r[c.key].includes('<span') ? 
                                                    <div dangerouslySetInnerHTML={{__html: r[c.key]}} className="flex flex-wrap justify-end gap-1" /> 
                                                    : r[c.key]
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, colorClass = "text-foreground" }: { label: string, value: any, icon: any, colorClass?: string }) {
  return (
    <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-sm flex flex-col justify-center relative group hover:shadow-md transition-all duration-300 h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="opacity-50 group-hover:opacity-100 transition-opacity">{icon}</div>
      </div>
      <span className={cn("text-3xl font-black tabular-nums tracking-tight", colorClass)}>
        {value}
      </span>
    </div>
  );
}

function PedidoCard({ pedido }: { pedido: any }) {
    const fecha = toDate(pedido.fecha);
    const esCompletado = ["Enviado", "Completado", "Entregado"].includes(pedido.estado);
    const nombreDeCliente = obtenerNombreCliente(pedido);
    
    return (
        <div className="p-5 rounded-3xl border border-border bg-muted/20 hover:bg-card hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="font-black text-[13px] text-foreground uppercase tracking-tight">{nombreDeCliente}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{fecha ? format(fecha, "dd MMM yyyy, HH:mm", { locale: es }) : "Sin fecha"}</p>
                </div>
                <Badge className={cn("border-0 text-[9px] uppercase font-black tracking-widest shadow-none", esCompletado ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500")}>
                    {pedido.estado || "Pendiente"}
                </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
                {(pedido.productos || pedido.items || []).map((prod: any, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-background border border-border rounded-lg text-[10px] font-bold text-foreground/70 flex items-center gap-1.5 shadow-sm">
                        {/* 🔥 Reemplazado text-primary por un azul adaptable 🔥 */}
                        <span className="text-blue-600 dark:text-blue-400 font-black">{prod.cantidad}x</span> {prod.nombre || prod.producto}
                    </span>
                ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border border-dashed">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" /> {pedido.metodoPago || "Efectivo"}
                </span>
                <span className="font-black text-foreground text-sm tabular-nums">S/ {Number(pedido.total || 0).toFixed(2)}</span>
            </div>
        </div>
    );
}

export default function DashboardPage() {
  // 🔥 CORRECCIÓN: Se cambió "inventario" a "insumos" para que coincida con los botones
  const [tab, setTab] = useState<"resumen" | "pedidos" | "produccion" | "insumos">("resumen");
  
  const [rango, setRango] = useState(1); 
  const [fechaIni, setFechaIni] = useState(() => format(startOfDay(new Date()), "yyyy-MM-dd"));
  const [fechaFin, setFechaFin] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const [alertaTab, setAlertaTab] = useState<"materia_prima" | "producto_final">("materia_prima"); 
  
  const [ventas, setVentas] = useState<any[]>([]);
  const [insumosList, setInsumosList] = useState<any[]>([]);
  const [todosLosPedidos, setTodosLosPedidos] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "pedidos"), where("estado", "==", "Enviado"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVentas(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInsumosList(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pedidos"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // 🔥 AQUÍ ESTÁ EL ARREGLO: Agregamos : any a las variables a y b
      data.sort((a: any, b: any) => {
          const dateA = toDate(a.fecha)?.getTime() || 0;
          const dateB = toDate(b.fecha)?.getTime() || 0;
          return dateB - dateA;
      });
      setTodosLosPedidos(data);
    });
    return () => unsub();
  }, []);

  const { pedidosPendientes, pedidosCompletados } = useMemo(() => {
      const hoy = new Date();
      let inicio: Date;
      let fin: Date = endOfDay(hoy);

      if (rango === 0) {
          inicio = startOfDay(hoy);
      } else if (rango === 1) {
          inicio = startOfDay(subDays(hoy, 7));
      } else if (rango === 2) {
          inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      } else if (rango === 3) {
          inicio = new Date(hoy.getFullYear(), 0, 1); 
      } else {
          const [yI, mI, dI] = fechaIni.split("-").map(Number);
          const [yF, mF, dF] = fechaFin.split("-").map(Number);
          inicio = startOfDay(new Date(yI, mI - 1, dI));
          fin = endOfDay(new Date(yF, mF - 1, dF));
      }

      const pedidosEnRango = todosLosPedidos.filter(v => {
          const f = toDate(v.fecha);
          if (!f) return false;
          if (rango === 4) {
              return f.getTime() >= inicio.getTime() && f.getTime() <= fin.getTime();
          }
          return f.getTime() >= inicio.getTime();
      });

      const pendientes = pedidosEnRango.filter(p => !["Enviado", "Completado", "Entregado", "Cancelado"].includes(p.estado));
      const completados = pedidosEnRango.filter(p => ["Enviado", "Completado", "Entregado"].includes(p.estado));
      return { pedidosPendientes: pendientes, pedidosCompletados: completados };
  }, [todosLosPedidos, rango, fechaIni, fechaFin]);

  const ventasFiltradas = useMemo(() => {
    const hoy = new Date();
    let inicio: Date;
    let fin: Date = endOfDay(hoy);

    if (rango === 0) {
        inicio = startOfDay(hoy);
    } else if (rango === 1) {
        inicio = startOfDay(subDays(hoy, 7));
    } else if (rango === 2) {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (rango === 3) {
        inicio = new Date(hoy.getFullYear(), 0, 1); 
    } else {
        const [yI, mI, dI] = fechaIni.split("-").map(Number);
        const [yF, mF, dF] = fechaFin.split("-").map(Number);
        inicio = startOfDay(new Date(yI, mI - 1, dI));
        fin = endOfDay(new Date(yF, mF - 1, dF));
    }

    return ventas.filter(v => {
      const f = toDate(v.fecha);
      if (!f) return false;
      
      if (rango === 4) {
          return f.getTime() >= inicio.getTime() && f.getTime() <= fin.getTime();
      }
      return f.getTime() >= inicio.getTime();
    });
  }, [ventas, rango, fechaIni, fechaFin]);

  const stats = useMemo(() => {
    const total = ventasFiltradas.reduce((acc, v) => acc + (v.total || 0), 0);
    const pedidos = ventasFiltradas.length;
    return { total, pedidos, ticketPromedio: pedidos > 0 ? total / pedidos : 0 };
  }, [ventasFiltradas]);

  const pagosStats = useMemo(() => {
    const map: Record<string, { count: number, total: number }> = {
      yape: { count: 0, total: 0 }, plin: { count: 0, total: 0 }, tarjeta: { count: 0, total: 0 }
    };
    ventasFiltradas.forEach(v => {
      const m = (v.metodoPago || "").toLowerCase();
      if (map[m]) { map[m].count++; map[m].total += (v.total || 0); }
    });
    return map;
  }, [ventasFiltradas]);

  const topProductosVendidos = useMemo(() => {
      const map = new Map<string, { cantidad: number, imagen?: string }>();

      ventasFiltradas.forEach(v => {
          (v.productos || v.items || []).forEach((item: any) => {
              const nombreTicket = (item.nombre || item.producto || "Desconocido").trim();
              const cant = Number(item.cantidad) || 1;

              const insumoMatch = insumosList.find(i => {
                  const nombreBD = (i.nombre || "").toLowerCase().trim();
                  const nTicket = nombreTicket.toLowerCase();
                  if (nombreBD === nTicket || nombreBD.includes(nTicket) || nTicket.includes(nombreBD)) return true;
                  return (i.tamanos || []).some((t:any) => (t.nombre || "").toLowerCase().trim() === nTicket);
              });

              const nombreOficial = insumoMatch ? insumoMatch.nombre : nombreTicket;
              const imagenOficial = insumoMatch ? insumoMatch.imagen : undefined;

              if (map.has(nombreOficial)) {
                  map.get(nombreOficial)!.cantidad += cant;
              } else {
                  map.set(nombreOficial, { cantidad: cant, imagen: imagenOficial });
              }
          });
      });
      
      const sorted = Array.from(map.entries()).sort((a,b) => b[1].cantidad - a[1].cantidad).slice(0, 4);
      return sorted.map(([nombre, data]) => ({ nombre, cantidad: data.cantidad, imagen: data.imagen }));
  }, [ventasFiltradas, insumosList]);

  const { potes, materiasPrima, totalGlobalTamanos, valorMateriasPrimas } = useMemo(() => {
      const insumos = insumosList || [];
      const mapaUnificado = new Map();

      insumos.forEach(item => {
        const nombreNorm = (item.nombre || "").toLowerCase().trim();
        const tipo = (item.tipo || 'Sin Tipo').trim();
        const clave = `${tipo}_${nombreNorm}`;

        if (tipo.toLowerCase() === "producto final") {
          const destino = item.ultimoDestino === 'virtual' ? 'virtual' : 'fisica';

          if (!mapaUnificado.has(clave)) {
            mapaUnificado.set(clave, { 
              ...item,
              stocksDestino: {
                fisica: destino === 'fisica' ? (item.tamanos || []).map((t:any)=>({...t})) : [],
                virtual: destino === 'virtual' ? (item.tamanos || []).map((t:any)=>({...t})) : []
              }
            });
          } else {
            const existente = mapaUnificado.get(clave);
            const nuevosTamanos = (item.tamanos || []).map((t:any)=>({...t}));

            if (!existente.stocksDestino[destino] || existente.stocksDestino[destino].length === 0) {
              existente.stocksDestino[destino] = nuevosTamanos;
            } else {
              existente.stocksDestino[destino] = existente.stocksDestino[destino].map((t: any) => {
                const match = nuevosTamanos.find((nt:any) => nt.id === t.id);
                return match ? { ...t, stock: (Number(t.stock) || 0) + (Number(match.stock) || 0) } : t;
              });
            }
          }
        } else {
          mapaUnificado.set(item.id, item);
        }
      });

      const _potes: any[] = [];
      const _materias: any[] = [];
      const _totalGlobalTamanos = new Map<string, number>();

      Array.from(mapaUnificado.values()).forEach(i => {
          const tipo = (i.tipo || "").toLowerCase().trim();
          
          if (tipo === 'producto final') {
              let stockFisico = 0;
              let stockVirtual = 0;
              
              const fisicosMap = new Map();
              const virtualesMap = new Map();

              (i.stocksDestino?.fisica || []).forEach((t:any) => {
                  stockFisico += (Number(t.stock) || 0);
                  if(Number(t.stock) > 0) {
                      fisicosMap.set(t.nombre, (fisicosMap.get(t.nombre) || 0) + Number(t.stock));
                      _totalGlobalTamanos.set(t.nombre, (_totalGlobalTamanos.get(t.nombre) || 0) + Number(t.stock));
                  }
              });

              (i.stocksDestino?.virtual || []).forEach((t:any) => {
                  stockVirtual += (Number(t.stock) || 0);
                  if(Number(t.stock) > 0) {
                      virtualesMap.set(t.nombre, (virtualesMap.get(t.nombre) || 0) + Number(t.stock));
                      _totalGlobalTamanos.set(t.nombre, (_totalGlobalTamanos.get(t.nombre) || 0) + Number(t.stock));
                  }
              });

              let totalCalculado = stockFisico + stockVirtual;

              if (totalCalculado === 0 && Number(i.stock) > 0) {
                  totalCalculado = Number(i.stock);
                  _totalGlobalTamanos.set("Unidades Generales", (_totalGlobalTamanos.get("Unidades Generales") || 0) + totalCalculado);
              }

              const crearVisual = (mapa: Map<string, number>) => {
                  if (mapa.size === 0) return `<span class="text-muted-foreground italic text-[10px]">0</span>`;
                  return Array.from(mapa.entries())
                      .map(([nombre, cant]) => `<span class="bg-muted text-foreground px-2 py-0.5 rounded-md text-[10px] whitespace-nowrap border border-border"><b>${cant}</b> ${nombre}</span>`)
                      .join("");
              };

              _potes.push({ 
                  ...i, 
                  stockTotalCalculado: totalCalculado, 
                  fisicosVisual: crearVisual(fisicosMap),
                  virtualesVisual: crearVisual(virtualesMap)
              });
          } else if (tipo === 'materia prima') {
              _materias.push({ ...i, stockTotalCalculado: Number(i.stock) || 0 });
          }
      });

      _potes.sort((a,b) => b.stockTotalCalculado - a.stockTotalCalculado);
      _materias.sort((a,b) => b.stockTotalCalculado - a.stockTotalCalculado);

      const arrayTamanosGlobales = Array.from(_totalGlobalTamanos.entries()).map(([nombre, cantidad]) => ({nombre, cantidad}));

      return {
          potes: _potes,
          materiasPrima: _materias,
          totalGlobalTamanos: arrayTamanosGlobales,
          valorMateriasPrimas: _materias.reduce((acc, curr) => acc + (curr.stockTotalCalculado * (Number(curr.costo) || 0)), 0),
      };
  }, [insumosList]);

  const alertas = useMemo(() => {
      return {
          materia_prima: materiasPrima.filter(m => {
              const limite = m.umbralAlerta !== undefined ? Number(m.umbralAlerta) : 5;
              return m.stockTotalCalculado <= limite;
          }),
          producto_final: potes.filter(p => p.stockTotalCalculado <= 5) 
      };
  }, [materiasPrima, potes]);

  const hayAlertasActivas = alertas.materia_prima.length > 0 || alertas.producto_final.length > 0;

  const chartVentasLine = useMemo(() => {
      const map = new Map<string, { label: string, total: number, timestamp: number }>();
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

      ventasFiltradas.forEach(v => {
          const f = toDate(v.fecha);
          if (!f) return;

          let key = "";
          let label = "";
          let timestamp = f.getTime();

          if (rango === 0) {
              key = format(f, "yyyy-MM-dd-HH");
              label = format(f, "HH:00");
              timestamp = new Date(f.getFullYear(), f.getMonth(), f.getDate(), f.getHours()).getTime();
          } else if (rango === 3) {
              key = format(f, "yyyy-MM");
              label = `${monthNames[f.getMonth()]} ${format(f, "yy")}`; 
              timestamp = new Date(f.getFullYear(), f.getMonth(), 1).getTime();
          } else {
              key = format(f, "yyyy-MM-dd");
              label = format(f, "dd/MM");
              timestamp = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
          }

          if (!map.has(key)) {
              map.set(key, { label, total: 0, timestamp });
          }
          map.get(key)!.total += (v.total || 0);
      });

      const sortedEntries = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);

      return {
          labels: sortedEntries.map(e => e.label),
          datasets: [{
              label: "Ingresos Brutos (S/)",
              data: sortedEntries.map(e => Number(e.total.toFixed(2))),
              borderColor: "#10b981", 
              backgroundColor: "rgba(16, 185, 129, 0.15)", 
              fill: true, 
              tension: 0.4, 
              pointRadius: 4, 
              pointBackgroundColor: "#10b981", 
              pointBorderColor: "#fff", 
              pointBorderWidth: 2,
              pointHoverRadius: 6 
          }]
      };
  }, [ventasFiltradas, rango]);

  const chartInsumoVsStock = useMemo(() => ({
      labels: materiasPrima.slice(0, 15).map(m => m.nombre),
      datasets: [{
          label: "Stock Físico", data: materiasPrima.slice(0, 15).map(m => m.stockTotalCalculado),
          backgroundColor: CHART_COLORS.amberFill, borderColor: CHART_COLORS.amber, borderWidth: 1.5, borderRadius: 4,
      }]
  }), [materiasPrima]);

  const getRangoTextoParaExportar = () => {
      if (rango === 0) return "Hoy";
      if (rango === 1) return "Ultimos_7dias";
      if (rango === 2) return "Mes_Actual";
      if (rango === 3) return "Este_Ano";
      return `${fechaIni}_al_${fechaFin}`;
  };

  const exportarExcelDashboard = () => {
    try {
      const toastId = toast.loading("Generando reporte de Dashboard...");
      const workbook = XLSX.utils.book_new();

      const ventasAExportar = ventasFiltradas.map(v => ({
          "Fecha": v.fecha ? new Date(v.fecha.seconds * 1000).toLocaleString() : "N/A",
          "Cliente": obtenerNombreCliente(v), 
          "Total Pagado": `S/ ${Number(v.total || 0).toFixed(2)}`,
          "Método de Pago": v.metodoPago || "No especificado",
          "Items": v.productos?.map((p:any) => `${p.cantidad}x ${p.nombre}`).join(", ") || ""
      }));
      if(ventasAExportar.length > 0){
          const wsVentas = XLSX.utils.json_to_sheet(ventasAExportar);
          wsVentas["!cols"] = [{wch: 20}, {wch: 30}, {wch: 15}, {wch: 20}, {wch: 50}];
          XLSX.utils.book_append_sheet(workbook, wsVentas, "Ventas_Realizadas");
      }

      const pedidosAExportar = todosLosPedidos.map(p => ({
          "Fecha": p.fecha ? new Date(p.fecha.seconds * 1000).toLocaleString() : "N/A",
          "Cliente": obtenerNombreCliente(p), 
          "Estado": p.estado || "Pendiente",
          "Total": `S/ ${Number(p.total || 0).toFixed(2)}`,
          "Método de Pago": p.metodoPago || "No especificado",
          "Items": (p.productos || p.items || []).map((x:any) => `${x.cantidad}x ${x.nombre || x.producto}`).join(", ")
      }));
      if(pedidosAExportar.length > 0){
          const wsPedidos = XLSX.utils.json_to_sheet(pedidosAExportar);
          wsPedidos["!cols"] = [{wch: 20}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 50}];
          XLSX.utils.book_append_sheet(workbook, wsPedidos, "Historial_Pedidos");
      }

      const produccionAExportar = potes.map(p => ({
          "Tipo": p.tipo,
          "Producto": p.nombre,
          "Almacén Físico": p.fisicosVisual.replace(/<[^>]*>?/gm, ''), 
          "Tienda Virtual": p.virtualesVisual.replace(/<[^>]*>?/gm, ''), 
          "Total General (Unidades)": p.stockTotalCalculado
      }));
      if(produccionAExportar.length > 0){
          const wsProd = XLSX.utils.json_to_sheet(produccionAExportar);
          wsProd["!cols"] = [{wch: 15}, {wch: 35}, {wch: 30}, {wch: 30}, {wch: 20}];
          XLSX.utils.book_append_sheet(workbook, wsProd, "Producción_Potes");
      }

      const matPrimaAExportar = materiasPrima.map(m => ({
          "Materia Prima": m.nombre,
          "Stock Disponible": m.stockTotalCalculado,
          "Unidad": m.unidad || "kg",
          "Costo Unitario": `S/ ${Number(m.costo || 0).toFixed(2)}`,
          "Valorización Total": `S/ ${(m.stockTotalCalculado * Number(m.costo || 0)).toFixed(2)}`
      }));
      if(matPrimaAExportar.length > 0){
          const wsMat = XLSX.utils.json_to_sheet(matPrimaAExportar);
          wsMat["!cols"] = [{wch: 30}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 20}];
          XLSX.utils.book_append_sheet(workbook, wsMat, "Materias_Primas");
      }

      XLSX.writeFile(workbook, `Reporte_Dashboard_${getRangoTextoParaExportar()}.xlsx`);
      toast.dismiss(toastId);
      toast.success("¡Reporte Excel descargado con éxito!");
    } catch (error) {
      toast.error("Hubo un error al exportar el Excel");
    }
  };

  const exportarPDFDashboard = () => {
    try {
      const toastId = toast.loading("Diseñando reporte PDF...");
      const doc = new jsPDF();
      
      // 🔥 CORRECCIÓN: Contrato de 3 números para los colores
      const slate900: [number, number, number] = [17, 24, 39]; 
      const slate500: [number, number, number] = [100, 116, 139]; 
      const emerald600: [number, number, number] = [5, 150, 105]; 

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text("COSMOS - Reporte Gerencial", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(slate500[0], slate500[1], slate500[2]);
      
      const rangoVisual = rango === 0 ? "Hoy" : rango === 1 ? "Últimos 7 días" : rango === 2 ? "Mes Actual" : rango === 3 ? "Este Año" : `${fechaIni} al ${fechaFin}`;
      
      doc.text(`Período de Análisis: ${rangoVisual}`, 14, 26);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 31);
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 35, 196, 35);

      let startY = 45;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text("1. Desempeño Comercial", 14, startY);
      startY += 6;

      autoTable(doc, {
        startY: startY,
        head: [['Ingresos Brutos', 'Pedidos Pagados', 'Ticket Promedio']],
        body: [[
          `S/ ${stats.total.toFixed(2)}`,
          stats.pedidos.toString(),
          `S/ ${stats.ticketPromedio.toFixed(2)}`
        ]],
        theme: 'grid',
        headStyles: { fillColor: slate900, textColor: 255, halign: 'center' },
        bodyStyles: { halign: 'center', fontStyle: 'bold', textColor: emerald600, fontSize: 12 },
      });
      
      startY = (doc as any).lastAutoTable.finalY + 15;

      if (topProductosVendidos.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(slate900[0], slate900[1], slate900[2]);
          doc.text("2. Top Productos Más Vendidos", 14, startY);
          startY += 6;

          autoTable(doc, {
            startY: startY,
            head: [['Producto', 'Unidades Despachadas']],
            body: topProductosVendidos.map(p => [p.nombre, p.cantidad.toString()]),
            theme: 'striped',
            headStyles: { fillColor: slate500, textColor: 255 },
          });
          startY = (doc as any).lastAutoTable.finalY + 15;
      }

      const todasLasAlertas = [
          ...alertas.materia_prima.map(a => ({...a, cat: 'Materia Prima'})),
          ...alertas.producto_final.map(a => ({...a, cat: 'Producto Final'}))
      ];

      if (todasLasAlertas.length > 0) {
          if (startY > 220) { doc.addPage(); startY = 20; }

          doc.setFontSize(14);
          doc.setTextColor(239, 68, 68); 
          doc.text("3. Alertas de Reposición Urgente", 14, startY);
          startY += 6;

          autoTable(doc, {
            startY: startY,
            head: [['Categoría', 'Ítem / Producto', 'Stock Actual', 'Estado']],
            body: todasLasAlertas.map(a => [
                a.cat, 
                a.nombre, 
                `${Number(a.stockTotalCalculado).toFixed(2)} ${a.unidad || (a.cat === 'Producto Final' ? 'uds' : 'kg')}`,
                a.stockTotalCalculado <= 0 ? 'AGOTADO' : 'CRÍTICO'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68], textColor: 255 },
            bodyStyles: { textColor: slate900 },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 3) {
                    if (data.cell.raw === 'AGOTADO') {
                        data.cell.styles.textColor = [239, 68, 68];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [245, 158, 11];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
          });
          startY = (doc as any).lastAutoTable.finalY + 15;
      }

      if (startY > 220) { doc.addPage(); startY = 20; }

      doc.setFontSize(14);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text("4. Valorización y Balance de Inventario", 14, startY);
      startY += 6;

      const sumaGlobalPotes = potes.reduce((acc, curr) => acc + (Number(curr.stockTotalCalculado) || 0), 0);

      autoTable(doc, {
        startY: startY,
        head: [['Métrica', 'Total Calculado']],
        body: [
          ['Total Insumos (Materias Primas)', materiasPrima.length.toString()],
          ['Costo Almacenado (Materias Primas)', `S/ ${valorMateriasPrimas.toFixed(2)}`],
          ['Potes Finales (Disponibles para Venta)', `${sumaGlobalPotes} uds`],
        ],
        theme: 'striped',
        headStyles: { fillColor: slate500, textColor: 255 },
        bodyStyles: { fontStyle: 'bold' }
      });

      startY = (doc as any).lastAutoTable.finalY + 15;

      if (startY > 220) { doc.addPage(); startY = 20; }

      doc.setFontSize(14);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text("5. Estado de Pedidos (Pendientes)", 14, startY);
      startY += 6;

      if (pedidosPendientes.length > 0) {
          autoTable(doc, {
              startY: startY,
              head: [['Fecha', 'Cliente', 'Estado', 'Total']],
              body: pedidosPendientes.map(p => [
                  p.fecha ? new Date(p.fecha.seconds * 1000).toLocaleDateString() : "N/A",
                  obtenerNombreCliente(p), 
                  p.estado || "Pendiente",
                  `S/ ${Number(p.total || 0).toFixed(2)}`
              ]),
              theme: 'striped',
              headStyles: { fillColor: [245, 158, 11], textColor: 255 }, 
          });
          startY = (doc as any).lastAutoTable.finalY + 15;
      } else {
          doc.setFontSize(10);
          doc.setTextColor(slate500[0], slate500[1], slate500[2]);
          doc.text("No hay pedidos pendientes en este momento.", 14, startY);
          startY += 10;
      }

      if (startY > 220) { doc.addPage(); startY = 20; }

      doc.setFontSize(14);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text("6. Estado de Pedidos (Completados)", 14, startY);
      startY += 6;

      if (pedidosCompletados.length > 0) {
          autoTable(doc, {
              startY: startY,
              head: [['Fecha', 'Cliente', 'Estado', 'Total']],
              body: pedidosCompletados.map(p => [
                  p.fecha ? new Date(p.fecha.seconds * 1000).toLocaleDateString() : "N/A",
                  obtenerNombreCliente(p),
                  p.estado || "Completado",
                  `S/ ${Number(p.total || 0).toFixed(2)}`
              ]),
              theme: 'striped',
              headStyles: { fillColor: emerald600, textColor: 255 }, 
          });
          startY = (doc as any).lastAutoTable.finalY + 15;
      } else {
          doc.setFontSize(10);
          doc.setTextColor(slate500[0], slate500[1], slate500[2]);
          doc.text("No hay pedidos completados en este momento.", 14, startY);
          startY += 10;
      }

      doc.save(`Dashboard_${getRangoTextoParaExportar()}.pdf`);
      
      toast.dismiss(toastId);
      toast.success("¡PDF guardado en descargas!");

    } catch (error) {
        console.error("Error PDF:", error);
        toast.error("Ocurrió un error al crear el PDF");
    }
  };

  const mostrarSelectorFechas = tab !== "produccion" && tab !== "insumos";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-sans transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col gap-8">
        
        {/* HEADER Y TABS */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border pb-6">
            <div>
            {/* 🔥 CORRECCIÓN DEL TÍTULO "CENTRO DE CONTROL" PARA MODO OSCURO 🔥 */}
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Centro de Control
                </span>
            </div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Dashboard General</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl font-medium">Resumen en tiempo real de ventas, producción y almacén.</p>
            </div>
            
            <div className="flex gap-3 items-center">
                <div className="flex bg-card p-1.5 rounded-2xl border border-border shadow-sm overflow-x-auto">
                    {(
                    [
                        ["resumen", "Ventas"],
                        ["pedidos", "Pedidos"], 
                        ["produccion", "Potes"],
                        ["insumos", "Inventario"],
                    ] as const
                    ).map(([k, label]) => (
                    <button
                        key={k}
                        onClick={() => setTab(k)}
                        className={cn(
                        "px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap",
                        tab === k ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        {label}
                    </button>
                    ))}
                </div>
                
                <div className="flex gap-2 shrink-0">
                    <button onClick={exportarExcelDashboard} className="h-12 w-12 flex items-center justify-center bg-card border border-border rounded-2xl hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all shadow-sm group">
                        <TableIcon className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <button onClick={exportarPDFDashboard} className="h-12 w-12 flex items-center justify-center bg-card border border-border rounded-2xl hover:bg-rose-500/10 hover:border-rose-500/50 transition-all shadow-sm group">
                        <FileText className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </div>

        {/* SELECTOR DE FECHAS CONDICIONAL */}
        {mostrarSelectorFechas && (
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 animate-in fade-in slide-in-from-top-2">
                {["Hoy", "Últimos 7 días", "Mes Actual", "Este Año", "Personalizado"].map((l, i) => (
                <button 
                    key={l}
                    onClick={() => setRango(i)}
                    className={cn(
                        "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap",
                        rango === i ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-card border-border text-muted-foreground hover:bg-muted"
                    )}
                >{l}</button>
                ))}

                {rango === 4 && (
                    <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-left-4">
                        <input 
                            type="date" 
                            value={fechaIni} 
                            onChange={e => setFechaIni(e.target.value)} 
                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-transparent hover:border-border text-foreground outline-none focus:border-emerald-500 transition-colors bg-transparent cursor-pointer uppercase tracking-widest [color-scheme:dark]" 
                        />
                        <span className="text-muted-foreground font-black text-xs px-1">➔</span>
                        <input 
                            type="date" 
                            value={fechaFin} 
                            onChange={e => setFechaFin(e.target.value)} 
                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-transparent hover:border-border text-foreground outline-none focus:border-emerald-500 transition-colors bg-transparent cursor-pointer uppercase tracking-widest [color-scheme:dark]" 
                        />
                    </div>
                )}
            </div>
        )}

        {/* ========================================================= */}
        {/* TAB NUEVO: GESTIÓN DE PEDIDOS PENDIENTES Y COMPLETADOS */}
        {/* ========================================================= */}
        {tab === "pedidos" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-2 px-2">
                {/* 🔥 CORRECCIÓN DEL ÍCONO DE PAQUETE 🔥 */}
                <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight uppercase">Gestión de Pedidos</h2>
                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">Monitoreo del ciclo de vida de los despachos</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* COLUMNA: PEDIDOS PENDIENTES */}
                <div className="bg-card p-6 rounded-[2.5rem] border border-amber-500/20 shadow-sm flex flex-col h-[750px]">
                    <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                        <h3 className="font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-5 h-5" /> Pendientes
                        </h3>
                        <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-0 text-sm font-black shadow-none px-3 py-1">
                            {pedidosPendientes.length}
                        </Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {pedidosPendientes.length === 0 ? (
                             <div className="text-center py-20 text-muted-foreground font-bold text-xs uppercase tracking-widest italic opacity-60">
                                 No hay pedidos pendientes
                             </div>
                        ) : (
                             pedidosPendientes.map(p => <PedidoCard key={p.id} pedido={p} />)
                        )}
                    </div>
                </div>

                {/* COLUMNA: PEDIDOS COMPLETADOS */}
                <div className="bg-card p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-sm flex flex-col h-[750px]">
                    <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                        <h3 className="font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> Completados
                        </h3>
                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-0 text-sm font-black shadow-none px-3 py-1">
                            {pedidosCompletados.length}
                        </Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {pedidosCompletados.length === 0 ? (
                             <div className="text-center py-20 text-muted-foreground font-bold text-xs uppercase tracking-widest italic opacity-60">
                                 No hay pedidos completados
                             </div>
                        ) : (
                             pedidosCompletados.map(p => <PedidoCard key={p.id} pedido={p} />)
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: VENTAS Y RESUMEN */}
        {/* ========================================================= */}
        {tab === "resumen" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Ingresos Brutos" value={`S/ ${stats.total.toFixed(2)}`} colorClass="text-emerald-500" icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} />
                {/* 🔥 CORRECCIÓN DEL ÍCONO DE CALENDARIO 🔥 */}
                <StatCard label="Pedidos Completados" value={stats.pedidos} colorClass="text-foreground" icon={<Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />} />
                <StatCard label="Ticket Promedio" value={`S/ ${stats.ticketPromedio.toFixed(2)}`} colorClass="text-amber-500" icon={<BarChart3 className="w-5 h-5 text-amber-500" />} />
            </div>

            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <h3 className="font-extrabold text-lg uppercase tracking-widest text-foreground">Top Productos Vendidos</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {topProductosVendidos.map((prod, idx) => (
                        <div key={idx} className="p-4 rounded-[1.5rem] border border-border bg-muted/30 flex items-center gap-4 hover:bg-muted transition-all">
                            <div className="w-14 h-14 rounded-2xl bg-background border border-border overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                                {prod.imagen ? (
                                    <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover transition-transform hover:scale-110" />
                                ) : (
                                    <IceCream2 className="w-6 h-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate" title={prod.nombre}>{prod.nombre}</span>
                                {/* 🔥 CORRECCIÓN DE LA CANTIDAD VENDIDA 🔥 */}
                                <span className="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400 leading-none mt-1">
                                    {prod.cantidad} <span className="text-[9px] uppercase font-bold opacity-70 text-muted-foreground">unidades</span>
                                </span>
                            </div>
                        </div>
                    ))}
                    {topProductosVendidos.length === 0 && (
                        <div className="col-span-full py-6 text-center text-muted-foreground font-bold text-xs uppercase tracking-widest">No hay ventas en este periodo</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-[420px]">
                    <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Flujo de Ingresos (Línea de Tiempo)</h3>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full border border-emerald-500/20 uppercase tracking-widest">Live</span>
                    </div>
                    <div className="flex-1 relative">
                        <Line 
                            data={chartVentasLine} 
                            options={{ 
                                maintainAspectRatio: false, 
                                plugins: { 
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: 'rgba(0,0,0,0.8)',
                                        titleColor: '#fff',
                                        bodyColor: '#fff',
                                        callbacks: { label: (ctx) => `Ingresos: S/ ${Number(ctx.raw).toFixed(2)}` }
                                    }
                                }, 
                                scales: { 
                                    y: { 
                                        grid: { color: 'rgba(150,150,150,0.1)' }, 
                                        ticks: { 
                                            color: '#888',
                                            font: { size: 10, weight: 'bold' },
                                            callback: (value) => `S/ ${Number(value).toFixed(2)}` 
                                        },
                                        title: { display: true, text: 'Ingresos Brutos (Soles)', font: { size: 10, weight: 'bold' }, color: '#888' }
                                    }, 
                                    x: { 
                                        grid: { display: false }, 
                                        ticks: { color: '#888', font: { size: 10, weight: 'bold' } },
                                        title: { 
                                            display: true, 
                                            text: rango === 0 ? 'Horas del Día' : rango === 3 ? 'Meses del Año' : 'Fechas Analizadas', 
                                            font: { size: 10, weight: 'bold' }, 
                                            color: '#888' 
                                        }
                                    } 
                                } 
                            }} 
                        />
                    </div>
                </div>

                <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col h-[420px]">
                <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Cierre por Billetera</h3>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                    {METODOS_PAGO_UI.map(m => (
                    <div key={m.key} className="flex items-center justify-between p-4 bg-muted/30 rounded-[1.5rem] border border-border group hover:bg-muted transition-all duration-300">
                        <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-background p-2 rounded-xl border border-border shadow-sm">
                            <img src={m.logo} className="w-full h-full object-contain" alt="" />
                        </div>
                        <div>
                            <p className="font-black text-foreground text-sm uppercase tracking-tight">{m.nombre}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{pagosStats[m.key].count} Pedidos</p>
                        </div>
                        </div>
                        <p className="font-extrabold text-foreground text-lg tabular-nums">S/ {pagosStats[m.key].total.toFixed(2)}</p>
                    </div>
                    ))}
                </div>
                </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PRODUCCIÓN (POTES) */}
        {/* ========================================================= */}
        {tab === "produccion" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row gap-6 w-full">
                {totalGlobalTamanos.length === 0 ? (
                    <div className="w-full flex-1">
                        <StatCard label="Total Potes" value="0" icon={<Package className="w-5 h-5 text-muted-foreground" />} />
                    </div>
                ) : (
                    totalGlobalTamanos.map((tam, idx) => (
                        <div key={idx} className="w-full flex-1">
                            <StatCard 
                                label={`Potes de ${tam.nombre}`} 
                                value={tam.cantidad} 
                                colorClass="text-foreground" 
                                icon={<img src={getPoteIcon(tam.nombre)} alt={tam.nombre} className="w-8 h-8 object-contain drop-shadow-sm opacity-80 group-hover:opacity-100 transition-opacity" />} 
                            />
                        </div>
                    ))
                )}
            </div>

            <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
                <MiniTable 
                    title="Desglose de Inventario por Sabor y Ubicación" 
                    rows={potes.map(p => ({ 
                        imagen: p.imagen, 
                        nombre: p.nombre, 
                        fisico: p.fisicosVisual, 
                        virtual: p.virtualesVisual, 
                        total: `<span class="font-black text-foreground text-sm">${p.stockTotalCalculado}</span> <span class="text-[10px] text-muted-foreground uppercase font-bold">uds</span>` 
                    }))} 
                    columns={[
                        {key: 'nombre', label: 'Sabor de Pote'}, 
                        {key: 'fisico', label: 'Almacén Físico', isNum: true},
                        {key: 'virtual', label: 'Tienda Virtual', isNum: true},
                        {key: 'total', label: 'Suma Total', isNum: true}
                    ]}
                />
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: INVENTARIO (INSUMOS) */}
        {/* ========================================================= */}
        {tab === "insumos" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Costo Total Almacén" value={`S/ ${valorMateriasPrimas.toFixed(2)}`} colorClass="text-emerald-500" icon={<Package2 className="w-5 h-5 text-emerald-500"/>} />
              <StatCard label="Total Tipos de Insumos" value={materiasPrima.length} colorClass="text-foreground" icon={<Package className="w-5 h-5 text-muted-foreground"/>} />
              
              <StatCard 
                  label="En Riesgo (Bajos)" 
                  value={materiasPrima.filter(m => {
                      const limite = m.umbralAlerta !== undefined ? Number(m.umbralAlerta) : 5;
                      return m.stockTotalCalculado > 0 && m.stockTotalCalculado <= limite;
                  }).length} 
                  colorClass="text-amber-500" 
                  icon={<AlertCircle className="w-5 h-5 text-amber-500"/>} 
              />
              
              <StatCard label="Agotados (0)" value={materiasPrima.filter(m => m.stockTotalCalculado <= 0).length} colorClass="text-red-500" icon={<XCircle className="w-5 h-5 text-red-500"/>} />
            </div>

            {hayAlertasActivas && (
                <div className="bg-card p-8 rounded-[2.5rem] border border-red-500/20 shadow-sm animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                            <h3 className="font-extrabold text-lg uppercase tracking-widest text-foreground">Alertas de Reposición</h3>
                        </div>
                        
                        <div className="flex bg-muted p-1.5 rounded-2xl border border-border overflow-x-auto">
                            <button onClick={() => setAlertaTab("materia_prima")} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap", alertaTab === "materia_prima" ? "bg-background shadow-sm text-red-500" : "text-muted-foreground hover:text-foreground")}>
                                <Milk className="w-3.5 h-3.5"/> M. Prima <span className="bg-muted-foreground/20 px-2 py-0.5 rounded-full text-foreground">{alertas.materia_prima.length}</span>
                            </button>
                            <button onClick={() => setAlertaTab("producto_final")} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap", alertaTab === "producto_final" ? "bg-background shadow-sm text-red-500" : "text-muted-foreground hover:text-foreground")}>
                                <IceCream2 className="w-3.5 h-3.5"/> Prod. Final <span className="bg-muted-foreground/20 px-2 py-0.5 rounded-full text-foreground">{alertas.producto_final.length}</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[100px]">
                        {alertas[alertaTab].length === 0 ? (
                            <div className="col-span-full flex items-center justify-center text-muted-foreground font-bold text-xs uppercase tracking-widest opacity-60">
                                Todo en orden en esta categoría ✅
                            </div>
                        ) : (
                            alertas[alertaTab].map(ins => {
                                const stockVal = ins.stockTotalCalculado;
                                const isZero = stockVal <= 0;
                                return (
                                    <div key={ins.id} className={cn(
                                        "p-4 rounded-[1.5rem] border transition-all flex items-center gap-4",
                                        isZero ? "bg-red-500/10 border-red-500/20 shadow-sm" : "bg-amber-500/10 border-amber-500/20 shadow-sm"
                                    )}>
                                        <div className="w-12 h-12 rounded-xl bg-background border border-border overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                                            {ins.imagen ? (
                                                <img src={ins.imagen} alt={ins.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate" title={ins.nombre}>{ins.nombre}</span>
                                            <span className={cn(
                                                "text-xl font-black tabular-nums leading-none mt-1",
                                                isZero ? "text-red-500" : "text-amber-500"
                                            )}>
                                                {Number(stockVal).toFixed(2)} <span className="text-[9px] uppercase font-bold opacity-70">{ins.unidad || (ins.tipo === 'Producto Final' ? 'uds' : 'kg')}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm h-[500px] flex flex-col">
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-muted-foreground mb-6">Volumen de Insumos (Top 15)</h3>
                    <div className="flex-1 relative">
                        <Bar 
                            data={chartInsumoVsStock} 
                            options={{ 
                                ...commonBarOptions, 
                                indexAxis: 'y',
                                scales: {
                                    x: { grid: { color: 'rgba(150,150,150,0.1)' }, ticks: { color: '#888' } },
                                    y: { grid: { display: false }, ticks: { color: '#888' } }
                                } 
                            }} 
                        />
                    </div>
                </div>

                <div className="h-[500px]">
                    <MiniTable 
                        title="Libro de Materias Primas" 
                        rows={materiasPrima.map(m => ({ 
                            imagen: m.imagen,
                            nombre: m.nombre, 
                            stock: `${m.stockTotalCalculado.toFixed(2)} ${m.unidad || 'kg'}`,
                            valor: `S/ ${(m.stockTotalCalculado * Number(m.costo)).toFixed(2)}`
                        }))} 
                        columns={[
                            {key: 'nombre', label: 'Insumo'}, 
                            {key: 'stock', label: 'Existencia', isNum: true},
                            {key: 'valor', label: 'Valorización', isNum: true}
                        ]}
                    />
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}