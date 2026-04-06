"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom"; // 🔥 IMPORTAMOS PORTAL 🔥
import { X, Loader2, Minus, Plus, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge"; 
import { doc, runTransaction } from "firebase/firestore"; 
import { db } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const PESOS_REFERENCIA: Record<string, number> = {
    '8oz': 237,
    '16oz': 473,
    '32oz': 946,
};

interface Props {
  open: boolean;
  onClose: () => void;
  baseItem: any; 
  productosCatalogo: any[]; 
}

export default function ModalTransformar({ open, onClose, baseItem, productosCatalogo = [] }: Props) {
  // 🔥 ESTADO DE MONTAJE PARA EVITAR ERRORES DE SSR EN NEXT.JS CON PORTALS 🔥
  const [mounted, setMounted] = useState(false);

  const [distribucion, setDistribucion] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // 🔥 Efecto para activar el Portal una vez cargada la vista en el cliente 🔥
  useEffect(() => {
    setMounted(true);
  }, []);

  const stockBaseKg = Number(baseItem?.stock || 0);
  const pesoBaseTotalGr = stockBaseKg * 1000;

  const opcionesProduccion = useMemo(() => {
      if (!productosCatalogo || !Array.isArray(productosCatalogo)) return [];
      const opciones: any[] = [];
      
      productosCatalogo.forEach(prod => {
          if (prod?.tamanos && Array.isArray(prod.tamanos)) {
              prod.tamanos.forEach((tam: any) => {
                  
                  // 🔥 AHORA LEE EL PESO EXACTO QUE GUARDASTE EN EL INVENTARIO 🔥
                  const pesoGramos = Number(tam.capacidad) || PESOS_REFERENCIA[tam.id] || 250;
                  
                  opciones.push({
                      uniqueId: `${prod.id}_${tam.id}`,
                      insumoId: prod.id, 
                      tamanoId: tam.id,
                      nombre: prod.nombre || "Sabor sin nombre",
                      variante: tam.nombre || "Sin formato",
                      pesoUnitario: pesoGramos, 
                      imagen: `/icons/pote-${tam.id}.png`,
                      categoria: prod.categoria || "Helados"
                  });
              });
          }
      });
      return opciones;
  }, [productosCatalogo]);

  const { pesoConsumidoGr, pesoRestanteKg, esExceso, puedeContinuar } = useMemo(() => {
    let consumo = 0;
    Object.entries(distribucion).forEach(([uniqueId, cantidad]) => {
      const opcion = opcionesProduccion.find((op) => op.uniqueId === uniqueId);
      if (opcion) { consumo += opcion.pesoUnitario * cantidad; }
    });
    const restanteGr = pesoBaseTotalGr - consumo;
    return {
      pesoConsumidoGr: consumo,
      pesoRestanteKg: restanteGr / 1000, 
      esExceso: restanteGr < 0, 
      puedeContinuar: consumo > 0 && restanteGr >= 0 
    };
  }, [distribucion, opcionesProduccion, pesoBaseTotalGr]);

  const handleChange = (uniqueId: string, delta: number) => {
      setDistribucion(prev => {
          const actual = prev[uniqueId] || 0;
          const nuevo = Math.max(0, actual + delta);
          return { ...prev, [uniqueId]: nuevo };
      });
  };

  const handleGuardar = async () => {
    if (!puedeContinuar || esExceso || saving) return;
    setSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Obtenemos la base
        const baseRef = doc(db, "insumos", baseItem.id);
        const baseSnap = await transaction.get(baseRef);
        const stockActualBase = Number(baseSnap.data()?.stock || 0);
        const consumoKg = pesoConsumidoGr / 1000;

        // 2. Agrupamos por producto
        const produccionPorProducto: Record<string, Record<string, number>> = {};
        for (const [uniqueId, cantidad] of Object.entries(distribucion)) {
            if (cantidad <= 0) continue;
            const opcion = opcionesProduccion.find(o => o.uniqueId === uniqueId);
            if (!opcion) continue;
            if (!produccionPorProducto[opcion.insumoId]) produccionPorProducto[opcion.insumoId] = {};
            produccionPorProducto[opcion.insumoId][opcion.tamanoId] = cantidad;
        }

        // 3. 🔥 ACTUALIZAMOS DIRECTAMENTE EL INVENTARIO 🔥
        for (const [insumoId, tamanosProducidos] of Object.entries(produccionPorProducto)) {
            const docRef = doc(db, "insumos", insumoId);
            const docSnap = await transaction.get(docRef);
            
            if (docSnap.exists()) {
                const currentData = docSnap.data();
                let currentTamanos = currentData.tamanos || [];

                const nuevosTamanos = currentTamanos.map((t: any) => {
                    const producidos = tamanosProducidos[t.id] || 0;
                    if (producidos > 0) {
                        return { ...t, stock: Number(t.stock || 0) + producidos };
                    }
                    return t;
                });

                const stockTotalDocumento = nuevosTamanos.reduce((acc: number, t: any) => acc + (Number(t.stock) || 0), 0);

                transaction.update(docRef, { 
                    tamanos: nuevosTamanos, 
                    stock: stockTotalDocumento 
                });
            }
        }
        
        // 4. Descontamos de la Base
        transaction.update(baseRef, { stock: Number((stockActualBase - consumoKg).toFixed(2)) });
      });
      
      toast.success(`Producción terminada. Potes añadidos al almacén.`);
      onClose(); 
      resetModal();
    } catch (e: any) { 
        toast.error("Error al procesar la producción"); 
        console.error(e);
    } finally { 
        setSaving(false); 
    }
  };

  const resetModal = () => { setDistribucion({}); };

  // 🔥 VALIDAMOS QUE ESTÉ MONTADO PARA USAR EL PORTAL 🔥
  if (!open || !mounted) return null;

  // 🔥 SE USA CREATEPORTAL PARA ENVIAR EL MODAL DIRECTO AL BODY CON Z-[99999] 🔥
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] md:h-[750px] border border-border/40 animate-in zoom-in-95 duration-300">
        
        <div className="w-full md:w-5/12 relative flex flex-col justify-between p-10 overflow-hidden bg-slate-900">
            {baseItem?.imagen ? (
                <img src={baseItem.imagen} className="absolute inset-0 w-full h-full object-cover opacity-60 scale-110 blur-[2px]" alt="" />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10" />

            <div className="space-y-4 relative z-20">
                <Badge className="bg-white/20 backdrop-blur-md text-white border-none px-3 py-1 font-bold text-[10px] uppercase tracking-widest">Cocina / Producción</Badge>
                <h2 className="text-3xl font-extrabold tracking-tight text-white uppercase leading-none">{baseItem?.nombre}</h2>
                <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Disponible para fraccionar</p>
                    <p className="text-4xl font-black text-emerald-400 tabular-nums">{stockBaseKg.toFixed(2)} kg</p>
                </div>
            </div>

            <div className={cn(
                "p-6 rounded-[2rem] border-2 transition-all relative z-20 backdrop-blur-md",
                esExceso ? 'border-red-500/50 bg-red-500/10' : 'border-emerald-500/50 bg-emerald-500/10'
            )}>
                <span className="text-[10px] font-bold uppercase text-slate-300 block mb-1 tracking-widest">Base Restante</span>
                <div className={cn("text-5xl font-black tracking-tighter tabular-nums", esExceso ? 'text-red-400' : 'text-emerald-400')}>
                    {pesoRestanteKg.toFixed(2)}<span className="text-xl ml-1 opacity-60">kg</span>
                </div>
            </div>
        </div>

        <div className="w-full md:w-8/12 bg-white flex flex-col">
            <div className="p-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <div>
                    <h3 className="font-extrabold text-xl tracking-tight text-slate-900 uppercase">
                        Fraccionar en Potes
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Indica cuántos potes salieron de esta base. Se sumarán al almacén general.
                    </p>
                </div>
                <button onClick={() => { onClose(); resetModal(); }} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5 text-slate-300"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                <div className="grid grid-cols-1 gap-3">
                    {opcionesProduccion.map((opcion) => {
                        const cantidad = distribucion[opcion.uniqueId] || 0;
                        return (
                            <div key={opcion.uniqueId} className={cn(
                                "flex items-center p-4 rounded-3xl border-2 transition-all",
                                cantidad > 0 ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white opacity-60'
                            )}>
                                <div className="w-12 h-12 bg-slate-50 rounded-xl shrink-0 flex items-center justify-center p-2">
                                    <img src={opcion.imagen} className="w-full h-full object-contain" alt="" />
                                </div>
                                <div className="flex-1 px-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-sm text-slate-900 uppercase">{opcion.variante}</span>
                                        {/* AHORA MUESTRA EL PESO EXACTO QUE PUSISTE AL EDITAR */}
                                        <span className="text-[9px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded-md">{opcion.pesoUnitario}g</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate">{opcion.nombre}</p>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                    <button onClick={() => handleChange(opcion.uniqueId, -1)} disabled={cantidad === 0} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-xs hover:text-red-600 transition-all"><Minus className="w-3.5 h-3.5"/></button>
                                    <span className="font-black text-lg w-8 text-center tabular-nums">{cantidad}</span>
                                    <button onClick={() => handleChange(opcion.uniqueId, 1)} disabled={esExceso} className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg shadow-sm hover:bg-black transition-all"><Plus className="w-3.5 h-3.5"/></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex gap-4 shrink-0">
                 <button 
                    onClick={handleGuardar} 
                    disabled={!puedeContinuar || esExceso || saving} 
                    className="flex-1 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {saving ? <Loader2 className="animate-spin w-5 h-5"/> : (
                        <>
                            Confirmar Producción a Almacén
                            <CheckCircle2 className="w-5 h-5" />
                        </>
                    )}
                 </button>
            </div>
        </div>
      </div>
    </div>,
    document.body // 🔥 DESTINO DEL PORTAL 🔥
  );
}