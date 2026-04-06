"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCcw, Trash2, ArrowDownLeft, ArrowUpRight, Package, ListFilter, AlertTriangle, Loader2, Plus, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Regla Matemática Exacta para mantener coherencia visual
const formatExactTwoDecimals = (val: any) => {
  const num = Number(val) || 0;
  return (Math.trunc(num * 100) / 100).toFixed(2);
};

export default function InventarioKardex() {
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [insumosList, setInsumosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"ingresos" | "salidas" | "todos">("ingresos");

  // 🔥 ESTADO PARA GUARDAR QUÉ FILAS ESTÁN CONVERTIDAS A GRAMOS/ML 🔥
  const [toggledRows, setToggledRows] = useState<Record<string, boolean>>({});

  // Traer Insumos para cruzar los datos (Fotos y Unidades)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      setInsumosList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Traer Movimientos
  useEffect(() => {
    const q = query(collection(db, "movimientos"), orderBy("fecha", "desc"), limit(200));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate() || new Date()
      }));
      setMovimientos(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro del historial?")) return;
    try {
      await deleteDoc(doc(db, "movimientos", id));
      toast.success("Registro eliminado de Firebase");
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error al eliminar el registro");
    }
  };

  const movimientosFiltrados = useMemo(() => {
      return movimientos.filter(mov => {
          const cant = Number(mov.cantidad) || 0;
          const esIngreso = mov.tipo === "entrada" || mov.tipo === "creacion" || cant > 0;
          const esSalida = mov.tipo === "salida" || mov.tipo === "eliminacion" || cant < 0;

          if (activeTab === "ingresos") return esIngreso;
          if (activeTab === "salidas") return esSalida;
          return true; // "todos"
      });
  }, [movimientos, activeTab]);

  const handleBulkDelete = async () => {
      if (movimientosFiltrados.length === 0 && activeTab !== "todos") return;
      
      const isNuclear = activeTab === "todos";
      const mensaje = isNuclear 
        ? "⚠️ ¡ALERTA NUCLEAR!\n\n¿Estás seguro de querer BORRAR TODA LA BASE DE DATOS de historial para empezar de cero?\n\nEsta acción eliminará absolutamente todos los registros de Firebase de forma permanente."
        : `¿Estás seguro de eliminar los registros de ${activeTab.toUpperCase()} que ves en pantalla?`;
      
      if (!confirm(mensaje)) return;

      setIsClearing(true);
      const toastId = toast.loading("Eliminando registros en Firebase...");

      try {
          if (isNuclear) {
              const querySnapshot = await getDocs(collection(db, "movimientos"));
              if (querySnapshot.empty) {
                  toast.success("Firebase ya está vacío", { id: toastId });
                  setIsClearing(false);
                  return;
              }

              const batches = [];
              let currentBatch = writeBatch(db);
              let count = 0;

              querySnapshot.docs.forEach((document) => {
                  currentBatch.delete(document.ref);
                  count++;
                  if (count === 490) {
                      batches.push(currentBatch.commit());
                      currentBatch = writeBatch(db);
                      count = 0;
                  }
              });
              if (count > 0) batches.push(currentBatch.commit());
              
              await Promise.all(batches);
              toast.success("¡Firebase limpiado desde cero!", { id: toastId });
          } else {
              const batch = writeBatch(db);
              movimientosFiltrados.forEach(mov => {
                  const docRef = doc(db, "movimientos", mov.id);
                  batch.delete(docRef);
              });
              await batch.commit();
              toast.success(`${activeTab.toUpperCase()} eliminados de Firebase`, { id: toastId });
          }
      } catch (error) {
          console.error(error);
          toast.error("Error al limpiar la base de datos", { id: toastId });
      } finally {
          setIsClearing(false);
      }
  };

  // 🔥 FUNCIÓN PARA ALTERNAR UNIDADES (Ej: Kg <-> g) 🔥
  const toggleRowUnit = (id: string, isConvertible: boolean) => {
      if (!isConvertible) return; // Si son "unidades", no hace nada
      setToggledRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return (
      <div className="py-12 text-center flex flex-col items-center gap-3 text-slate-400">
          <RefreshCcw className="w-6 h-6 animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">Cargando historial...</span>
      </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm font-sans flex flex-col mt-6">
      
      {/* HEADER Y PESTAÑAS */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-5">
        
        <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <div className="bg-slate-200 p-1.5 rounded-lg text-slate-600">
                <ListFilter className="w-5 h-5" />
            </div>
            Kardex y Movimientos
            </h3>
            
            <button 
                onClick={handleBulkDelete}
                disabled={isClearing || (movimientosFiltrados.length === 0 && activeTab !== "todos")}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 border border-red-200"
            >
                {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {activeTab === "todos" ? "Empezar de cero" : "Limpiar Pestaña"}
            </button>
        </div>

        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-max">
            <button 
                onClick={() => setActiveTab("ingresos")} 
                className={cn("flex-1 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", activeTab === "ingresos" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <ArrowDownLeft className="w-3.5 h-3.5" /> Ingresos
            </button>
            <button 
                onClick={() => setActiveTab("salidas")} 
                className={cn("flex-1 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", activeTab === "salidas" ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                <ArrowUpRight className="w-3.5 h-3.5" /> Salidas
            </button>
            <button 
                onClick={() => setActiveTab("todos")} 
                className={cn("flex-1 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", activeTab === "todos" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
                Todos
            </button>
        </div>
      </div>
      
      {/* TABLA DE MOVIMIENTOS */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-[10px] uppercase tracking-widest text-slate-400">Fecha</th>
              <th className="px-6 py-4 text-left font-bold text-[10px] uppercase tracking-widest text-slate-400">Producto / Insumo</th>
              <th className="px-6 py-4 text-center font-bold text-[10px] uppercase tracking-widest text-slate-400">Movimiento</th>
              <th className="px-6 py-4 text-right font-bold text-[10px] uppercase tracking-widest text-slate-400">Cantidad</th>
              <th className="px-6 py-4 text-right font-bold text-[10px] uppercase tracking-widest text-slate-400 pr-8">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 relative">
            <AnimatePresence>
            {movimientosFiltrados.length === 0 ? (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={5} className="py-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest italic bg-slate-50/50">
                        No hay registros en esta pestaña
                    </td>
                </motion.tr>
            ) : (
                movimientosFiltrados.map((mov) => {
                  const cant = Number(mov.cantidad) || 0;
                  const esIngreso = mov.tipo === "entrada" || mov.tipo === "creacion" || cant > 0;
                  const esSalida = mov.tipo === "salida" || mov.tipo === "eliminacion" || cant < 0;

                  // 🔍 Cruzar datos con Insumos (Para buscar la Foto y la Unidad base)
                  const insumoData = insumosList.find(i => i.id === mov.insumoId || i.nombre === mov.insumoNombre);
                  const unidadBase = insumoData ? (insumoData.unidad || insumoData.unit || 'Kg') : 'Kg';
                  
                  // 🔥 LÓGICA DE CONVERSIÓN AL HACER CLIC 🔥
                  const isConvertible = ['kg', 'g', 'gr', 'l', 'ml'].includes(unidadBase.toLowerCase());
                  const isToggled = toggledRows[mov.id] || false;
                  
                  let displayAmount = Math.abs(cant);
                  let displayUnit = unidadBase;

                  if (unidadBase === 'Kg' || unidadBase === 'L') {
                      if (isToggled) {
                          displayAmount = displayAmount * 1000;
                          displayUnit = unidadBase === 'Kg' ? 'g' : 'ml';
                      }
                  } else if (unidadBase.toLowerCase() === 'g' || unidadBase.toLowerCase() === 'gr' || unidadBase.toLowerCase() === 'ml') {
                      if (isToggled) {
                          displayAmount = displayAmount / 1000;
                          displayUnit = unidadBase.toLowerCase().includes('g') ? 'Kg' : 'L';
                      }
                  }

                  // Formateo visual dinámico (Si es g o ml, quitamos decimales. Si es Kg o L, dejamos 2 decimales)
                  let stringCantidad = "";
                  if (displayUnit === 'Kg' || displayUnit === 'L') {
                      stringCantidad = `${formatExactTwoDecimals(displayAmount)} ${displayUnit}`;
                  } else if (displayUnit.toLowerCase() === 'g' || displayUnit.toLowerCase() === 'ml') {
                      stringCantidad = `${Math.round(displayAmount)} ${displayUnit}`;
                  } else {
                      stringCantidad = `${formatExactTwoDecimals(displayAmount)} ${displayUnit}`;
                  }

                  return (
                      <motion.tr 
                        key={mov.id} 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium text-[12px]">
                          {format(mov.fecha, "dd MMM yyyy, HH:mm", { locale: es })}
                        </td>
                        
                        <td className="px-6 py-4 font-bold text-slate-800 text-[13px] uppercase tracking-tight">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 overflow-hidden shadow-sm shrink-0">
                                  {insumoData?.imagen ? (
                                      <img src={insumoData.imagen} alt="foto" className="w-full h-full object-cover" />
                                  ) : (
                                      <ImageIcon className="w-4 h-4 opacity-50" />
                                  )}
                              </div>
                              <div className="flex flex-col">
                                {mov.insumoNombre || "Producto Desconocido"}
                                {mov.observacion && mov.observacion.includes("calculadora") && (
                                    <span className="text-[9px] text-slate-400 font-medium normal-case tracking-widest mt-0.5">Ingreso por Calculadora</span>
                                )}
                              </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                            {esIngreso ? (
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 text-[9px] font-black uppercase tracking-widest">Entrada</span>
                            ) : esSalida ? (
                                <span className="bg-red-50 text-red-500 px-2 py-1 rounded border border-red-100 text-[9px] font-black uppercase tracking-widest">Salida</span>
                            ) : (
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 text-[9px] font-black uppercase tracking-widest">Ajuste</span>
                            )}
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                            {/* 🔥 ETIQUETA CLICKEABLE PARA CONVERTIR UNIDADES 🔥 */}
                            <span 
                                onClick={() => toggleRowUnit(mov.id, isConvertible)}
                                title={isConvertible ? "Clic para cambiar unidad (Kg ↔ g)" : ""}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-black text-sm select-none transition-transform",
                                    esIngreso ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                                    esSalida ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-700 border-slate-200",
                                    isConvertible ? "cursor-pointer hover:scale-105 active:scale-95 shadow-sm" : ""
                                )}
                            >
                                {esIngreso ? <Plus className="w-3.5 h-3.5 opacity-80"/> : esSalida ? "-" : ""}
                                {stringCantidad}
                            </span>
                        </td>
                        
                        <td className="px-6 py-4 text-right pr-8">
                            <button 
                                onClick={() => handleDelete(mov.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-50 group-hover:opacity-100 focus:opacity-100"
                                title="Borrar registro"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </td>
                      </motion.tr>
                  );
                })
            )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}