"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // 🔥 IMPORTAMOS PORTAL 🔥
import { X, Loader2, Package, CheckCircle2, Plus, Minus, ArrowRightLeft } from "lucide-react";
import { doc, runTransaction, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  producto: any; 
}

export default function ModalDesignar({ open, onClose, producto }: Props) {
  // 🔥 ESTADO DE MONTAJE PARA EVITAR ERRORES DE SSR EN NEXT.JS CON PORTALS 🔥
  const [mounted, setMounted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [distribucionVirtual, setDistribucionVirtual] = useState<Record<string, number>>({});
  
  // 🔥 Efecto para activar el Portal una vez cargada la vista en el cliente 🔥
  useEffect(() => {
    setMounted(true);
  }, []);

  const tamanosFisica = producto?.stocksDestino?.fisica || [];
  const tamanosVirtual = producto?.stocksDestino?.virtual || [];

  const todosTamanosIds = Array.from(new Set([
    ...tamanosFisica.map((t:any) => t.id),
    ...tamanosVirtual.map((t:any) => t.id)
  ]));

  useEffect(() => {
    if (open) {
        const initialVirtual: Record<string, number> = {};
        todosTamanosIds.forEach(id => {
            initialVirtual[id] = tamanosVirtual.find((t:any) => t.id === id)?.stock || 0;
        });
        setDistribucionVirtual(initialVirtual);
    }
  }, [open, producto]);

  const handleVirtualChange = (tamanoId: string, nuevoValor: number | string) => {
    const total = (tamanosFisica.find((t:any) => t.id === tamanoId)?.stock || 0) + 
                  (tamanosVirtual.find((t:any) => t.id === tamanoId)?.stock || 0);
    
    let num = parseInt(nuevoValor as string) || 0;
    
    if (num < 0) num = 0;
    if (num > total) num = total;

    setDistribucionVirtual(prev => ({
      ...prev,
      [tamanoId]: num
    }));
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
        const qFisica = query(collection(db, "insumos"), where("catalogoId", "==", producto.catalogoId), where("ultimoDestino", "==", "fisica"), limit(1));
        const qVirtual = query(collection(db, "insumos"), where("catalogoId", "==", producto.catalogoId), where("ultimoDestino", "==", "virtual"), limit(1));
        
        const [snapFisica, snapVirtual] = await Promise.all([getDocs(qFisica), getDocs(qVirtual)]);

        let docFisica = snapFisica.empty ? doc(collection(db, "insumos")) : doc(db, "insumos", snapFisica.docs[0].id);
        let docVirtual = snapVirtual.empty ? doc(collection(db, "insumos")) : doc(db, "insumos", snapVirtual.docs[0].id);

        let dataFisica = snapFisica.empty ? { nombre: producto.nombre, tipo: "Producto Final", ultimoDestino: "fisica", catalogoId: producto.catalogoId, imagen: producto.imagen, tamanos: [], stock: 0 } : snapFisica.docs[0].data();
        let dataVirtual = snapVirtual.empty ? { nombre: producto.nombre, tipo: "Producto Final", ultimoDestino: "virtual", catalogoId: producto.catalogoId, imagen: producto.imagen, tamanos: [], stock: 0 } : snapVirtual.docs[0].data();

        let nuevosTamanosFisica = [...(dataFisica.tamanos || [])];
        let nuevosTamanosVirtual = [...(dataVirtual.tamanos || [])];

        Object.entries(distribucionVirtual).forEach(([tamId, stockVirtualAsignado]) => {
            const baseInfo = tamanosFisica.find((t:any)=>t.id===tamId) || tamanosVirtual.find((t:any)=>t.id===tamId);
            const total = (tamanosFisica.find((t:any)=>t.id===tamId)?.stock || 0) + (tamanosVirtual.find((t:any)=>t.id===tamId)?.stock || 0);
            
            const stockFisicoRestante = total - stockVirtualAsignado;
            
            let tf = nuevosTamanosFisica.find(t => t.id === tamId);
            if (!tf) { tf = { id: tamId, nombre: baseInfo.nombre, stock: 0 }; nuevosTamanosFisica.push(tf); }
            tf.stock = stockFisicoRestante;
            
            let tv = nuevosTamanosVirtual.find(t => t.id === tamId);
            if (!tv) { tv = { id: tamId, nombre: baseInfo.nombre, stock: 0 }; nuevosTamanosVirtual.push(tv); }
            tv.stock = stockVirtualAsignado;
        });

        dataFisica.tamanos = nuevosTamanosFisica;
        dataFisica.stock = nuevosTamanosFisica.reduce((a, b) => a + (Number(b.stock)||0), 0);
        
        dataVirtual.tamanos = nuevosTamanosVirtual;
        dataVirtual.stock = nuevosTamanosVirtual.reduce((a, b) => a + (Number(b.stock)||0), 0);

        transaction.set(docFisica, dataFisica, { merge: true });
        transaction.set(docVirtual, dataVirtual, { merge: true });
      });

      toast.success("Catálogo sincronizado con éxito");
      onClose();
    } catch (error) {
      toast.error("Error al sincronizar");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 VALIDAMOS QUE ESTÉ MONTADO ANTES DE RENDERIZAR EL PORTAL 🔥
  if (!open || !producto || !mounted) return null;

  // 🔥 SE USA CREATEPORTAL PARA ENVIAR EL MODAL DIRECTO AL BODY CON Z-[99999] 🔥
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-10 py-8 flex justify-between items-center bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-5">
            <div className="relative">
                <div className="w-16 h-16 bg-white rounded-[1rem] border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
                    {producto.imagen ? <img src={producto.imagen} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-slate-300" />}
                </div>
                {/* Ícono encimado usando tu color oscuro base */}
                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                    <ArrowRightLeft className="w-3 h-3 text-white" />
                </div>
            </div>
            <div className="flex flex-col">
              <h3 className="font-extrabold text-2xl uppercase text-slate-900 leading-none tracking-tight">{producto.nombre}</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1.5">Distribución de Inventario</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-6 h-6"/></button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/50">
           {todosTamanosIds.map((tamId) => {
               const totalStock = (tamanosFisica.find((t:any) => t.id === tamId)?.stock || 0) + 
                                  (tamanosVirtual.find((t:any) => t.id === tamId)?.stock || 0);
               
               const nombreTamano = tamanosFisica.find((t:any) => t.id === tamId)?.nombre || tamanosVirtual.find((t:any) => t.id === tamId)?.nombre || tamId;
               
               const asignadoVirtual = distribucionVirtual[tamId] !== undefined ? distribucionVirtual[tamId] : 0;
               const restanteFisico = totalStock - asignadoVirtual;

               return (
                   <div key={tamId} className="relative">
                       {/* ETIQUETA DE TAMAÑO NEGRA */}
                       <div className="flex items-center gap-4 mb-6">
                           <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">{nombreTamano}</span>
                           <div className="h-[1px] flex-1 bg-slate-200"></div>
                           {/* Cambiado a "Unidades" */}
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                               Total: {totalStock} Unidades
                           </span>
                       </div>

                       <div className="flex items-stretch justify-between gap-6">
                           
                           {/* LADO STOCK GENERAL (Se vuelve gris SOLO si llega a 0) */}
                           <div className={cn(
                               "relative flex-1 bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col items-center justify-between transition-all duration-500",
                               restanteFisico === 0 ? "opacity-60 border-slate-100 grayscale" : "border-slate-200 opacity-100"
                           )}>
                               <div className="text-center mb-5 w-full">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Se queda en Almacén</span>
                                   <span className={cn(
                                       "text-5xl font-black tabular-nums leading-none transition-colors",
                                       restanteFisico === 0 ? "text-slate-300" : "text-slate-800"
                                   )}>
                                     {restanteFisico}
                                   </span>
                               </div>
                               <div className="w-full h-24 rounded-[1rem] overflow-hidden shadow-inner border border-slate-100 relative">
                                   <img src="/Inventario/stock.webp" className={cn(
                                       "w-full h-full object-cover transition-all duration-500",
                                       restanteFisico === 0 ? "opacity-40" : "opacity-100"
                                   )} alt="Stock" />
                               </div>
                           </div>

                           {/* CONECTOR VISUAL CENTRAL */}
                           <div className="flex flex-col items-center justify-center w-12 shrink-0">
                               <div className="w-full h-[2px] bg-slate-200 rounded-full relative flex justify-center items-center">
                                   <div className="bg-white absolute w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
                                      <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                                   </div>
                               </div>
                           </div>

                           {/* LADO TIENDA VIRTUAL (Se vuelve gris SOLO si llega a 0) */}
                           <div className={cn(
                               "relative flex-[1.2] bg-white p-5 rounded-[2rem] border-2 shadow-md flex flex-col items-center justify-between group transition-all duration-500",
                               asignadoVirtual > 0 ? "border-slate-800" : "border-slate-200 grayscale opacity-90"
                           )}>
                               <div className="text-center mb-5 w-full">
                                   <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest block mb-2">Asignar a Tienda Virtual</span>
                                   
                                   {/* EL STEPPER DE CONTROL (Ahora con la paleta oscura) */}
                                   <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-2xl border border-slate-200 max-w-[200px] mx-auto shadow-sm">
                                        <button 
                                            onClick={() => handleVirtualChange(tamId, asignadoVirtual - 1)}
                                            disabled={asignadoVirtual <= 0}
                                            className="w-12 h-12 bg-white rounded-[14px] shadow-sm flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors disabled:opacity-30"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        
                                        <input 
                                            type="number"
                                            value={asignadoVirtual || ""}
                                            onChange={(e) => handleVirtualChange(tamId, e.target.value)}
                                            className="w-16 text-center font-black text-4xl bg-transparent outline-none text-slate-900"
                                        />
                                        
                                        <button 
                                            onClick={() => handleVirtualChange(tamId, asignadoVirtual + 1)}
                                            disabled={asignadoVirtual >= totalStock}
                                            className="w-12 h-12 bg-slate-900 rounded-[14px] shadow-md flex items-center justify-center text-white hover:bg-black transition-colors disabled:opacity-20 disabled:bg-slate-300"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                   </div>
                               </div>
                               
                               <div className="w-full h-24 rounded-[1rem] overflow-hidden shadow-inner border border-slate-100 relative">
                                   <img src="/Inventario/web.webp" className={cn(
                                       "w-full h-full object-cover transition-all duration-500 group-hover:scale-105",
                                       asignadoVirtual === 0 ? "opacity-40" : "opacity-100"
                                   )} alt="Virtual" />
                               </div>
                           </div>
                       </div>
                   </div>
               );
           })}
        </div>

        {/* FOOTER ACCIÓN */}
        <div className="px-10 py-6 bg-white flex justify-end items-center gap-6 shrink-0 border-t border-slate-100">
            <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Cancelar</button>
            <button 
               onClick={handleGuardar}
               disabled={saving}
               className="h-14 px-8 bg-[#111827] hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
               {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
               Confirmar Distribución
            </button>
        </div>

      </div>
    </div>,
    document.body // 🔥 DESTINO DEL PORTAL 🔥
  );
}