"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom"; // 🔥 IMPORTAMOS PORTAL 🔥
import { 
  X, Loader2, Package, PlayCircle, 
  ArrowLeft, Info, Search, Scale 
} from "lucide-react";
import { collection, getDocs, doc, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";

type Props = {
  open: boolean;
  onClose: () => void;
  ordenData?: any | null; 
};

export function ProduccionModal({ open, onClose, ordenData }: Props) {
  // 🔥 ESTADO DE MONTAJE PARA EVITAR ERRORES DE SSR EN NEXT.JS CON PORTALS 🔥
  const [mounted, setMounted] = useState(false);

  const [recetas, setRecetas] = useState<any[]>([]);
  const [loadingRecetas, setLoadingRecetas] = useState(true);
  
  const [selectedRecetaId, setSelectedRecetaId] = useState("");
  const [tandas, setTandas] = useState(1);
  const [processing, setProcessing] = useState(false);
  
  const [mode, setMode] = useState<"selection" | "details">("selection");
  const [busqueda, setBusqueda] = useState("");

  // 🔥 Efecto para activar el Portal una vez cargada la vista en el cliente 🔥
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const fetchRecetas = async () => {
      setLoadingRecetas(true);
      try {
        const snap = await getDocs(collection(db, "recetas_produccion"));
        const listaRecetas = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]; 
        setRecetas(listaRecetas);

        if (ordenData) {
            const recetaEncontrada = listaRecetas.find((r) => r.id === ordenData.recetaId || r.nombre === ordenData.recetaNombre);
            if (recetaEncontrada) {
                setSelectedRecetaId(recetaEncontrada.id);
                setMode("details");
                const batch = Number(recetaEncontrada.batchBaseKg) || 1;
                const cantSolicitada = Number(ordenData.cantidad);
                if (cantSolicitada) {
                    const tandasCalc = Math.ceil((cantSolicitada / batch) * 10) / 10;
                    setTandas(tandasCalc);
                } else {
                    setTandas(1);
                }
            }
        } else {
            setSelectedRecetaId("");
            setTandas(1);
            setMode("selection");
        }
      } catch (error) {
        console.error(error);
        toast.error("Error al cargar recetas");
      } finally {
        setLoadingRecetas(false);
      }
    };

    fetchRecetas();
  }, [open, ordenData]);

  useEffect(() => {
    if (!open) {
        setMode("selection");
        setSelectedRecetaId("");
        setTandas(1);
    }
  }, [open]);

  const recetaActiva = useMemo(() => 
    recetas.find(r => r.id === selectedRecetaId), 
  [selectedRecetaId, recetas]);

  const recetasFiltradas = useMemo(() => {
    return recetas.filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  }, [recetas, busqueda]);

  const ajustarTandas = (delta: number) => {
    setTandas(prev => {
        const nuevo = prev + delta;
        return Math.max(0.1, Math.round(nuevo * 10) / 10);
    });
  };

  const totalProducidoKg = recetaActiva ? (Number(recetaActiva.batchBaseKg) * tandas).toFixed(2) : "0.00";

  const ingredientesCalculados = useMemo(() => {
    if (!recetaActiva) return [];
    
    return recetaActiva.ingredientes.map((ing: any) => {
        const cantidadNecesaria = Number(ing.cantidadTeorica) * tandas;
        const rawUnit = (ing.unidad || ing.unidadUI || '').toLowerCase().trim().replace('.', '');
        
        let textoMostrar = "";
        let valParaMostrar = cantidadNecesaria;
        
        if (['g', 'gr', 'ml'].includes(rawUnit) && cantidadNecesaria >= 1000) {
            valParaMostrar = cantidadNecesaria / 1000;
            textoMostrar = `${valParaMostrar.toFixed(3)} ${rawUnit === 'ml' ? 'L' : 'kg'}`;
        } 
        else if (['kg', 'l'].includes(rawUnit) && cantidadNecesaria < 1) {
            valParaMostrar = cantidadNecesaria * 1000;
            textoMostrar = `${valParaMostrar.toFixed(1)} ${rawUnit === 'l' ? 'ml' : 'g'}`;
        }
        else {
            textoMostrar = `${Number(cantidadNecesaria.toFixed(3))} ${ing.unidad || ing.unidadUI || ''}`;
        }

        return {
            ...ing,
            cantidadFinal: cantidadNecesaria,
            textoMostrar: textoMostrar
        };
    });
  }, [recetaActiva, tandas]);

  const getFotoUrl = (r: any) => {
    if (r.imagen) return r.imagen;
    return "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=400&q=80"; 
  };

  const handleIniciarProduccion = async () => {
    if (!recetaActiva) return;
    setProcessing(true);

    try {
      await runTransaction(db, async (transaction) => {
        const insumoRefs = ingredientesCalculados.map((ing: any) => doc(db, "insumos", ing.insumoId));
        const insumoDocs = await Promise.all(insumoRefs.map((ref: any) => transaction.get(ref)));

        for (let i = 0; i < insumoDocs.length; i++) {
            const docSnap = insumoDocs[i];
            const ingCalc = ingredientesCalculados[i];
            
            if (!docSnap.exists()) throw new Error(`Insumo "${ingCalc.insumoNombre}" no encontrado.`);

            const stockActual = Number(docSnap.data().stock || 0);
            
            // --- CORRECCIÓN DE UNIDADES ---
            const unidadNormalizada = (ingCalc.unidad || ingCalc.unidadUI || '').toLowerCase().trim().replace('.', '');
            const consumoRealKg = ['g', 'gr', 'ml'].includes(unidadNormalizada) 
                ? ingCalc.cantidadFinal / 1000 
                : ingCalc.cantidadFinal;

            if (stockActual < (consumoRealKg - 0.001)) {
                throw new Error(`Falta stock de ${ingCalc.insumoNombre}.`);
            }
            transaction.update(docSnap.ref, { stock: stockActual - consumoRealKg });
        }

        const payload = {
            estado: "en_proceso",
            tandasReal: tandas,
            fechaInicio: Timestamp.now(),
            recetaId: recetaActiva.id,
            recetaNombre: recetaActiva.nombre,
            outputInsumoId: recetaActiva.outputInsumoId || "",
            cantidad: Number(totalProducidoKg),
            imagen: recetaActiva.imagen || ""
        };

        if (ordenData && ordenData.id) {
            const ordenRef = doc(db, "ordenes_cocina", ordenData.id);
            transaction.update(ordenRef, payload);
        } else {
            const nuevaOrdenRef = doc(collection(db, "ordenes_cocina"));
            transaction.set(nuevaOrdenRef, {
                ...payload,
                createdAt: Timestamp.now(),
                prioridad: "normal",
                esManual: true
            });
        }
      });

      toast.success(`Producción iniciada: ${tandas} lotes`);
      onClose();

    } catch (error: any) {
      toast.error(error.message, { duration: 6000, icon: '🛑' });
    } finally {
      setProcessing(false);
    }
  };

  // 🔥 VALIDAMOS QUE ESTÉ MONTADO ANTES DE RENDERIZAR EL PORTAL 🔥
  if (!open || !mounted) return null;

  // 🔥 SE USA CREATEPORTAL PARA ENVIAR EL MODAL DIRECTO AL BODY CON Z-[99999] 🔥
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {mode === "selection" && (
            <>
                <div className="p-5 border-b border-border bg-background flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-bold text-lg">Seleccionar Receta</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground"/></button>
                </div>
                <div className="p-4 bg-muted/20">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input 
                            placeholder="Buscar receta..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loadingRecetas ? (
                        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-muted-foreground"/></div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {recetasFiltradas.map((r) => (
                                <div 
                                    key={r.id} 
                                    onClick={() => { setSelectedRecetaId(r.id); setTandas(1); setMode("details"); }}
                                    className="flex items-center gap-4 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors group"
                                >
                                    <img src={getFotoUrl(r)} className="w-14 h-14 rounded-lg object-cover bg-muted"/>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{r.nombre}</h4>
                                        <p className="text-xs text-muted-foreground">Rendimiento: {r.batchBaseKg} kg</p>
                                    </div>
                                    <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180"/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </>
        )}

        {mode === "details" && recetaActiva && (
            <>  
                <div className="relative h-48 bg-muted shrink-0">
                    <img src={getFotoUrl(recetaActiva)} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                    <button 
                        onClick={() => { if(!ordenData) setMode("selection"); else onClose(); }} 
                        className="absolute top-4 left-4 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 backdrop-blur-sm transition"
                    >
                        {ordenData ? <X className="w-5 h-5"/> : <ArrowLeft className="w-5 h-5"/>}
                    </button>
                    <div className="absolute bottom-0 left-0 w-full p-5 text-white">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 mb-2 backdrop-blur-md font-bold">
                            Batch Base: {Number(recetaActiva.batchBaseKg)} kg
                        </Badge>
                        <h2 className="text-2xl font-black leading-tight shadow-black drop-shadow-md uppercase">
                            {recetaActiva.nombre}
                        </h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-background custom-scrollbar">
                    <div className="p-4 rounded-2xl border bg-muted/10 border-border/60 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                <Scale className="w-3 h-3"/> Lotes a Producir
                            </label>
                            <div className="flex items-center gap-3 bg-card rounded-lg p-1 border border-border shadow-sm">
                                <button onClick={() => ajustarTandas(-0.1)} className="w-10 h-9 flex items-center justify-center hover:bg-muted rounded-md text-xl font-bold transition text-muted-foreground hover:text-foreground active:scale-95">-</button>
                                <span className="font-black text-xl w-16 text-center text-primary tabular-nums">{tandas.toFixed(1)}</span>
                                <button onClick={() => ajustarTandas(0.1)} className="w-10 h-9 flex items-center justify-center hover:bg-muted rounded-md text-xl font-bold transition text-muted-foreground hover:text-foreground active:scale-95">+</button>
                            </div>
                        </div>
                        <div className="h-px bg-border w-full" />
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-muted-foreground uppercase">Total Proyectado:</span>
                            <div className="text-3xl font-black text-foreground flex items-baseline gap-1">
                                {totalProducidoKg} <span className="text-sm text-muted-foreground font-black uppercase">kg</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase">
                            <Package className="w-4 h-4"/> Materia Prima a Descontar
                        </div>
                        <div className="bg-card rounded-xl border border-border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase text-left">
                                    <tr><th className="px-4 py-2 tracking-widest">Ingrediente</th><th className="px-4 py-2 text-right tracking-widest">Consumo</th></tr>
                                </thead>
                                <tbody className="divide-y divide-border/30 font-bold">
                                    {ingredientesCalculados.map((ing: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2.5 text-foreground uppercase text-xs">{ing.insumoNombre}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-red-600">
                                            -{ing.textoMostrar}
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-blue-50/50 text-blue-800 text-xs rounded-xl border border-blue-100/50 font-bold">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>Al confirmar, la orden pasará a la pestaña <b>"EN COCCIÓN"</b> y se descontará el stock físico.</p>
                    </div>
                </div>

                <div className="p-5 border-t border-border bg-background shrink-0">
                    <button
                        onClick={handleIniciarProduccion}
                        disabled={processing || tandas <= 0}
                        className="w-full py-4 bg-[#111827] hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                        {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : <PlayCircle className="w-5 h-5"/>}
                        {processing ? "Procesando..." : `Iniciar Producción (${tandas.toFixed(1)})`}
                    </button>
                </div>
            </>
        )}
      </div>
    </div>,
    document.body // 🔥 DESTINO DEL PORTAL 🔥
  );
}