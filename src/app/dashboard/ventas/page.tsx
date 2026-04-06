"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Line } from "react-chartjs-2";
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
  Filler
} from "chart.js";
import { format, startOfDay, subDays, isAfter, endOfDay, parse } from "date-fns";
import { es } from "date-fns/locale";
import { useInsumosDashboard } from "@/hooks/useInsumosDashboard";
import { 
  FileText, 
  Table as TableIcon, 
  Loader2, 
  TrendingUp, 
  BarChart3, 
  Package2, 
  Wallet,
  Calendar,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import toast from "react-hot-toast";

// Librerías de exportación
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";

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

const METODOS_PAGO_UI = [
  { key: "yape", nombre: "Yape", logo: "/brand/payments/yape.png" },
  { key: "plin", nombre: "Plin", logo: "/brand/payments/plin.png" },
  { key: "tarjeta", nombre: "Tarjeta", logo: "/brand/payments/tarjeta.png" },
];

export default function DashboardCosmos() {
  const [tab, setTab] = useState<"ventas" | "insumos">("ventas");
  const [ventas, setVentas] = useState<any[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  
  // 🔥 Rango de Fechas (0: Hoy, 1: 7 Días, 2: Mes, 3: Año, 4: Personalizado)
  const [rango, setRango] = useState(1); 
  const [fechaIni, setFechaIni] = useState(() => format(startOfDay(new Date()), "yyyy-MM-dd"));
  const [fechaFin, setFechaFin] = useState(() => format(new Date(), "yyyy-MM-dd"));
  
  // 🔥 Estado para el ordenamiento de la tabla de inventario
  const [orden, setOrden] = useState<{ campo: "nombre" | "stock" | "costo" | "total", direccion: "asc" | "desc" }>({
      campo: "nombre",
      direccion: "asc"
  });

  const insumosDash = useInsumosDashboard({
    lowStockThreshold: 5,
    collectionName: "insumos",
  });

  useEffect(() => {
    const q = query(collection(db, "pedidos"), where("estado", "==", "Enviado"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVentas(data);
      setLoadingVentas(false);
    });
    return () => unsub();
  }, []);

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
      yape: { count: 0, total: 0 },
      plin: { count: 0, total: 0 },
      tarjeta: { count: 0, total: 0 }
    };
    ventasFiltradas.forEach(v => {
      const m = (v.metodoPago || "").toLowerCase();
      if (map[m]) {
        map[m].count++;
        map[m].total += (v.total || 0);
      }
    });
    return map;
  }, [ventasFiltradas]);

  // 🔥 LÓGICA DE ORDENAMIENTO PARA INVENTARIO 🔥
  const handleSort = (campo: "nombre" | "stock" | "costo" | "total") => {
      if (orden.campo === campo) {
          setOrden({ campo, direccion: orden.direccion === "asc" ? "desc" : "asc" });
      } else {
          setOrden({ campo, direccion: campo === "nombre" ? "asc" : "desc" });
      }
  };

  const inventarioOrdenado = useMemo(() => {
      const arrayCopia = [...insumosDash.insumos];
      return arrayCopia.sort((a, b) => {
          let valorA, valorB;
          if (orden.campo === "nombre") {
              valorA = (a.nombre || "").toLowerCase();
              valorB = (b.nombre || "").toLowerCase();
              return orden.direccion === "asc" ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
          } else if (orden.campo === "stock") {
              valorA = Number(a.stock) || 0;
              valorB = Number(b.stock) || 0;
          } else if (orden.campo === "costo") {
              valorA = Number(a.costo) || 0;
              valorB = Number(b.costo) || 0;
          } else if (orden.campo === "total") {
              valorA = (Number(a.stock) || 0) * (Number(a.costo) || 0);
              valorB = (Number(b.stock) || 0) * (Number(b.costo) || 0);
          }
          // @ts-ignore
          return orden.direccion === "asc" ? valorA - valorB : valorB - valorA;
      });
  }, [insumosDash.insumos, orden]);


  // 🔥 GRÁFICO INTELIGENTE (COMO EN DASHBOARD GENERAL) 🔥
  const chartData = useMemo(() => {
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


  // 🔥 FUNCIONES DE EXPORTACIÓN REAL 🔥
  const getRangoTextoParaExportar = () => {
      if (rango === 0) return "Hoy";
      if (rango === 1) return "Ultimos_7dias";
      if (rango === 2) return "Mes_Actual";
      if (rango === 3) return "Este_Ano";
      return `${fechaIni}_al_${fechaFin}`;
  };

  const handleExportExcel = () => {
    try {
      const toastId = toast.loading(`Generando Excel de ${tab === "ventas" ? "Ventas" : "Inventario"}...`);
      const workbook = XLSX.utils.book_new();

      if (tab === "ventas") {
          const ventasAExportar = ventasFiltradas.map(v => ({
              "Fecha": v.fecha ? new Date(v.fecha.seconds * 1000).toLocaleString() : "N/A",
              "Cliente": v.cliente?.nombre || "Desconocido",
              "Total Pagado": `S/ ${Number(v.total || 0).toFixed(2)}`,
              "Método de Pago": v.metodoPago || "No especificado",
              "Items": v.productos?.map((p:any) => `${p.cantidad}x ${p.nombre}`).join(", ") || ""
          }));
          if(ventasAExportar.length > 0){
              const wsVentas = XLSX.utils.json_to_sheet(ventasAExportar);
              wsVentas["!cols"] = [{wch: 20}, {wch: 30}, {wch: 15}, {wch: 20}, {wch: 50}];
              XLSX.utils.book_append_sheet(workbook, wsVentas, "Ventas_Realizadas");
          } else {
              toast.error("No hay ventas para exportar en este rango", { id: toastId });
              return;
          }
      } else {
          // 🔥 ARREGLO 1: Le pusimos (ins: any) para que no chille por la propiedad 'tipo'
          const inventarioAExportar = inventarioOrdenado.map((ins: any) => ({
              "Descripción Insumo": ins.nombre,
              "Categoría": ins.tipo || "Sin tipo",
              "Nivel Stock": `${Number(ins.stock || 0).toFixed(2)} ${ins.unidad}`,
              "Costo Unitario": `S/ ${Number(ins.costo || 0).toFixed(2)}`,
              "Total Libro": `S/ ${((ins.stock || 0) * (ins.costo || 0)).toFixed(2)}`
          }));
          if(inventarioAExportar.length > 0){
              const wsInv = XLSX.utils.json_to_sheet(inventarioAExportar);
              wsInv["!cols"] = [{wch: 30}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 20}];
              XLSX.utils.book_append_sheet(workbook, wsInv, "Balance_Inventario");
          } else {
              toast.error("No hay inventario para exportar", { id: toastId });
              return;
          }
      }

      XLSX.writeFile(workbook, `Reporte_Cosmos_${tab}_${getRangoTextoParaExportar()}.xlsx`);
      toast.success("Excel exportado correctamente", { id: toastId });
    } catch (error) {
      toast.error("Error al exportar Excel");
    }
  };

  const handleExportPDF = () => {
    try {
      const toastId = toast.loading(`Generando PDF de ${tab === "ventas" ? "Ventas" : "Inventario"}...`);
      const doc = new jsPDF();
      
      // 🔥 ARREGLO 2: Le pusimos el contrato [number, number, number] a los colores
      const slate900: [number, number, number] = [17, 24, 39]; 
      const slate500: [number, number, number] = [100, 116, 139]; 
      const emerald600: [number, number, number] = [5, 150, 105]; 

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text("COSMOS - Reporte Comercial", 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(slate500[0], slate500[1], slate500[2]);
      
      const rangoVisual = rango === 0 ? "Hoy" : rango === 1 ? "Últimos 7 días" : rango === 2 ? "Mes Actual" : rango === 3 ? "Este Año" : `${fechaIni} al ${fechaFin}`;
      
      doc.text(tab === "ventas" ? `Período: ${rangoVisual}` : "Balance Actual de Inventario", 14, 26);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 31);
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 35, 196, 35);

      let startY = 45;

      if (tab === "ventas") {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(slate900[0], slate900[1], slate900[2]);
          doc.text("Resumen de Desempeño", 14, startY);
          startY += 6;

          autoTable(doc, {
            startY: startY,
            head: [['Balance Económico', 'Pedidos Totales', 'Ticket Promedio']],
            body: [[
              `S/ ${stats.total.toFixed(2)}`,
              stats.pedidos.toString(),
              `S/ ${stats.ticketPromedio.toFixed(2)}`
            ]],
            theme: 'grid',
            headStyles: { fillColor: slate900, textColor: 255, halign: 'center' },
            bodyStyles: { halign: 'center', fontStyle: 'bold', textColor: emerald600, fontSize: 12 },
          });
      } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(slate900[0], slate900[1], slate900[2]);
          doc.text("Balance Valorizado por Insumo", 14, startY);
          startY += 6;

          autoTable(doc, {
            startY: startY,
            head: [['Descripción', 'Nivel Stock', 'Costo Unit.', 'Total Libro']],
            body: inventarioOrdenado.map((ins: any) => [
                ins.nombre,
                `${Number(ins.stock || 0).toFixed(2)} ${ins.unidad}`,
                `S/ ${Number(ins.costo || 0).toFixed(2)}`,
                `S/ ${((ins.stock || 0) * (ins.costo || 0)).toFixed(2)}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: slate500, textColor: 255 },
          });
      }

      doc.save(`Reporte_Cosmos_${tab}_${getRangoTextoParaExportar()}.pdf`);
      toast.success("PDF guardado en descargas", { id: toastId });

    } catch (error) {
        toast.error("Ocurrió un error al crear el PDF");
    }
  };


  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 font-sans text-foreground transition-colors duration-300">
      
      {/* HEADER DINÁMICO */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border/40 pb-6">
        <div>
          {/* 🔥 CORRECCIÓN DEL TÍTULO ADAPTABLE 🔥 */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Dashboard de Control</span>
          </div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Métricas del Negocio</h1>
          <p className="text-lg text-muted-foreground mt-1 max-w-2xl">
            Resumen comercial y balance de inventario sincronizado.
          </p>
        </div>
        
        <div className="flex gap-3 items-center">
            {/* 🔥 TABS SUPERIORES ADAPTADOS 🔥 */}
            <div className="flex bg-muted/40 p-1 rounded-xl border border-transparent shadow-sm">
                <button onClick={() => setTab("ventas")} className={`px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tab === 'ventas' ? 'bg-background text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}>Ventas</button>
                <button onClick={() => setTab("insumos")} className={`px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${tab === 'insumos' ? 'bg-background text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}>Inventario</button>
            </div>
            
            <div className="flex gap-2">
                <button onClick={handleExportExcel} className="h-11 w-11 flex items-center justify-center bg-background border border-border rounded-xl hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all shadow-sm">
                    <TableIcon className="w-4 h-4 text-emerald-500" />
                </button>
                <button onClick={handleExportPDF} className="h-11 w-11 flex items-center justify-center bg-background border border-border rounded-xl hover:bg-rose-500/10 hover:border-rose-500/30 transition-all shadow-sm">
                    <FileText className="w-4 h-4 text-rose-500" />
                </button>
            </div>
        </div>
      </div>

      {tab === "ventas" ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
            {["Hoy", "Últimos 7 días", "Mes Actual", "Este Año", "Personalizado"].map((l, i) => (
              <button 
                key={l}
                onClick={() => setRango(i)}
                className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap",
                    rango === i ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-background border-border text-muted-foreground hover:border-primary/30"
                )}
              >{l}</button>
            ))}

            {rango === 4 && (
                <div className="flex items-center gap-2 bg-background p-1 rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-left-4">
                    <input 
                        type="date" 
                        value={fechaIni} 
                        onChange={e => setFechaIni(e.target.value)} 
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-transparent text-foreground outline-none transition-colors bg-transparent cursor-pointer uppercase tracking-widest [color-scheme:dark]" 
                    />
                    <span className="text-muted-foreground font-black text-xs px-1">➔</span>
                    <input 
                        type="date" 
                        value={fechaFin} 
                        onChange={e => setFechaFin(e.target.value)} 
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-transparent text-foreground outline-none transition-colors bg-transparent cursor-pointer uppercase tracking-widest [color-scheme:dark]" 
                    />
                </div>
            )}
          </div>

          {/* CUADRÍCULA DE 3 COLUMNAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="Balance Económico" value={`S/ ${stats.total.toFixed(2)}`} icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} colorClass="text-emerald-500" />
            <StatCard label="Pedidos Totales" value={stats.pedidos} icon={<Calendar className="w-4 h-4 text-blue-500" />} />
            <StatCard label="Ticket Promedio" value={`S/ ${stats.ticketPromedio.toFixed(2)}`} icon={<BarChart3 className="w-4 h-4 text-amber-500" />} colorClass="text-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card p-8 rounded-[2rem] border border-border shadow-sm">
                <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Flujo de Ingresos</h3>
                  {/* 🔥 ETIQUETA 'LIVE' ADAPTADA 🔥 */}
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">En tiempo real</span>
                </div>
                <div className="h-[350px]">
                    <Line 
                        data={chartData} 
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
                                    ticks: { color: '#888', font: { size: 10, weight: 'bold' }, callback: (value) => `S/ ${Number(value).toFixed(2)}` },
                                    title: { display: true, text: 'Ingresos Brutos (Soles)', font: { size: 10, weight: 'bold' }, color: '#888' }
                                }, 
                                x: { 
                                    grid: { display: false }, 
                                    ticks: { color: '#888', font: { size: 10, weight: 'bold' } },
                                    title: { display: true, text: rango === 0 ? 'Horas del Día' : rango === 3 ? 'Meses del Año' : 'Fechas Analizadas', font: { size: 10, weight: 'bold' }, color: '#888' }
                                } 
                            } 
                        }} 
                    />
                </div>
            </div>

            <div className="bg-card p-8 rounded-[2rem] border border-border shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-8 border-b border-border pb-4">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cierre por Billetera</h3>
              </div>
              <div className="space-y-4 flex-1">
                {METODOS_PAGO_UI.map(m => (
                  <div key={m.key} className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border group hover:bg-muted transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-background p-2 rounded-xl border border-border shadow-sm">
                        <img src={m.logo} className="w-full h-full object-contain transition-all" alt="" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm uppercase tracking-tight">{m.nombre}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{pagosStats[m.key].count} Pedidos</p>
                      </div>
                    </div>
                    <p className="font-extrabold text-foreground text-lg tabular-nums">S/ {pagosStats[m.key].total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 🔥 ICONOS COLOREADOS PARA INVENTARIO 🔥 */}
              <StatCard label="Valorización Total" value={`S/ ${insumosDash.insumoStats.totalValor.toFixed(2)}`} icon={<Package2 className="w-4 h-4 text-blue-500"/>} colorClass="text-emerald-500" />
              <StatCard label="Alertas Stock Bajo" value={insumosDash.insumoStats.stockBajo} icon={<AlertCircle className="w-4 h-4 text-amber-500"/>} colorClass="text-amber-500" />
              <StatCard label="Sin Stock" value={insumosDash.insumoStats.sinStock} icon={<XCircle className="w-4 h-4 text-red-500"/>} colorClass="text-red-500" />
           </div>

           <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
                <div className="p-8 border-b border-border bg-muted/10">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Balance General Valorizado</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase text-muted-foreground bg-muted/30 select-none">
                        <th onClick={() => handleSort("nombre")} className="px-8 py-5 cursor-pointer hover:text-foreground transition-colors">
                            <div className="flex items-center gap-1.5">
                                Descripción Insumo
                                {orden.campo === "nombre" && (orden.direccion === "desc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                            </div>
                        </th>
                        <th onClick={() => handleSort("stock")} className="px-8 py-5 text-center cursor-pointer hover:text-foreground transition-colors">
                            <div className="flex items-center justify-center gap-1.5">
                                Nivel Stock
                                {orden.campo === "stock" && (orden.direccion === "desc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                            </div>
                        </th>
                        <th onClick={() => handleSort("costo")} className="px-8 py-5 text-center cursor-pointer hover:text-foreground transition-colors">
                            <div className="flex items-center justify-center gap-1.5">
                                Costo Unit.
                                {orden.campo === "costo" && (orden.direccion === "desc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                            </div>
                        </th>
                        <th onClick={() => handleSort("total")} className="px-8 py-5 text-right cursor-pointer hover:text-foreground transition-colors">
                            <div className="flex items-center justify-end gap-1.5">
                                Total Libro
                                {orden.campo === "total" && (orden.direccion === "desc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                            </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {inventarioOrdenado.map((ins: any) => {
                        const totalItem = (ins.stock || 0) * (ins.costo || 0);
                        return (
                          <tr key={ins.id} className="hover:bg-muted/20 transition-colors group">
                            <td className="px-8 py-5 font-bold text-foreground text-sm uppercase">{ins.nombre}</td>
                            <td className="px-8 py-5 text-center">
                              <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-lg">
                                {Number(ins.stock || 0).toFixed(2)} {ins.unidad}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center text-muted-foreground text-xs font-bold">
                              S/ {Number(ins.costo || 0).toFixed(2)}
                            </td>
                            <td className="px-8 py-5 text-right font-extrabold text-emerald-500 text-base tabular-nums">
                              S/ {totalItem.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
           </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, colorClass = "text-foreground" }: { label: string, value: any, icon: any, colorClass?: string }) {
  return (
    <div className="bg-card p-8 rounded-[2rem] border border-border shadow-sm flex flex-col relative group hover:shadow-lg transition-all duration-300 hover:border-primary/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="p-2 bg-muted/40 rounded-lg group-hover:bg-background transition-colors border border-transparent group-hover:border-border">{icon}</div>
      </div>
      <p className={cn("text-3xl font-extrabold tracking-tight tabular-nums", colorClass)}>
        {typeof value === 'number' ? value.toFixed(2) : value}
      </p>
    </div>
  );
}