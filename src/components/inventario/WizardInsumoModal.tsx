"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom"; 
import { X, ChevronLeft, Upload, Loader2, Package, Search, IceCream2, Scale, Plus, Calculator, AlertTriangle } from "lucide-react";
import { storage, db } from "@/lib/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { ModalProducto } from "@/components/catalogo/ModalProducto"; 
import { cn } from "@/lib/utils";

const HELADO_SIZES = [
  { id: '8oz', label: "8 oz", value: 237 },
  { id: '16oz', label: "16 oz", value: 473 },
  { id: '32oz', label: "32 oz", value: 946 },
];

const TIPO_CARDS = [
  { value: "Materia Prima", title: "Insumo", desc: "Leche, azúcar, frutas y otros.", image: "/images/insumos/tipo-comprado-4x3.webp" },
  { value: "Intermedio", title: "Intermedio", desc: "Pulpas, preparados y mezclas.", image: "/images/insumos/tipo-intermedio-4x3.webp" },
  { value: "Base", title: "Base", desc: "Helado a granel medido en Kg.", image: "/images/insumos/tipo-intermedio-4x3.webp" },
  { value: "Producto Final", title: "Pote", desc: "Producto terminado multi-tamaño.", image: "/images/insumos/tipo-final-4x3.webp" },
];

const strictTwoDecimals = (val: any) => {
    const num = Number(val) || 0;
    return Math.trunc(num * 100) / 100;
};

