"use client";

import { useState } from "react";
import { X, Send, Package, ChefHat, ArrowDown, AlertTriangle } from "lucide-react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  open: boolean;
  onClose: () => void;
  producto: any; // El Helado a Granel (Base)
};

// Definimos los tamaños basados en tu imagen
const PRESENTACIONES = [
  { id: '8oz', label: '8 oz', capacidadKg: 0.237, icon: '🥡' },  // 0.237 L ~= Kg
  { id: '16oz', label: '16 oz', capacidadKg: 0.473, icon: '🥡' },
  { id: '32oz', label: '32 oz', capacidadKg: 0.946, icon: '🪣' },
];

export function DespachoModal({ open, onClose, producto }: Props) {
  const [activeTab, setActiveTab] = useState("producir"); // 'producir' | 'envasar'
  
  // Estados Producción (Crear Base)
  const [cantidadBatch, setCantidadBatch] = useState(1);
  const [prioridad, setPrioridad] = useState("normal");
  
  // Estados Envasado (Gastar Base -> Crear Unidades)
  const [selectedSize, setSelectedSize] = useState<any>(PRESENTACIONES[0]);
  const [cantidadUnidades, setCantidadUnidades] = useState(10); // Por defecto 10 potes

  const [sending, setSending] = useState(false);

  if (!open || !producto) return null;

  // Cálculos
  const totalKgProduccion = (cantidadBatch * (producto.batchBaseKg || 1)).toFixed(2);
  const totalKgRequeridoEnvasado = (cantidadUnidades * selectedSize.capacidadKg).toFixed(2);
  
  // Validación de Stock para Envasado
  const stockInsuficiente = activeTab === 'envasar' && Number(totalKgRequeridoEnvasado) > Number(producto.stock || 0);

  const handleSend = async () => {
    // 1. Validación de seguridad para evitar el error de Firebase
    // Si producto.recetaId no existe, usamos producto.id. Si nada existe, ponemos un string de error.
    const safeRecetaId = producto.recetaId || producto.id || "ID_NO_DEFINIDO";
    const safeNombre = producto.nombre || "Producto sin nombre";

    if (activeTab === 'envasar' && stockInsuficiente) {
        toast.error("No hay suficiente helado a granel para envasar esto.");
        return;
    }

    setSending(true);
    try {
      if (activeTab === "producir") {
          // --- FLUJO 1: PRODUCIR MÁS BASE ---
          await addDoc(collection(db, "ordenes_cocina"), {
            tipo: "produccion", 
            recetaId: safeRecetaId, // <--- CAMBIO AQUÍ: Usamos la variable segura
            recetaNombre: safeNombre,
            imagen: producto.imagen || null, // Firebase acepta null, pero no undefined
            cantidad: Number(totalKgProduccion), 
            tandas: cantidadBatch,
            prioridad,
            estado: "pendiente",
            createdAt: Timestamp.now(),
            createdBy: "Admin"
          });
          toast.success(`👨‍🍳 Orden: Producir ${totalKgProduccion}kg de base`);

      } else {
          // --- FLUJO 2: ENVASAR ---
          await addDoc(collection(db, "ordenes_cocina"), {
            tipo: "envasado", 
            recetaId: safeRecetaId, // <--- CAMBIO AQUÍ
            recetaNombre: safeNombre,
            imagen: producto.imagen || null,
            
            // Datos del Envasado
            detalleEnvasado: {
                presentacion: selectedSize.label, 
                capacidadUnitario: selectedSize.capacidadKg,
                unidadesSolicitadas: cantidadUnidades, 
            },

            cantidad: Number(totalKgRequeridoEnvasado), 
            prioridad,
            estado: "pendiente",
            createdAt: Timestamp.now(),
            createdBy: "Admin"
          });
          toast.success(`📦 Orden: Envasar ${cantidadUnidades} unidades de ${selectedSize.label}`);
      }
      
      onClose();
      // Reset
      setCantidadBatch(1);
      setCantidadUnidades(10);
      setPrioridad("normal");
    } catch (e) {
      console.error("Error detallado al enviar orden:", e);
      toast.error("Error al enviar orden (Revisar consola)");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-muted/30 p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-lg">Gestionar Producto</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground"/></button>
        </div>

        <div className="p-6 pb-2">
            <div className="flex items-center gap-4 mb-6">
                {producto.imagen && (
                    <img src={producto.imagen} className="w-16 h-16 rounded-xl object-cover border border-border shadow-sm" />
                )}
                <div>
                    <h2 className="text-xl font-black text-foreground leading-tight">{producto.nombre}</h2>
                    <p className="text-sm text-muted-foreground">
                        Stock Granel: <span className={(producto.stock || 0) <= 5 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>{Number(producto.stock || 0).toFixed(2)} kg</span>
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="producir" className="font-bold gap-2"><ChefHat className="w-4 h-4"/> Cocinar Base</TabsTrigger>
                    <TabsTrigger value="envasar" className="font-bold gap-2"><Package className="w-4 h-4"/> Envasar</TabsTrigger>
                </TabsList>

                {/* --- MODO PRODUCCIÓN --- */}
                <TabsContent value="producir" className="space-y-6">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col items-center">
                        <label className="text-xs font-bold text-blue-800 uppercase mb-2">Lotes a Cocinar</label>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setCantidadBatch(Math.max(1, cantidadBatch - 1))} className="w-10 h-10 bg-white rounded-lg shadow-sm border border-blue-200 font-bold text-xl text-blue-600">-</button>
                            <div className="text-center w-24">
                                <span className="text-3xl font-black text-blue-900">{cantidadBatch}</span>
                                <span className="block text-[10px] font-bold text-blue-400 uppercase">Tandas</span>
                            </div>
                            <button onClick={() => setCantidadBatch(cantidadBatch + 1)} className="w-10 h-10 bg-white rounded-lg shadow-sm border border-blue-200 font-bold text-xl text-blue-600">+</button>
                        </div>
                        <span className="text-xs text-blue-500 mt-2 font-bold">Total a Producir: {totalKgProduccion} kg</span>
                    </div>
                </TabsContent>

                {/* --- MODO ENVASADO --- */}
                <TabsContent value="envasar" className="space-y-6">
                    {/* Selector de Tamaño */}
                    <div className="grid grid-cols-3 gap-2">
                        {PRESENTACIONES.map((size) => (
                            <button
                                key={size.id}
                                onClick={() => setSelectedSize(size)}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedSize.id === size.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-background border-border hover:bg-muted'}`}
                            >
                                <span className="text-xl">{size.icon}</span>
                                <span className={`text-sm font-bold ${selectedSize.id === size.id ? 'text-indigo-700' : 'text-foreground'}`}>{size.label}</span>
                                <span className="text-[9px] text-muted-foreground">{size.capacidadKg} kg</span>
                            </button>
                        ))}
                    </div>

                    {/* Contador de Unidades */}
                    <div className={`p-4 rounded-xl border flex flex-col items-center ${stockInsuficiente ? 'bg-red-50 border-red-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
                        <label className="text-xs font-bold text-foreground uppercase mb-2">Cantidad de Potes</label>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setCantidadUnidades(Math.max(1, cantidadUnidades - 1))} className="w-10 h-10 bg-white rounded-lg shadow-sm border font-bold text-xl hover:bg-gray-50">-</button>
                            <div className="text-center w-24">
                                <span className="text-3xl font-black text-foreground">{cantidadUnidades}</span>
                                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Unidades</span>
                            </div>
                            <button onClick={() => setCantidadUnidades(cantidadUnidades + 1)} className="w-10 h-10 bg-white rounded-lg shadow-sm border font-bold text-xl hover:bg-gray-50">+</button>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3 text-xs font-bold">
                            <span className="text-muted-foreground">Requiere Base:</span>
                            <span className={stockInsuficiente ? "text-red-600" : "text-indigo-600"}>
                                {totalKgRequeridoEnvasado} kg
                            </span>
                        </div>

                        {stockInsuficiente && (
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-red-600 font-bold bg-red-100 px-2 py-1 rounded">
                                <AlertTriangle className="w-3 h-3"/> Stock insuficiente (Tienes {Number(producto.stock || 0).toFixed(2)} kg)
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Prioridad (Común) */}
            <div className="mt-6 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Prioridad de la Tarea</label>
                <div className="flex gap-2">
                    <button onClick={() => setPrioridad("normal")} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${prioridad === 'normal' ? 'bg-gray-100 border-gray-300 text-gray-800' : 'text-muted-foreground'}`}>Normal</button>
                    <button onClick={() => setPrioridad("alta")} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${prioridad === 'alta' ? 'bg-red-50 border-red-200 text-red-600' : 'text-muted-foreground'}`}>¡URGENTE!</button>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/5">
            <button 
                onClick={handleSend}
                disabled={sending || (activeTab === 'envasar' && stockInsuficiente)}
                className={`
                    w-full py-3.5 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95
                    ${stockInsuficiente && activeTab === 'envasar' ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-[#111827] hover:bg-black'}
                `}
            >
                {sending ? "Enviando..." : (
                    activeTab === 'producir' 
                    ? <><Send className="w-4 h-4" /> Enviar a Cocina</>
                    : <><ArrowDown className="w-4 h-4" /> Ordenar Envasado</>
                )}
            </button>
        </div>

      </div>
    </div>
  );
}