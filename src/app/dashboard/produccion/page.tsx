"use client";

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UtensilsCrossed, Clock, ClipboardList,
  AlignJustify, LayoutGrid, Scale, BookOpen, Search, Trash2, Loader2,
  ChevronRight, ChefHat, Target, CheckCircle2, MessageSquare, Image as ImageIcon,
  Calendar, Filter, ArrowDownWideNarrow, X, Eye, Info
} from "lucide-react";
import { 
  collection, query, where, orderBy, onSnapshot, limit, 
  doc, runTransaction, deleteDoc, getDocs, writeBatch 
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { ProduccionModal } from "@/components/produccion/ProduccionModal";
import { FinalizarProduccionModal } from "@/components/produccion/FinalizarProduccionModal"; 
import { Badge } from "@/components/ui/badge";
import { format, isWithinInterval, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils"; // Asegúrate de tener esto importado

export default function ProduccionPage() {
  const [activeTab, setActiveTab] = useState("cocina");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const [modalOpen, setModalOpen] = useState(false); 
  const [modalFinalizarOpen, setModalFinalizarOpen] = useState(false); 
  const [selectedItem, setSelectedItem] = useState<any>(null); 
  const [ordenAFinalizar, setOrdenAFinalizar] = useState<any>(null); 
  
  const [modalDetalle, setModalDetalle] = useState<{
    isOpen: boolean;
    data: any;
  }>({ isOpen: false, data: null });

  const [recetas, setRecetas] = useState<any[]>([]); 
  const [ordenesActivas, setOrdenesActivas] = useState<any[]>([]); 
  const [historialOrdenes, setHistorialOrdenes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  const [filtroTextoHistorial, setFiltroTextoHistorial] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("todos"); 

  const formatExactTwoDecimals = (val: any) => {
    const num = Number(val) || 0;
    return (Math.trunc(num * 100) / 100).toFixed(2);
  };

  useEffect(() => {
    const qRecetas = query(collection(db, "recetas_produccion"), orderBy("nombre", "asc"));
    const unsubRecetas = onSnapshot(qRecetas, (snap) => {
      setRecetas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const qProceso = query(collection(db, "ordenes_cocina"), where("estado", "==", "en_proceso"), orderBy("createdAt", "asc"));
    const unsubProceso = onSnapshot(qProceso, (snap) => {
      setOrdenesActivas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qHistorial = query(collection(db, "produccion_tareas"), orderBy("fechaFin", "desc"), limit(200));
    const unsubHistorial = onSnapshot(qHistorial, (snap) => {
      setHistorialOrdenes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubRecetas(); unsubProceso(); unsubHistorial(); };
  }, []);

  const handleAnularOrden = async (orden: any) => {
    if (!confirm(`¿Anular producción de ${orden.recetaNombre}?`)) return;
    setDeletingId(orden.id);
    try {
      await runTransaction(db, async (transaction) => {
        const recetaRef = doc(db, "recetas_produccion", orden.recetaId);
        const recetaSnap = await transaction.get(recetaRef);
        if (!recetaSnap.exists()) throw new Error("Receta no encontrada.");
        const recetaData = recetaSnap.data();

        const insumosRefs = recetaData.ingredientes.map((ing: any) => doc(db, "insumos", ing.insumoId));
        const insumosSnaps = await Promise.all(insumosRefs.map((ref: any) => transaction.get(ref)));

        insumosSnaps.forEach((insumoSnap, index) => {
            if (insumoSnap.exists()) {
                const ing = recetaData.ingredientes[index];
                const stockActual = Number(insumoSnap.data().stock || 0);
                const cantTeorica = Number(ing.cantidadTeorica || 0) * (orden.tandasReal || 1);
                const unidad = (ing.unidad || ing.unidadUI || '').toLowerCase().trim();
                const devolverKg = ['g', 'gr', 'ml'].includes(unidad) ? cantTeorica / 1000 : cantTeorica;
                transaction.update(insumoSnap.ref, { stock: stockActual + devolverKg });
            }
        });
        transaction.delete(doc(db, "ordenes_cocina", orden.id));
      });
      toast.success("Producción anulada");
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBorrarHistorial = async (id: string) => {
      if(!confirm("¿Estás seguro de eliminar este registro?")) return;
      try {
          await deleteDoc(doc(db, "produccion_tareas", id));
          toast.success("Registro eliminado");
      } catch (error) {
          toast.error("Error al eliminar");
      }
  };

  const handleVaciarHistorial = async () => {
    const confirm1 = confirm("⚠️ ¡ATENCIÓN! Vas a borrar TODO el historial de producción permanentemente.");
    if (!confirm1) return;
    const confirm2 = confirm("¿Estás absolutamente seguro? Esta acción no se puede deshacer.");
    if (!confirm2) return;

    setIsClearingAll(true);
    try {
        const querySnapshot = await getDocs(collection(db, "produccion_tareas"));
        const batch = writeBatch(db);
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        toast.success("Historial vaciado correctamente");
    } catch (error) {
        toast.error("Error al vaciar el historial");
    } finally {
        setIsClearingAll(false);
    }
  };

  const [busqueda, setBusqueda] = useState("");
  const recetasFiltradas = recetas.filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const historialFiltrado = historialOrdenes.filter(orden => {
    const coincideTexto = orden.recetaNombre.toLowerCase().includes(filtroTextoHistorial.toLowerCase());
    if (!coincideTexto) return false;
    
    if (filtroFecha === "todos") return true;
    const fechaDoc = orden.fechaFin?.toDate() || orden.createdAt?.toDate();
    if (!fechaDoc) return false;
    const ahora = new Date();
    if (filtroFecha === "hoy") return isWithinInterval(fechaDoc, { start: startOfDay(ahora), end: endOfDay(ahora) });
    if (filtroFecha === "semana") return isWithinInterval(fechaDoc, { start: subDays(ahora, 7), end: ahora });
    if (filtroFecha === "mes") return isWithinInterval(fechaDoc, { start: subDays(ahora, 30), end: ahora });
    return true;
  });

  const handlePrepararReceta = (receta: any) => {
      setSelectedItem({ recetaId: receta.id, recetaNombre: receta.nombre, imagen: receta.imagen, cantidad: receta.batchBaseKg, tipo: receta.tipo, estado: 'pendiente' }); 
      setModalOpen(true);      
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 font-sans transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <ChefHat className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Centro de Producción</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Producción</h1>
          <p className="text-lg text-muted-foreground mt-1 max-w-2xl font-medium">Control de órdenes activas y transformación de materia prima.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <TabsList className="bg-muted/40 p-1 rounded-xl h-auto flex flex-wrap gap-1 border-none">
                <TabsTrigger value="cocina" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-6 py-2.5 gap-2 text-sm font-medium transition-all tracking-tight">
                    <UtensilsCrossed className="w-4 h-4" /> Cocina & Recetas
                    {ordenesActivas.length > 0 && <Badge className="ml-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">{ordenesActivas.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="historial" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-6 py-2.5 gap-2 text-sm font-medium transition-all tracking-tight">
                    <ClipboardList className="w-4 h-4" /> Historial
                </TabsTrigger>
            </TabsList>

            {/* 🔥 CORRECCIÓN: Botones de vista Grid/List 🔥 */}
            <div className="flex bg-muted/40 p-1 rounded-xl border border-transparent shadow-sm gap-1">
                <button 
                  onClick={() => setViewMode("grid")} 
                  className={cn(
                    "p-2 rounded-lg transition-all", 
                    viewMode === "grid" ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode("list")} 
                  className={cn(
                    "p-2 rounded-lg transition-all", 
                    viewMode === "list" ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
            </div>
        </div>

        <TabsContent value="cocina" className="space-y-12 animate-in fade-in duration-500 outline-none">
          {ordenesActivas.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-pulse" />
                <h3 className="text-xl font-bold text-foreground tracking-tight">Órdenes en Cocción</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {ordenesActivas.map((orden) => (
                  <div key={orden.id} className="group bg-card border border-border shadow-sm rounded-[2rem] overflow-hidden flex flex-col relative transition-all hover:shadow-xl hover:border-blue-500/30">
                    <button onClick={() => handleAnularOrden(orden)} className="absolute top-4 right-4 h-8 w-8 bg-background/90 hover:bg-destructive/10 text-destructive/70 hover:text-destructive rounded-full flex items-center justify-center border border-border opacity-0 group-hover:opacity-100 transition-all z-10">
                      {deletingId === orden.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                    </button>
                    <div className="p-6 pb-2">
                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0 mb-4 tracking-widest">En Proceso</Badge>
                        <div className="flex items-center gap-3">
                           {orden.imagen && <img src={orden.imagen} className="w-10 h-10 rounded-full object-cover border border-border shadow-sm" alt="" />}
                           <h3 className="text-lg font-bold text-foreground leading-tight truncate">{orden.recetaNombre}</h3>
                        </div>
                        <div className="flex items-baseline gap-1 mt-3">
                            <span className="text-4xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{orden.cantidad}</span>
                            <span className="text-sm font-medium text-muted-foreground uppercase">kg</span>
                        </div>
                    </div>
                    <div className="p-6 pt-0 mt-auto">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-4 tracking-widest border-t border-border pt-4">Inicio: {orden.createdAt ? format(orden.createdAt.toDate(), "p", { locale: es }) : '...'}</div>
                        <button onClick={() => { setOrdenAFinalizar(orden); setModalFinalizarOpen(true); }} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 text-xs tracking-wider">
                            <Scale className="w-5 h-5" /> Finalizar & Pesar
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* BUSCADOR RECETARIO */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/20 p-6 rounded-[2.5rem] border border-border">
              <div className="flex items-center gap-4">
                {/* 🔥 CORRECCIÓN: Icono del recetario adaptado 🔥 */}
                <div className="p-3 bg-blue-500/10 dark:bg-blue-400/10 rounded-2xl shadow-sm border border-blue-500/20">
                    <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">Recetario Maestro</h3>
                    <p className="text-sm text-muted-foreground font-medium">Selecciona un sabor para iniciar lote.</p>
                </div>
              </div>
              <div className="relative w-full md:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors"/>
                <input placeholder="Buscar receta..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 text-sm transition-all" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                {recetasFiltradas.map((receta) => (
                  <div key={receta.id} className="group bg-card rounded-[2rem] border border-border shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all overflow-hidden flex flex-col h-full">
                    <div className="h-48 relative overflow-hidden bg-muted">
                        <img src={receta.imagen || "/placeholder-ice.jpg"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={receta.nombre} />
                        <div className="absolute top-4 left-4">
                            <Badge className="bg-background/90 backdrop-blur-md text-foreground border border-border font-bold uppercase text-[9px] tracking-widest">{receta.tipo}</Badge>
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                        <h3 className="text-lg font-bold text-foreground leading-tight mb-2 truncate">{receta.nombre}</h3>
                        {/* 🔥 CORRECCIÓN: "Batch Base" adaptable 🔥 */}
                        <p className="text-xs text-muted-foreground font-medium mb-6 uppercase tracking-wider">
                            Batch Base: <span className="text-blue-600 dark:text-blue-400 font-bold">{receta.batchBaseKg} kg</span>
                        </p>
                        <button onClick={() => handlePrepararReceta(receta)} className="mt-auto w-full py-3 bg-muted hover:bg-blue-600 hover:text-white text-foreground border border-border hover:border-blue-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95 text-xs tracking-wider">
                            Cocinar <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recetasFiltradas.map((receta) => (
                  <div key={receta.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group flex flex-row items-center p-3 pr-6 gap-6 hover:border-blue-500/30">
                    <div className="w-16 h-16 rounded-xl relative bg-muted overflow-hidden shrink-0 shadow-inner">
                        <img src={receta.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-all" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-foreground truncate">{receta.nombre}</h3>
                        <Badge className="bg-muted text-muted-foreground border-border border text-[9px] font-bold uppercase mt-1 tracking-widest">{receta.tipo}</Badge>
                    </div>
                    <div className="text-right mr-4 hidden sm:block">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Base Batch</p>
                        {/* 🔥 CORRECCIÓN: "Batch Base" adaptable 🔥 */}
                        <p className="font-bold text-base text-blue-600 dark:text-blue-400">{receta.batchBaseKg} kg</p>
                    </div>
                    <button onClick={() => handlePrepararReceta(receta)} className="h-10 px-5 bg-muted hover:bg-blue-600 hover:text-white text-foreground border border-border hover:border-blue-600 rounded-xl font-bold shadow-sm active:scale-95 transition-all text-xs flex items-center gap-2 tracking-wider">
                        Cocinar <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="historial" className="animate-in fade-in duration-500 outline-none space-y-6 mt-6">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    <div className="relative min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"/>
                        <input 
                            placeholder="Buscar por receta..." 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-blue-500/30 outline-none transition-all text-foreground"
                            value={filtroTextoHistorial}
                            onChange={(e) => setFiltroTextoHistorial(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-background border border-border p-1 rounded-xl px-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <select 
                        className="bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-foreground focus:ring-0 cursor-pointer py-2 outline-none appearance-none"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                      >
                        <option value="todos">Todas las Fechas</option>
                        <option value="hoy">Hoy</option>
                        <option value="semana">Últimos 7 días</option>
                        <option value="mes">Últimos 30 días</option>
                      </select>
                    </div>
                </div>

                <button 
                    onClick={handleVaciarHistorial}
                    disabled={isClearingAll || historialOrdenes.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground rounded-xl font-bold text-xs transition-all border border-destructive/20 disabled:opacity-50 group tracking-widest"
                >
                    {isClearingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 group-hover:animate-bounce" />}
                    Vaciar Historial
                </button>
            </div>

            <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center">
                    <h3 className="font-bold text-foreground flex items-center gap-2 tracking-tight">
                        <div className="bg-background border border-border p-1.5 rounded-lg text-muted-foreground"><ClipboardList className="w-5 h-5" /></div>
                        Registro de Tareas Finalizadas
                    </h3>
                    <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {historialFiltrado.length} lotes
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 border-b border-border">
                            <tr className="divide-x divide-border/50">
                                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Referencia</th>
                                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Fecha Cierre</th>
                                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Receta Producida</th>
                                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Meta (Kg)</th>
                                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-center">Peso Real (Kg)</th>
                                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-right pr-10">Opciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {historialFiltrado.map(orden => {
                                const fechaObj = orden.fechaFin?.toDate() || orden.createdAt?.toDate();
                                return (
                                    <tr key={orden.id} className="hover:bg-muted/30 transition-colors group divide-x divide-border/50">
                                        <td className="px-6 py-4">
                                            <div className="w-10 h-10 rounded-xl bg-background border border-border overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                                                {orden.imagen ? <img src={orden.imagen} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-medium text-xs">
                                            {fechaObj ? format(fechaObj, "dd MMM yyyy, HH:mm", {locale: es}) : "---"}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-foreground text-sm truncate max-w-[200px]" title={orden.recetaNombre}>
                                            {orden.recetaNombre}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono font-medium text-xs text-muted-foreground">{formatExactTwoDecimals(orden.pesoTeorico)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 font-mono font-bold text-xs px-3 py-1">
                                                {formatExactTwoDecimals(orden.pesoReal || orden.cantidad)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right pr-6">
                                            <div className="flex justify-end items-center gap-2">
                                                <button 
                                                  onClick={() => setModalDetalle({ isOpen: true, data: orden })}
                                                  className="p-2 bg-background border border-border text-foreground rounded-lg shadow-sm hover:bg-muted active:scale-95 transition-all"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleBorrarHistorial(orden.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {historialFiltrado.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium text-sm">
                                        No se encontraron registros en el historial.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </TabsContent>
      </Tabs>

      {/* MODAL DE DETALLE (MANTENIENDO DISEÑO DE INVENTARIO) */}
      <AnimatePresence>
        {modalDetalle.isOpen && modalDetalle.data && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-foreground"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModalDetalle({ isOpen: false, data: null })}
          >
            <motion.div
              className="bg-background rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-border"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card p-8 relative overflow-hidden border-b border-border">
                  <div className="absolute -right-10 -top-10 opacity-5"><ChefHat className="w-40 h-40 text-foreground" /></div>
                  <div className="flex justify-between items-start relative z-10">
                      <div>
                          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] font-bold uppercase mb-3 tracking-widest">Finalizado</Badge>
                          <h3 className="text-2xl font-bold tracking-tight leading-none text-foreground">{modalDetalle.data.recetaNombre}</h3>
                          <p className="text-muted-foreground text-[10px] mt-3 font-mono uppercase tracking-widest">ID LOTE: {modalDetalle.data.id.slice(0,12)}</p>
                      </div>
                      <button onClick={() => setModalDetalle({ isOpen: false, data: null })} className="bg-muted hover:bg-accent text-muted-foreground p-2 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
              </div>

              <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-5 rounded-2xl border border-border text-center shadow-sm">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Cálculo Teórico</p>
                          <p className="text-xl font-black text-foreground font-mono">{formatExactTwoDecimals(modalDetalle.data.pesoTeorico)}<span className="text-xs ml-1 font-medium">kg</span></p>
                      </div>
                      <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 text-center shadow-sm">
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Peso en Báscula</p>
                          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">{formatExactTwoDecimals(modalDetalle.data.pesoReal)}<span className="text-xs ml-1 font-medium">kg</span></p>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" /> Observaciones
                      </h4>
                      <div className="bg-muted/30 p-6 rounded-[1.5rem] border border-border min-h-[100px] shadow-inner">
                          <p className="text-sm text-foreground/80 font-medium italic leading-relaxed">
                              {modalDetalle.data.observaciones || "Sin notas adicionales para este lote."}
                          </p>
                      </div>
                  </div>
              </div>

              <div className="p-6 bg-muted/20 border-t border-border">
                  {/* 🔥 BOTÓN DEL MODAL: Color seguro (azul) 🔥 */}
                  <button onClick={() => setModalDetalle({ isOpen: false, data: null })} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all">
                      Cerrar Detalles
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProduccionModal open={modalOpen} onClose={() => setModalOpen(false)} ordenData={selectedItem} />
      <FinalizarProduccionModal open={modalFinalizarOpen} onClose={() => setModalFinalizarOpen(false)} task={ordenAFinalizar} onSuccess={() => { setModalFinalizarOpen(false); setOrdenAFinalizar(null); }} />
    </div>
  );
}