export default function WizardInsumoModal({ open, onClose, editId, initial, onSave, saving }: any) {
  const [mounted, setMounted] = useState(false);

  const [step, setStep] = useState<"tipo" | "form">("tipo");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [productosTienda, setProductosTienda] = useState<any[]>([]);

  const [showModalProducto, setShowModalProducto] = useState(false);

  const [addMode, setAddMode] = useState<"kg" | "g">("kg");
  const [addAmount, setAddAmount] = useState("");

  const [form, setForm] = useState<any>({
    nombre: "", unidad: "Kg", stock: "", costo: "", tipo: "Materia Prima", imagen: "",
    baseVinculadaId: "", catalogoId: "", tamanos: [], umbralAlerta: 5 
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos_tienda"), (snap) => {
      setProductosTienda(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({ ...initial, stock: initial.stock || "", costo: initial.costo || "", umbralAlerta: initial.umbralAlerta || 5 });
        setStep("form");
        setAddAmount(""); 
        setAddMode("kg");
      } else {
        setForm({ nombre: "", unidad: "Kg", stock: "", costo: "", tipo: "Materia Prima", imagen: "", baseVinculadaId: "", catalogoId: "", tamanos: [], umbralAlerta: 5 });
        setStep("tipo");
      }
    }
  }, [open, initial]);

  const catalogoSugerido = useMemo(() => {
    return productosTienda.filter((p: any) => 
      (p.nombre || "").toLowerCase().includes(busquedaCatalogo.toLowerCase())
    ).slice(0, 5);
  }, [productosTienda, busquedaCatalogo]);

  const productoCatalogoSeleccionado = productosTienda.find((p: any) => p.id === form.catalogoId);
  const esProductoFinal = (form.tipo || "").trim() === "Producto Final";
  const esMateriaPrima = (form.tipo || "").trim() === "Materia Prima";

  useEffect(() => {
    if (esProductoFinal && productoCatalogoSeleccionado) {
        // 🔥 AQUÍ ESTÁ EL ARREGLO: (prev: any)
        setForm((prev: any) => ({ 
            ...prev, 
            nombre: productoCatalogoSeleccionado.nombre,
            imagen: productoCatalogoSeleccionado.imagen || prev.imagen,
            baseVinculadaId: productoCatalogoSeleccionado.baseVinculadaId || "",
            tamanos: HELADO_SIZES.map(size => {
                const existente = prev.tamanos?.find((t: any) => t.id === size.id);
                return {
                    id: size.id,
                    nombre: size.label,
                    capacidad: existente?.capacidad || size.value, 
                    stock: Number(existente?.stock || 0)
                };
            })
        }));
    }
  }, [form.catalogoId, esProductoFinal]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const storageRef = ref(storage, `insumos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((prev: any) => ({ ...prev, imagen: url }));
      toast.success("Imagen cargada");
    } catch (error) { toast.error("Error al subir"); } finally { setUploading(false); }
  };

  const handleAddStock = () => {
    const amount = Number(addAmount);
    if (!amount || amount <= 0) return;

    let stockActual = Number(form.stock) || 0;
    let cantidadASumar = amount;

    if (addMode === "g" && (form.unidad === "Kg" || form.unidad === "L")) {
        cantidadASumar = amount / 1000;
    } else if (addMode === "kg" && form.unidad === "g") {
        cantidadASumar = amount * 1000;
    }

    const nuevoStock = stockActual + cantidadASumar;
    
    setForm({ ...form, stock: strictTwoDecimals(nuevoStock).toString() });
    setAddAmount(""); 
    toast.success(`Se sumaron ${amount}${addMode} al stock`);
  };

  const handleFinalSave = async () => {
    const formattedForm = {
      ...form,
      stock: strictTwoDecimals(form.stock),
      costo: esMateriaPrima ? strictTwoDecimals(form.costo) : 0, 
      umbralAlerta: esMateriaPrima ? Number(form.umbralAlerta || 5) : 0, 
      tamanos: form.tamanos?.map((t: any) => ({ 
        ...t, 
        capacidad: Number(t.capacidad || 0),
        stock: strictTwoDecimals(t.stock)
      })) || []
    };

    if (editId && esMateriaPrima) {
        const stockAntiguo = Number(initial?.stock) || 0;
        const stockNuevo = Number(formattedForm.stock) || 0;
        const diferencia = stockNuevo - stockAntiguo;

        if (diferencia !== 0) {
            try {
                await addDoc(collection(db, "movimientos"), {
                    insumoId: editId,
                    insumoNombre: formattedForm.nombre,
                    cantidad: diferencia,
                    tipo: diferencia > 0 ? "entrada" : "salida",
                    fecha: new Date(),
                    observacion: `Ingreso desde calculadora (${diferencia > 0 ? '+' : ''}${strictTwoDecimals(diferencia)} ${formattedForm.unidad})`
                });
            } catch (error) {
                console.error("Error guardando movimiento en historial:", error);
            }
        }
    }

    onSave(formattedForm);
  };

  const updateSizeCapacity = (index: number, val: string) => {
    const nuevosTamanos = [...form.tamanos];
    nuevosTamanos[index].capacidad = val;
    setForm({ ...form, tamanos: nuevosTamanos });
  };

  const handleProductoCreado = (nuevoProducto: any) => {
    setShowModalProducto(false); 
    toast.success("Helado creado en Tienda e Inventario.");
    onClose(); 
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-foreground">
      <div className="bg-background w-full max-w-5xl rounded-[2rem] shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER DEL MODAL */}
        <div className="px-10 py-7 border-b border-border flex justify-between items-center bg-muted/30 shrink-0">
          <div className="space-y-1">
            <h3 className="font-extrabold text-2xl text-foreground tracking-tight">
              {editId ? "Editar ficha" : "Nuevo producto maestro"}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Gestión de existencias técnica y trazable.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"><X className="w-6 h-6" /></button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-background">
          {step === "tipo" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 h-full content-center">
              {TIPO_CARDS.map((card) => (
                <button 
                  key={card.value} 
                  onClick={() => { 
                    if (card.value === "Producto Final") {
                        setShowModalProducto(true);
                    } else {
                        setForm({ ...form, tipo: card.value, unidad: "Kg" }); 
                        setStep("form"); 
                    }
                  }} 
                  className="group flex flex-col text-left border border-border rounded-[1.5rem] overflow-hidden hover:shadow-xl hover:border-primary/50 transition-all bg-card hover:bg-accent/5 active:scale-[0.98]"
                >
                  <div className="h-36 w-full bg-muted relative overflow-hidden">
                    <img src={card.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" alt="" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-foreground tracking-tight">{card.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">{card.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-12">
               {/* COLUMNA IZQUIERDA: DATOS BÁSICOS */}
               <div className="lg:w-1/2 space-y-8">
                  {!editId && (
                    <button onClick={() => setStep("tipo")} className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronLeft className="w-4 h-4" /> Cambiar tipo
                    </button>
                  )}
                  
                  <div className="space-y-6">
                    <div className="flex gap-6 items-center">
                        <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 shrink-0 rounded-[1.5rem] border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer bg-muted/30 overflow-hidden relative transition-all group">
                            {uploading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            ) : form.imagen ? (
                                <img src={form.imagen} className="h-full w-full object-cover" alt="" />
                            ) : (
                                <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                        <div className="flex-1">
                            <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-2 block">Nombre del item</label>
                            <input 
                                value={form.nombre || ""} 
                                readOnly={esProductoFinal}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })} 
                                className={`w-full px-5 py-4 bg-background border border-border rounded-xl font-semibold text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${esProductoFinal ? "opacity-60 bg-muted cursor-not-allowed" : ""}`} 
                                placeholder={esProductoFinal ? "Selecciona el sabor..." : "Ej. Pulpa de fresa"} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={esMateriaPrima ? "" : "col-span-2"}>
                            <label className="text-[11px] font-bold uppercase text-muted-foreground mb-2 block tracking-widest">Unidad de medida</label>
                            <select value={form.unidad} disabled={esProductoFinal} onChange={(e) => setForm({ ...form, unidad: e.target.value })} className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-60 disabled:bg-muted">
                                <option value="Kg">Kilogramos (Kg)</option>
                                <option value="und">Unidades (Und)</option>
                                <option value="L">Litros (L)</option>
                                <option value="g">Gramos (g)</option>
                            </select>
                        </div>
                        
                        {esMateriaPrima && (
                            <div>
                                <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest mb-2 block">
                                    Costo Referencial
                                </label>
                                <div className="relative">
                                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">S/</span>
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={form.costo ?? ""} 
                                    onChange={(e) => setForm({ ...form, costo: e.target.value })} 
                                    className="w-full pl-10 pr-5 py-4 bg-background border border-border rounded-xl text-sm font-mono font-bold text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                                    placeholder="0.00"
                                  />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {esMateriaPrima && (
                      <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 mt-2">
                        <label className="text-[11px] font-bold uppercase text-amber-500 tracking-widest mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Alerta de Stock Bajo
                        </label>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-medium">Avisarme cuando el stock sea menor a:</span>
                            <div className="relative w-32">
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={form.umbralAlerta ?? 5} 
                                    onChange={(e) => setForm({ ...form, umbralAlerta: e.target.value })} 
                                    className="w-full pl-4 pr-10 py-2.5 bg-background border border-amber-500/30 rounded-xl text-sm font-mono font-bold text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-500 uppercase">{form.unidad}</span>
                            </div>
                        </div>
                      </div>
                    )}

                  </div>
               </div>

               {/* COLUMNA DERECHA: STOCK Y ESPECÍFICOS */}
               <div className="lg:w-1/2 bg-muted/30 rounded-[2rem] p-10 border border-border shadow-inner flex flex-col justify-center min-h-[350px]">
                  {esProductoFinal ? (
                    <div className="space-y-8">
                        <div className="relative">
                            <label className="text-xs font-bold uppercase text-muted-foreground mb-3 block tracking-wider font-sans">1. Sincronizar catálogo</label>
                            
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input 
                                    value={productoCatalogoSeleccionado ? productoCatalogoSeleccionado.nombre : busquedaCatalogo} 
                                    onChange={(e) => {setBusquedaCatalogo(e.target.value); if (form.catalogoId) setForm({...form, catalogoId: ""}); setShowCatalogo(true);}} 
                                    onFocus={() => setShowCatalogo(true)}
                                    placeholder="Buscar sabor..." 
                                    className="w-full h-14 pl-14 pr-6 bg-background border border-border rounded-2xl text-base font-bold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                                />
                            </div>

                            <div className="mt-3 flex justify-end">
                                <button 
                                  onClick={() => setShowModalProducto(true)}
                                  className="text-[11px] font-bold uppercase text-muted-foreground hover:text-foreground tracking-wider flex items-center gap-1.5 transition-colors bg-background hover:bg-muted px-3 py-1.5 rounded-lg border border-border"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  ¿No encuentras el sabor? Créalo aquí
                                </button>
                            </div>

                            {showCatalogo && (
                              <div className="absolute top-14 left-0 right-0 mt-3 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                {catalogoSugerido.map((p: any) => (
                                  <button key={p.id} onClick={() => {setForm({...form, catalogoId: p.id}); setShowCatalogo(false);}} className="w-full text-left px-6 py-4 hover:bg-muted flex items-center gap-4 border-b border-border last:border-0 transition-colors font-semibold text-sm text-foreground">
                                      <IceCream2 className="w-5 h-5 text-muted-foreground" /> {p.nombre}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-[0.15em] text-center flex items-center justify-center gap-2">
                                <Scale className="w-3.5 h-3.5" /> Pesos por formato (Gramos)
                            </p>
                            <div className="space-y-2">
                                {form.tamanos?.map((tam: any, index: number) => (
                                    <div key={tam.id} className="bg-background p-3 px-5 rounded-2xl border border-border flex items-center justify-between shadow-sm group hover:border-primary/30 transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Pote de</span>
                                            <span className="text-sm font-black text-foreground">{tam.nombre}</span>
                                        </div>
                                        <div className="relative w-28">
                                            <input 
                                                type="number"
                                                value={tam.capacidad ?? ""}
                                                onChange={(e) => updateSizeCapacity(index, e.target.value)}
                                                className="w-full pl-3 pr-8 py-2 bg-muted border border-border rounded-xl font-mono font-bold text-sm text-right focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">g</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="space-y-8 h-full flex flex-col justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-background rounded-2xl shadow-sm flex items-center justify-center text-foreground mx-auto border border-border mb-6">
                              <Package className="w-8 h-8" />
                            </div>
                            
                            <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-[0.2em] block font-sans mb-2">
                               Stock Actual
                            </label>
                            
                            <input 
                                type="text" 
                                value={form.stock ?? ""} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    setForm({ ...form, stock: val });
                                }} 
                                className="w-full text-center text-6xl font-extrabold bg-transparent border-none outline-none text-foreground tabular-nums tracking-tighter font-sans" 
                                placeholder="0.00"
                            />
                            <div className="text-sm font-bold text-muted-foreground uppercase">{form.unidad}</div>
                        </div>

                        {editId && esMateriaPrima && (
                            <div className="bg-background p-5 rounded-[1.5rem] border border-border shadow-sm mt-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-2 mb-4 text-foreground/80">
                                    <Calculator className="w-4 h-4" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Ingreso de Mercadería</span>
                                </div>
                                
                                <div className="flex bg-muted p-1 rounded-xl border border-border mb-4">
                                    <button 
                                        onClick={() => setAddMode("kg")} 
                                        className={cn("flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all", addMode === "kg" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                                    >
                                        Kilos / Und
                                    </button>
                                    <button 
                                        onClick={() => setAddMode("g")} 
                                        className={cn("flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all", addMode === "g" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                                    >
                                        Gramos / ml
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="number" 
                                            value={addAmount}
                                            onChange={(e) => setAddAmount(e.target.value)}
                                            placeholder="Cantidad..."
                                            className="w-full pl-4 pr-10 py-3 bg-muted border border-border rounded-xl font-mono font-bold text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors text-foreground"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">{addMode}</span>
                                    </div>
                                    <button 
                                        onClick={handleAddStock}
                                        disabled={!addAmount || Number(addAmount) <= 0}
                                        className="bg-primary text-primary-foreground px-4 rounded-xl flex items-center justify-center hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Sumar al stock actual"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>

        {/* FOOTER DEL MODAL */}
        {step === "form" && (
        <div className="p-8 border-t border-border bg-muted/30 flex justify-end items-center px-12 shrink-0">
          <div className="flex gap-6 items-center">
            <button onClick={onClose} className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mr-2">Cancelar</button>
            <button 
                onClick={handleFinalSave} 
                disabled={saving || !form.nombre || (esProductoFinal && !form.catalogoId)} 
                className="h-12 px-12 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin w-5 h-5" /> : (editId ? "Guardar cambios" : "Crear producto")}
            </button>
          </div>
        </div>
        )}
      </div>

      <ModalProducto 
        open={showModalProducto} 
        onClose={() => setShowModalProducto(false)}
        onSuccess={handleProductoCreado}
      />

    </div>,
    document.body
  );
}