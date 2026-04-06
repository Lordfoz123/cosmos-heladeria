"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom"; // 🔥 IMPORTAMOS PORTAL 🔥
import { 
  X, Scale, AlertTriangle, CheckCircle2, 
  ArrowRight, Calculator, Loader2 
} from "lucide-react";
import { doc, runTransaction, Timestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  task: any; 
  onSuccess: () => void;
};

export function FinalizarProduccionModal({ open, onClose, task, onSuccess }: Props) {
  // 🔥 ESTADO DE MONTAJE PARA EVITAR ERRORES DE SSR EN NEXT.JS CON PORTALS 🔥
  const [mounted, setMounted] = useState(false);

  // rawValue guarda SOLO LOS NÚMEROS (ej: "105")
  const [rawValue, setRawValue] = useState<string>("");
  const [unidad, setUnidad] = useState<"kg" | "g">("kg");
  
  const [observaciones, setObservaciones] = useState("");
  const [saving, setSaving] = useState(false);

  // 🔥 Efecto para activar el Portal una vez cargada la vista en el cliente 🔥
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Meta Teórica
  const pesoTeorico = useMemo(() => {
    if (!task) return 0;
    return Number(task.cantidad) || 0;
  }, [task]);

  // 2. Calcular el valor visual (con decimales automáticos para Kg)
  const valorVisual = useMemo(() => {
    if (!rawValue) return "";
    const num = parseInt(rawValue);
    if (isNaN(num)) return "";

    if (unidad === "kg") {
      // Magia: 105 -> 1.05
      return (num / 100).toFixed(2);
    } else {
      // Gramos: 1050 -> 1050
      return num.toString();
    }
  }, [rawValue, unidad]);

  // 3. Normalizar a KG para cálculos internos
  const pesoRealNormalizado = useMemo(() => {
    const num = parseFloat(valorVisual);
    if (isNaN(num)) return 0;
    return unidad === "g" ? num / 1000 : num;
  }, [valorVisual, unidad]);

  // 4. Análisis (Semáforo +/- 15%)
  const analisis = useMemo(() => {
    if (pesoRealNormalizado <= 0 || !pesoTeorico) return { diff: 0, percent: 0, status: "neutral" };

    const diff = pesoRealNormalizado - pesoTeorico; 
    const percent = pesoTeorico > 0 ? (diff / pesoTeorico) * 100 : 0;
    const absPercent = Math.abs(percent);

    let status = "success"; 
    if (absPercent > 5 && absPercent <= 15) status = "warning"; 
    if (absPercent > 15) status = "danger"; 

    return { diff, percent, status, absPercent };
  }, [pesoRealNormalizado, pesoTeorico]);

  // Limpiar
  useEffect(() => {
    if (open) {
      setRawValue("");
      setObservaciones("");
      setUnidad("kg");
    }
  }, [open]);

  // Manejo de escritura (Solo números)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitimos dígitos (0-9)
    const val = e.target.value.replace(/\D/g, "");
    setRawValue(val);
  };

  // Conversión al cambiar pestaña
  const handleUnitChange = (nuevaUnidad: "kg" | "g") => {
    if (nuevaUnidad === unidad) return;
    
    if (!rawValue) {
        setUnidad(nuevaUnidad);
        return;
    }

    const num = parseInt(rawValue);
    let nuevoRaw = "";

    if (nuevaUnidad === "g") {
        // De KG (105 -> 1.05) a GRAMOS (1050)
        // Multiplicamos por 10 porque "105" en Kg es 1.05, que son 1050g
        nuevoRaw = (num * 10).toString();
    } else {
        // De GRAMOS (1050) a KG (1.05 -> "105")
        // Dividimos entre 10
        nuevoRaw = Math.round(num / 10).toString();
    }

    setRawValue(nuevoRaw);
    setUnidad(nuevaUnidad);
  };

  const handleFinalizar = async () => {
    if (pesoRealNormalizado <= 0) {
      toast.error("Ingresa un peso válido");
      return;
    }

    if (analisis.status === "danger" && observaciones.length < 5) {
      toast.error("⚠️ Explica la diferencia crítica en observaciones.");
      return;
    }

    setSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
          const ordenRef = doc(db, "ordenes_cocina", task.id);

          if (task.outputInsumoId) {
            const productoRef = doc(db, "insumos", task.outputInsumoId);
            transaction.update(productoRef, {
                stock: increment(pesoRealNormalizado) 
            });
          }

          transaction.update(ordenRef, {
            estado: "Terminado",
            pesoFinalReal: pesoRealNormalizado,
            pesoTeorico: pesoTeorico,
            diferencia: analisis.diff,
            mermaPorcentaje: parseFloat(analisis.percent.toFixed(2)),
            observaciones: observaciones,
            fechaFin: Timestamp.now(),
          });

          const logRef = doc(db, "produccion_tareas", task.id);
          transaction.set(logRef, {
             ...task,
             estado: "Terminado",
             pesoReal: pesoRealNormalizado,
             pesoTeorico: pesoTeorico,
             mermaPorcentaje: parseFloat(analisis.percent.toFixed(2)),
             observaciones: observaciones,
             fechaFin: Timestamp.now()
          });
      });

      toast.success(`Registrado: ${pesoRealNormalizado.toFixed(3)} kg`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al finalizar producción");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 VALIDAMOS QUE ESTÉ MONTADO PARA USAR EL PORTAL 🔥
  if (!open || !task || !mounted) return null;

  // 🔥 SE USA CREATEPORTAL PARA ENVIAR EL MODAL DIRECTO AL BODY CON Z-[99999] 🔥
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Reporte Final
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
             <div>
                <p className="text-xs uppercase font-bold text-blue-600 mb-1">Meta (Teórica)</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-blue-900">{pesoTeorico.toFixed(2)}</span>
                    <span className="text-sm font-bold text-blue-700">kg</span>
                </div>
             </div>
             <Calculator className="w-8 h-8 text-blue-200" />
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-3 flex justify-between items-center">
               <span>Peso Final (Balanza)</span>
               
               <div className="flex bg-muted p-0.5 rounded-lg border border-border/50">
                  <button 
                    onClick={() => handleUnitChange("kg")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${unidad === 'kg' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    KG
                  </button>
                  <button 
                    onClick={() => handleUnitChange("g")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${unidad === 'g' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    GRAMOS
                  </button>
               </div>
            </label>

            <div className="relative">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                
                {/* INPUT MÁGICO */}
                <input 
                    type="tel" // Fuerza teclado numérico en móvil
                    inputMode="numeric"
                    autoFocus
                    placeholder={unidad === 'kg' ? "0.00" : "0"}
                    value={valorVisual} 
                    onChange={handleInputChange}
                    className={`
                        w-full pl-10 pr-16 py-3 text-2xl font-black rounded-xl border-2 outline-none transition-all tracking-widest
                        ${analisis.status === 'success' ? 'border-border focus:border-green-500' :
                          analisis.status === 'warning' ? 'border-yellow-300 focus:border-yellow-500 bg-yellow-50/10' :
                          analisis.status === 'danger' ? 'border-red-300 focus:border-red-500 bg-red-50/10' :
                          'border-border focus:border-primary'}
                    `}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground uppercase text-xs">
                    {unidad}
                </span>
            </div>

            {/* INSTRUCCIONES PEQUEÑAS */}
            <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                {unidad === 'kg' ? "Escribe sin puntos. Ej: 125 es 1.25" : "Escribe los gramos exactos."}
            </p>

            {/* FEEDBACK AUTOMÁTICO */}
            {rawValue && (
                <div className="mt-3 text-xs flex justify-between items-center bg-muted/30 p-2 rounded-lg">
                    <span className="text-muted-foreground">
                       Interpretado: <b>{pesoRealNormalizado.toFixed(3)} Kg</b>
                    </span>
                    
                    {analisis.status === 'success' && (
                        <span className="text-green-600 font-bold flex items-center gap-1">✅ OK ({analisis.percent > 0 ? "+" : ""}{analisis.percent.toFixed(1)}%)</span>
                    )}
                    {analisis.status === 'warning' && (
                        <span className="text-yellow-600 font-bold flex items-center gap-1">⚠️ Revisar ({analisis.percent > 0 ? "+" : ""}{analisis.percent.toFixed(1)}%)</span>
                    )}
                    {analisis.status === 'danger' && (
                        <span className="text-red-600 font-bold flex items-center gap-1 animate-pulse">🚨 ALERTA ({analisis.percent > 0 ? "+" : ""}{analisis.percent.toFixed(1)}%)</span>
                    )}
                </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">
                Observaciones {analisis.status === 'danger' && <span className="text-red-500 ml-1">(Requerido)</span>}
            </label>
            <textarea 
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder={analisis.status === 'danger' ? "Explica la causa de la diferencia..." : "¿Alguna nota?"}
                className={`w-full p-3 rounded-xl border bg-background text-sm resize-none focus:ring-2 outline-none transition-all ${analisis.status === 'danger' && !observaciones ? 'border-red-300 ring-2 ring-red-100' : 'border-border focus:ring-primary/20'}`}
            />
          </div>

        </div>

        <div className="p-4 border-t border-border bg-muted/5 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition">
            Cancelar
          </button>
          <button 
            onClick={handleFinalizar}
            disabled={saving || !rawValue}
            className={`
                px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2
                ${analisis.status === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#111827] hover:bg-black'}
                disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <ArrowRight className="w-4 h-4" />}
            {saving ? "Guardando..." : "Confirmar"}
          </button>
        </div>

      </div>
    </div>,
    document.body // 🔥 DESTINO DEL PORTAL 🔥
  );
}