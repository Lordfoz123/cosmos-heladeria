"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom"; // 🔥 IMPORTAMOS PORTAL 🔥
import { 
  X, Upload, Loader2, Save, Link as LinkIcon, 
  Package, CheckCircle2, Search, Box, Scale, Hash
} from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, updateDoc, doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";

const IMAGENES_TAMANOS: Record<string, string> = {
    '8oz':  '/icons/pote-8oz.png',
    '16oz': '/icons/pote-16oz.png',
    '32oz': '/icons/pote-32oz.png'
};

const ESCALAS_VISUALES: Record<string, string> = {
    '8oz':  'scale-75', 
    '16oz': 'scale-90', 
    '32oz': 'scale-110' 
};

type Tamano = {
  id: string; 
  nombre: string;
  precio: number | string; 
  capacidad: number | string;
  stock: number | string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: any;
  onSuccess?: (nuevoProducto: any) => void; 
};

const TAMANOS_FIJOS = [
    { id: '8oz', nombre: '8 oz', capacidad: 237 },
    { id: '16oz', nombre: '16 oz', capacidad: 473 },
    { id: '32oz', nombre: '32 oz', capacidad: 946 }
];

export function ModalProducto({ open, onClose, initial, onSuccess }: Props) {
  // 🔥 ESTADO DE MONTAJE PARA EVITAR ERRORES DE SSR EN NEXT.JS CON PORTALS 🔥
  const [mounted, setMounted] = useState(false);

  const [insumos, setInsumos] = useState<any[]>([]);
  const [busquedaInsumo, setBusquedaInsumo] = useState("");
  
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    imagen: "",
    baseVinculadaId: "", 
    insumoNombre: "", 
    activo: true,
    tamanos: TAMANOS_FIJOS.map(t => ({ ...t, precio: "", stock: "" })) as Tamano[]
  });
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 Efecto para activar el Portal una vez cargada la vista en el cliente 🔥
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const soloBasesHelado = data.filter((i: any) => (i.tipo || "").toLowerCase() === 'base');
      setInsumos(soloBasesHelado.sort((a:any, b:any) => a.nombre.localeCompare(b.nombre)));
    });
    return () => unsub();
  }, []);

  // ✅ PREPARACIÓN MEJORADA PARA CUANDO SE EDITA
  useEffect(() => {
    if (initial) {
        const tamanosFusionados = TAMANOS_FIJOS.map(fijo => {
            const guardado = initial.tamanos?.find((t: any) => t.id === fijo.id || t.nombre === fijo.nombre);
            return { 
                ...fijo, 
                precio: guardado ? Number(guardado.precio || 0) : "",
                capacidad: guardado ? Number(guardado.capacidad || fijo.capacidad) : fijo.capacidad,
                stock: guardado ? Number(guardado.stock || 0) : ""
            };
        });

        setFormData({
            nombre: initial.nombre || "",
            descripcion: initial.descripcion || "",
            imagen: initial.imagen || "",
            baseVinculadaId: initial.baseVinculadaId || initial.insumoId || "",
            insumoNombre: initial.insumoNombre || "",
            activo: initial.activo ?? true,
            tamanos: tamanosFusionados
        });
    } else {
        setFormData({ 
            nombre: "", descripcion: "", imagen: "", 
            baseVinculadaId: "", insumoNombre: "", activo: true,
            tamanos: TAMANOS_FIJOS.map(t => ({ ...t, precio: "", stock: "" }))
        });
        setBusquedaInsumo("");
    }
  }, [initial, open]);

  const updateTamano = (id: string, campo: keyof Tamano, valor: string | number) => {
    setFormData(prev => ({
      ...prev,
      tamanos: prev.tamanos.map(t => t.id === id ? { ...t, [campo]: valor } : t)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const storageRef = ref(storage, `productos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, imagen: url }));
      toast.success("Foto cargada");
    } catch (error) { toast.error("Error al subir"); } finally { setUploading(false); }
  };

  // 🔥 LÓGICA DE GUARDADO/EDICIÓN PERFECCIONADA 🔥
  const handleSave = async () => {
    if (!formData.nombre) return toast.error("Falta el nombre");
    if (!formData.baseVinculadaId) return toast.error("Falta vincular la base");
    
    const tamanosValidos = formData.tamanos.filter(t => Number(t.precio) > 0 || Number(t.stock) > 0);
    if (tamanosValidos.length === 0) return toast.error("Configura al menos un tamaño con precio o stock");

    setSaving(true);
    try {
        const precios = tamanosValidos.map(t => Number(t.precio)).filter(p => p > 0);
        const precioDesde = precios.length > 0 ? Math.min(...precios) : 0;
        const stockTotal = formData.tamanos.reduce((acc, t) => acc + (Number(t.stock) || 0), 0);
        
        const baseDatosGenerales = { 
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion,
            imagen: formData.imagen,
            baseVinculadaId: formData.baseVinculadaId,
            insumoNombre: formData.insumoNombre,
            activo: formData.activo,
            precio: precioDesde,
            stock: stockTotal, // ✅ AQUÍ ESTÁ LA MAGIA PARA QUE LA TIENDA LO VEA
            updatedAt: Timestamp.now() 
        };

        // Ahora ambos lados reciben precio y stock para estar 100% sincronizados
        const arrayTamanos = formData.tamanos.map(t => ({
            id: t.id, 
            nombre: t.nombre, 
            precio: Number(t.precio) || 0, 
            capacidad: Number(t.capacidad) || 0,
            stock: Number(t.stock) || 0
        }));

        if (initial) {
            // MODO EDICIÓN: Sincroniza ambos documentos
            const idCat = initial.catalogoId || initial.id;
            
            try {
                await updateDoc(doc(db, "productos_tienda", idCat), { ...baseDatosGenerales, tamanos: arrayTamanos });
            } catch (e) { console.log("Nota: No se encontró el catálogo antiguo"); }

            try {
                await updateDoc(doc(db, "insumos", initial.id), { ...baseDatosGenerales, tamanos: arrayTamanos });
            } catch (e) { console.log("Nota: No se encontró el insumo antiguo"); }
            
            toast.success("Catálogo e Inventario actualizados ✅");
            if (onSuccess) onSuccess({ id: initial.id, ...baseDatosGenerales });
            
        } else {
            // MODO CREACIÓN: Doble escritura
            const payloadCreacion = { ...baseDatosGenerales, tamanos: arrayTamanos, createdAt: Timestamp.now() };
            const docRef = await addDoc(collection(db, "productos_tienda"), payloadCreacion);

            await addDoc(collection(db, "insumos"), {
                ...payloadCreacion,
                tipo: "Producto Final",
                ultimoDestino: "fisica", // 🔥 AÑADIMOS EL DESTINO INICIAL PARA QUE CONCUERDE CON EL TRANSFORMADOR
                unidad: "und", 
                costo: 0,
                catalogoId: docRef.id
            });

            toast.success("Creado en Catálogo e Inventario ✅");
            if (onSuccess) onSuccess({ id: docRef.id, ...baseDatosGenerales });
        }
        onClose();
    } catch (error) { toast.error("Error al guardar"); } finally { setSaving(false); }
  };

  const insumosFiltrados = useMemo(() => 
    insumos.filter(i => i.nombre.toLowerCase().includes(busquedaInsumo.toLowerCase())),
  [insumos, busquedaInsumo]);

  // 🔥 VALIDAMOS QUE ESTÉ MONTADO PARA USAR EL PORTAL 🔥
  if (!open || !mounted) return null;

  // 🔥 SE USA CREATEPORTAL PARA ENVIAR EL MODAL DIRECTO AL BODY CON Z-[99999] 🔥
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card text-foreground w-full max-w-6xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <div>
             <h3 className="font-bold text-xl flex items-center gap-2">
                {initial ? "Editar Pote (Catálogo e Inventario)" : "Configuración de Nuevo Helado (2x1)"}
             </h3>
             <p className="text-xs text-muted-foreground">Esta acción sincroniza la Tienda Virtual y el Inventario Físico.</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* IZQUIERDA: DATOS BÁSICOS Y FORMATOS FUSIONADOS */}
                <div className="lg:w-5/12 space-y-6">
                    <div className="flex gap-4">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 bg-muted/30 transition-all overflow-hidden relative group"
                        >
                            {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : 
                             formData.imagen ? <img src={formData.imagen} className="w-full h-full object-cover" alt="Sabor" /> :
                             <Upload className="w-6 h-6 text-muted-foreground opacity-50" />
                            }
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Nombre del Helado</label>
                                <input 
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    className="w-full p-2.5 rounded-lg border border-border bg-background font-black text-sm outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                                    placeholder="Ej. Frutos Rojos Premium"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Descripción corta (Tienda)</label>
                                <input 
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                                    className="w-full p-2.5 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20 font-medium text-foreground"
                                    placeholder="Fresa, frambuesa y arándanos..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/20 p-4 rounded-2xl border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 text-foreground"/> 
                                <h4 className="text-xs font-bold uppercase text-foreground tracking-widest">Precios y Stock</h4>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {formData.tamanos.map((tam) => (
                                <div key={tam.id} className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col gap-3">
                                    <div className="flex items-center gap-3 border-b border-border/40 pb-2">
                                        <div className="w-10 h-10 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center shrink-0 p-1">
                                            <img src={IMAGENES_TAMANOS[tam.id]} alt={tam.nombre} className={`w-full h-full object-contain ${ESCALAS_VISUALES[tam.id]}`} />
                                        </div>
                                        <span className="text-sm font-black text-foreground">{tam.nombre}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* Precio Venta - Adaptado */}
                                        <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                            <label className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter flex items-center gap-1 mb-1"><span className="text-emerald-500">S/</span> Precio Venta</label>
                                            <input 
                                                type="number" step="0.01" placeholder="0.00"
                                                value={tam.precio}
                                                onChange={(e) => updateTamano(tam.id, 'precio', e.target.value)}
                                                className="w-full bg-transparent text-sm font-black outline-none text-emerald-700 dark:text-emerald-300 placeholder:text-emerald-500/50"
                                            />
                                        </div>
                                        
                                        {/* Peso - Adaptado */}
                                        <div className="bg-muted p-2 rounded-lg border border-border/50">
                                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter flex items-center gap-1 mb-1"><Scale className="w-3 h-3"/> Peso (g)</label>
                                            <input 
                                                type="number" placeholder="237"
                                                value={tam.capacidad}
                                                onChange={(e) => updateTamano(tam.id, 'capacidad', e.target.value)}
                                                className="w-full bg-transparent text-sm font-bold outline-none text-foreground placeholder:text-muted-foreground/50"
                                            />
                                        </div>

                                        {/* Existencia - Adaptado */}
                                        <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                                            <label className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter flex items-center gap-1 mb-1"><Hash className="w-3 h-3 text-blue-500"/> Existencia</label>
                                            <input 
                                                type="number" placeholder="0"
                                                value={tam.stock}
                                                onChange={(e) => updateTamano(tam.id, 'stock', e.target.value)}
                                                className="w-full bg-transparent text-sm font-black outline-none text-blue-700 dark:text-blue-300 placeholder:text-blue-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* DERECHA: SELECCIÓN DE BASE */}
                <div className="lg:w-7/12 flex flex-col h-[600px] lg:h-auto bg-muted/20 rounded-2xl border border-border p-5">
                     <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2 tracking-widest">
                                <LinkIcon className="w-4 h-4" /> Vincular con Base
                            </h4>
                            <p className="text-[10px] text-muted-foreground font-medium">De dónde se descontará al producir nuevos potes.</p>
                        </div>
                        <div className="relative w-48">
                             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                             <input 
                                placeholder="Buscar sabor base..."
                                value={busquedaInsumo}
                                onChange={(e) => setBusquedaInsumo(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-foreground"
                             />
                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-3 pb-4">
                            {insumosFiltrados.map((item) => {
                                const isSelected = formData.baseVinculadaId === item.id;
                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => setFormData({...formData, baseVinculadaId: item.id, insumoNombre: item.nombre})}
                                        className={`
                                            cursor-pointer rounded-2xl border p-3 flex gap-4 items-center transition-all relative overflow-hidden group
                                            ${isSelected 
                                                ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20 shadow-md" 
                                                : "border-border bg-card hover:border-blue-500/30 hover:shadow-sm"
                                            }
                                        `}
                                    >
                                        <div className="w-14 h-14 rounded-xl bg-blue-500/10 shrink-0 overflow-hidden border border-blue-500/20 flex items-center justify-center">
                                            {item.imagen ? (
                                                <img src={item.imagen} className="w-full h-full object-cover" alt={item.nombre} />
                                            ) : (
                                                <Box className="w-6 h-6 text-blue-500" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-black uppercase tracking-tight truncate ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}>
                                                {item.nombre}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md font-black uppercase tracking-tighter">BASE</span>
                                                <p className="text-[10px] text-muted-foreground font-bold tabular-nums">
                                                    {Number(item.stock).toFixed(2)} {item.unidad}
                                                </p>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute top-2 right-2 animate-in zoom-in duration-300">
                                                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                     </div>

                     <div className="mt-4 pt-4 border-t border-border flex justify-between items-center bg-card/50 p-4 rounded-xl">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Base Asignada:</span>
                        {formData.baseVinculadaId ? (
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 shadow-sm animate-in fade-in slide-in-from-right-2 uppercase">
                                {formData.insumoNombre}
                            </span>
                         ) : (
                            <span className="text-xs font-bold text-red-500 italic animate-pulse">
                                Requerido para crear...
                            </span>
                         )}
                     </div>
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-border bg-muted/30 flex justify-between items-center px-8">
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tienda:</span>
                <select 
                  value={formData.activo ? "true" : "false"} 
                  onChange={e=>setFormData({...formData, activo: e.target.value === "true"})} 
                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-black outline-none cursor-pointer text-foreground shadow-sm"
                >
                    <option value="true">🟢 Visible al público</option>
                    <option value="false">🔴 Oculto</option>
                </select>
            </div>
            <div className="flex gap-4">
                <button onClick={onClose} className="px-6 py-3 text-xs font-black text-muted-foreground hover:bg-muted rounded-xl transition-all uppercase tracking-widest">
                    Cancelar
                </button>
                <button 
                    onClick={handleSave}
                    disabled={saving || !formData.nombre || !formData.baseVinculadaId}
                    className="px-10 py-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                    {initial ? "Guardar Cambios" : "Crear en Tienda e Inventario"}
                </button>
            </div>
        </div>
      </div>
    </div>,
    document.body // 🔥 DESTINO DEL PORTAL 🔥
  );
}