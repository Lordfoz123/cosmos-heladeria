"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Loader2, Save, Store, Eye, EyeOff, CheckSquare, Square, Leaf, WheatOff, MilkOff, Cuboid } from "lucide-react"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const IMAGENES_TAMANOS: Record<string, string> = {
    '8oz':  '/icons/pote-8oz.png',
    '16oz': '/icons/pote-16oz.png',
    '32oz': '/icons/pote-32oz.png'
};

// 🔥 LISTA DE ETIQUETAS DISPONIBLES 🔥
const ETIQUETAS_DISPONIBLES = [
  { id: "Sin Azúcar", icon: Cuboid, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" },
  { id: "Sin Lácteos", icon: MilkOff, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" },
  { id: "Sin Gluten", icon: WheatOff, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30" },
  { id: "Sin Soya", icon: Leaf, color: "text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30" }
];

interface Props {
  open: boolean;
  onClose: () => void;
  producto: any; 
  onSuccess?: () => void;
}

export default function ModalEditarCatalogo({ open, onClose, producto, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    ingredientes: "", // 🔥 Nuevo campo para los ingredientes
    imagen: "",
    activo: true,
    tamanos: [] as any[],
    etiquetas: [] as string[]
  });
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (producto && open) {
        setFormData({
            nombre: producto.nombre || "",
            descripcion: producto.descripcion || "",
            ingredientes: producto.ingredientes || "", // 🔥 Cargamos ingredientes existentes
            imagen: producto.imagen || "",
            activo: producto.activo ?? true,
            tamanos: (producto.tamanos || []).map((t: any) => ({ ...t })),
            etiquetas: producto.etiquetas || []
        });
    }
  }, [producto, open]);

  const updatePrecio = (id: string, nuevoPrecio: string) => {
    setFormData(prev => ({
      ...prev,
      tamanos: prev.tamanos.map(t => t.id === id ? { ...t, precio: Number(nuevoPrecio) || 0 } : t)
    }));
  };

  const toggleEtiqueta = (etiquetaId: string) => {
    setFormData(prev => {
        const tieneEtiqueta = prev.etiquetas.includes(etiquetaId);
        if (tieneEtiqueta) {
            return { ...prev, etiquetas: prev.etiquetas.filter(e => e !== etiquetaId) };
        } else {
            return { ...prev, etiquetas: [...prev.etiquetas, etiquetaId] };
        }
    });
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
      toast.success("Foto actualizada");
    } catch (error) { 
        toast.error("Error al subir imagen"); 
    } finally { 
        setUploading(false); 
    }
  };

  const handleSave = async () => {
    if (!formData.nombre) return toast.error("El nombre es obligatorio");
    setSaving(true);

    try {
        const docRefCatalogo = doc(db, "productos_tienda", producto.id);
        const payloadCatalogo = {
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion,
            ingredientes: formData.ingredientes, // 🔥 Guardamos los ingredientes
            imagen: formData.imagen,
            activo: formData.activo,
            tamanos: formData.tamanos,
            etiquetas: formData.etiquetas
        };
        await updateDoc(docRefCatalogo, payloadCatalogo);

        const qInventario = query(collection(db, "insumos"), where("catalogoId", "==", producto.id));
        const snapInventario = await getDocs(qInventario);
        
        snapInventario.forEach(async (documento) => {
            const currentTamanosInv = documento.data().tamanos || [];
            const tamanosSincronizados = currentTamanosInv.map((tInv: any) => {
                const matchCat = formData.tamanos.find(tC => tC.id === tInv.id);
                return matchCat ? { ...tInv, precio: matchCat.precio, nombre: matchCat.nombre } : tInv;
            });

            await updateDoc(doc(db, "insumos", documento.id), {
                nombre: payloadCatalogo.nombre,
                imagen: payloadCatalogo.imagen,
                tamanos: tamanosSincronizados,
                etiquetas: payloadCatalogo.etiquetas,
                ingredientes: payloadCatalogo.ingredientes // Sincronizamos también ingredientes por si acaso
            });
        });

        toast.success("Catálogo actualizado");
        if (onSuccess) onSuccess();
        onClose();
    } catch (error) {
        toast.error("Error al guardar los cambios");
    } finally {
        setSaving(false);
    }
  };

  if (!open || !producto || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-foreground">
      <div className="bg-background w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        
        <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-muted/30">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                 <Store className="w-5 h-5" />
             </div>
             <div>
                <h3 className="font-extrabold text-xl text-foreground tracking-tight">Editar Sabor</h3>
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">Información visible para el cliente</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-8 flex flex-col md:flex-row gap-8 bg-background max-h-[75vh] overflow-y-auto">
            
            {/* IZQUIERDA: FOTO, NOMBRE, DESCRIPCIÓN, INGREDIENTES Y ETIQUETAS */}
            <div className="w-full md:w-1/2 space-y-6">
                <div className="flex gap-4">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-28 shrink-0 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 bg-muted/30 transition-all overflow-hidden relative group"
                    >
                        {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : 
                         formData.imagen ? <img src={formData.imagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Sabor" /> :
                         <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        }
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Nombre Comercial</label>
                            <input 
                                value={formData.nombre}
                                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                className="w-full p-3 rounded-xl border border-border bg-background font-black text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => setFormData({...formData, activo: !formData.activo})}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border-2",
                                formData.activo 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                  : "bg-muted border-border text-muted-foreground"
                            )}
                        >
                            {formData.activo ? <><Eye className="w-4 h-4"/> Visible en Tienda</> : <><EyeOff className="w-4 h-4"/> Oculto al Cliente</>}
                        </button>
                    </div>
                </div>
                
                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Descripción corta (Catálogo)</label>
                    <textarea 
                        value={formData.descripcion}
                        onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                        className="w-full p-3 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 transition-all"
                        placeholder="Ej: Un sabor refrescante y cremoso..."
                    />
                </div>

                {/* 🔥 NUEVO CAMPO: INGREDIENTES 🔥 */}
                <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-1">Ingredientes</label>
                    <textarea 
                        value={formData.ingredientes}
                        onChange={(e) => setFormData({...formData, ingredientes: e.target.value})}
                        className="w-full p-3 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20 transition-all"
                        placeholder="Ej: Leche de almendras, panela, cacao orgánico..."
                    />
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest block mb-3">Etiquetas Conscientes</label>
                    <div className="flex flex-wrap gap-2">
                        {ETIQUETAS_DISPONIBLES.map((tag) => {
                            const isSelected = formData.etiquetas.includes(tag.id);
                            const Icon = tag.icon;
                            return (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleEtiqueta(tag.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all active:scale-95",
                                        isSelected ? tag.color : "bg-background border-border text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                    <Icon className="w-3.5 h-3.5" />
                                    {tag.id}
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* DERECHA: PRECIOS */}
            <div className="w-full md:w-1/2 bg-muted/30 rounded-[1.5rem] border border-border p-6 shadow-inner h-fit">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        Precios de Venta
                    </h4>
                </div>

                <div className="space-y-3">
                    {formData.tamanos.map((tam) => (
                        <div key={tam.id} className="bg-background p-3 rounded-xl border border-border shadow-sm flex items-center justify-between transition-colors hover:border-primary/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center p-1 border border-border">
                                    <img src={IMAGENES_TAMANOS[tam.id] || '/icons/pote-8oz.png'} alt={tam.nombre} className="w-full h-full object-contain opacity-80" />
                                </div>
                                <span className="text-sm font-black text-foreground">{tam.nombre}</span>
                            </div>
                            
                            <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-sm">S/</span>
                                <input 
                                    type="number" step="0.01"
                                    value={tam.precio}
                                    onChange={(e) => updatePrecio(tam.id, e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                />
                            </div>
                        </div>
                    ))}
                    {formData.tamanos.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4 italic">No hay tamaños configurados.</p>
                    )}
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 text-xs font-bold uppercase text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors tracking-widest">
                Cancelar
            </button>
            <button 
                onClick={handleSave}
                disabled={saving || !formData.nombre}
                className="px-8 py-3 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Actualizar Tienda
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}