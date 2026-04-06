"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom"; // 🔥 IMPORTAMOS PORTAL 🔥
import { 
  X, Plus, Trash2, Upload, Loader2, Image as ImageIcon, 
  FlaskConical, ScrollText, AlertTriangle, Search, CheckCircle2 
} from "lucide-react";
import { addDoc, collection, doc, onSnapshot, Timestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";
import type { RecetaProduccionDoc } from "@/types/produccion";

// --- TIPOS ---
type TipoReceta = "subreceta" | "final";

type Insumo = { 
  id: string; 
  nombre: string; 
  categoria?: string;
  category?: string;
  tipo?: string;
  rubro?: string;
  [key: string]: any; 
};

// 🔥 ARREGLO 1: Hacemos que UnidadMedida acepte cualquier string para no pelear con Firebase
type UnidadMedida = "kg" | "g" | "L" | "ml" | "und" | string;

// 🔥 ARREGLO 2: Hacemos el IngRow más flexible para que empate con el Documento de Firebase
type IngRow = {
  insumoId: string;
  insumoNombre: string;
  unidad?: UnidadMedida;
  unidadUI?: UnidadMedida;
  cantidadTeorica: number;
  [key: string]: any;
};

type AddRowProps = {
  insumos: Insumo[];
  existingIds: string[];
  disabledOutputId: string;
  onAdd: (row: IngRow) => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  tipo: TipoReceta;
  initial: { id: string; data: RecetaProduccionDoc } | null;
};

export function ModalFinal({ open, onClose, tipo: initialTipo, initial }: Props) {
  // 🔥 ESTADO DE MONTAJE PARA EVITAR ERRORES DE SSR EN NEXT.JS CON PORTALS 🔥
  const [mounted, setMounted] = useState(false);

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 Efecto para activar el Portal una vez cargada la vista en el cliente 🔥
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      setInsumos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  const [nombre, setNombre] = useState("");
  const [outputInsumoId, setOutputInsumoId] = useState("");
  const [imagen, setImagen] = useState("");
  const [uploading, setUploading] = useState(false);
  const [batchBaseKg, setBatchBaseKg] = useState<number>(0); // Campo Manual
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Usamos el tipo flexible
  const [ingredientes, setIngredientes] = useState<IngRow[]>([]);
  
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr("");
    setConfirmDelete(false);
    setShowSuggestions(false);

    if (initial) {
      setNombre(initial.data.nombre ?? "");
      setOutputInsumoId(initial.data.outputInsumoId ?? "");
      setImagen(initial.data.imagen ?? "");
      setBatchBaseKg(initial.data.batchBaseKg ?? 0); // Cargamos el valor guardado
      
      setIngredientes(
        (initial.data.ingredientes ?? []).map((i: any) => ({
          insumoId: i.insumoId,
          insumoNombre: i.insumoNombre,
          unidad: i.unidad || i.unidadUI || 'kg',
          unidadUI: i.unidadUI || i.unidad || 'kg', 
          cantidadTeorica: Number(i.cantidadTeorica ?? 0),
        }))
      );
    } else {
      setNombre("");
      setOutputInsumoId("");
      setImagen("");
      setBatchBaseKg(0);
      setIngredientes([]);
    }
  }, [open, initial]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const storageRef = ref(storage, `recetas/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImagen(url);
      toast.success("Foto subida");
    } catch (error) {
      toast.error("Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

  const getCategoria = (i: Insumo) => {
    const cat = i.categoria || i.category || i.tipo || i.rubro || "Sin cat.";
    return String(cat).toLowerCase();
  };

  const sugerencias = useMemo(() => {
    if (!nombre || outputInsumoId) return [];
    const lower = nombre.toLowerCase();
    return insumos.filter(i => {
      if (!i.nombre.toLowerCase().includes(lower)) return false;
      const cat = getCategoria(i);
      if (cat.includes('materia prima') || cat.includes('comprado') || cat.includes('insumo')) return false;
      return true;
    }).slice(0, 5);
  }, [nombre, insumos, outputInsumoId]);

  const isValidSelection = useMemo(() => {
    if (!outputInsumoId) return false;
    const item = insumos.find(i => i.id === outputInsumoId);
    return item && item.nombre === nombre;
  }, [outputInsumoId, nombre, insumos]);

  const canSave = useMemo(() => {
    if (!isValidSelection) return false;
    if (ingredientes.length === 0) return false;
    if (Number(batchBaseKg) <= 0) return false;
    return true;
  }, [isValidSelection, ingredientes, batchBaseKg]);

  async function save() {
    setErr("");
    setSaving(true);
    try {
      const payload: RecetaProduccionDoc = {
        nombre: nombre.trim(),
        tipo: initialTipo, // Mantenemos el tipo original del botón
        imagen,
        batchBaseKg: Number(batchBaseKg || 0),
        outputInsumoId, 
        outputNombre: nombre.trim(),
        ingredientes: ingredientes.map((i: any) => ({
          insumoId: i.insumoId,
          insumoNombre: i.insumoNombre,
          unidad: i.unidadUI || i.unidad,
          unidadUI: i.unidadUI || i.unidad,
          cantidadTeorica: Number(i.cantidadTeorica || 0),
        })),
        activo: true,
        updatedAt: Timestamp.now(),
        createdAt: initial?.data?.createdAt ?? Timestamp.now(),
      };

      if (initial?.id) {
        await updateDoc(doc(db, "recetas_produccion", initial.id), payload as any);
        toast.success("Receta actualizada");
      } else {
        await addDoc(collection(db, "recetas_produccion"), payload as any);
        toast.success("Receta creada exitosamente");
      }
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    try {
      setSaving(true);
      await deleteDoc(doc(db, "recetas_produccion", initial.id));
      toast.success("Receta eliminada");
      onClose();
    } catch (error) {
      toast.error("Error al eliminar");
      setSaving(false);
    }
  }

  // 🔥 VALIDAMOS QUE ESTÉ MONTADO ANTES DE RENDERIZAR EL PORTAL 🔥
  if (!open || !mounted) return null;

  const insumosOrdenados = insumos.slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));

  // 🔥 SE USA CREATEPORTAL PARA ENVIAR EL MODAL DIRECTO AL BODY CON Z-[99999] 🔥
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl relative border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
          <div>
             <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
              {initial ? "Editar Fórmula" : (initialTipo === 'subreceta' ? "Nueva Sub-receta" : "Nueva Receta Maestra")}
            </h3>
            <p className="text-sm text-muted-foreground">Define cómo preparar un producto existente.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* IZQUIERDA: FORMULARIO PRINCIPAL */}
            <div className="lg:w-1/3 space-y-6">
              
              {/* IMAGEN */}
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Referencia Visual</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${imagen ? 'border-primary/50' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : imagen ? (
                    <>
                      <img src={imagen} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-bold flex items-center gap-2"><Upload className="w-4 h-4"/> Cambiar foto</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">Subir Foto</span>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>

              {/* BUSCADOR */}
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">
                    {initialTipo === 'subreceta' ? "¿Qué Intermedio vas a preparar?" : "¿Qué Base/Helado vas a preparar?"}
                  </label>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      value={nombre}
                      onChange={(e) => {
                        setNombre(e.target.value);
                        setShowSuggestions(true);
                        if (outputInsumoId && e.target.value !== nombre) setOutputInsumoId("");
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Escribe para buscar..."
                      className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:ring-2 outline-none font-bold transition-all ${isValidSelection ? "border-green-500 ring-green-100 bg-green-50/10" : "border-border focus:ring-primary/20 bg-background"}`}
                    />
                    {isValidSelection && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />}
                  </div>

                  {showSuggestions && sugerencias.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-border z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {sugerencias.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setNombre(s.nombre); setOutputInsumoId(s.id); setShowSuggestions(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 border-b border-border/50 last:border-0"
                        >
                          <span className={`w-2 h-2 rounded-full ${initialTipo === 'subreceta' ? 'bg-blue-400' : 'bg-pink-400'}`}></span>
                          <div>
                             <span className="font-medium block">{s.nombre}</span>
                             <span className="text-[9px] text-muted-foreground uppercase">{getCategoria(s)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* RENDIMIENTO MANUAL */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Rendimiento del Batch</label>
                  <div className="flex items-end gap-2">
                     <input 
                        type="number"
                        step="0.001"
                        value={batchBaseKg}
                        onChange={(e) => setBatchBaseKg(Number(e.target.value))}
                        className="w-24 bg-transparent text-3xl font-black text-foreground leading-none outline-none border-b border-dashed border-muted-foreground/30 focus:border-primary"
                     />
                     <span className="text-sm font-bold text-muted-foreground mb-1">kg</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Ingresa manualmente cuántos kilos rinde esta fórmula finalizada.</p>
                </div>
              </div>
            </div>

            {/* DERECHA: INGREDIENTES */}
            <div className="lg:w-2/3 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Formulación</label>
                <span className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground font-medium border border-border">
                  {ingredientes.length} items
                </span>
              </div>
              
              <div className="flex-1 rounded-xl border border-border bg-muted/10 overflow-hidden flex flex-col">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 border-b border-border text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  <div className="col-span-5">Ingrediente</div>
                  <div className="col-span-3 text-right">Cantidad</div>
                  <div className="col-span-2 text-center">Unidad</div>
                  <div className="col-span-2 text-right"></div>
                </div>
                
                <div className="overflow-y-auto max-h-[400px] divide-y divide-border/50 bg-background">
                  {ingredientes.map((r, idx) => (
                    <div key={`${r.insumoId}-${idx}`} className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-muted/20 transition-colors">
                      <div className="col-span-5 font-medium text-sm text-foreground truncate" title={r.insumoNombre}>{r.insumoNombre}</div>
                      
                      <div className="col-span-3">
                        <input
                          value={r.cantidadTeorica}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setIngredientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], cantidadTeorica: isNaN(v) ? 0 : v };
                              return copy;
                            });
                          }}
                          type="number"
                          placeholder="0"
                          className="w-full text-right border border-border rounded-lg px-2 py-1.5 text-sm bg-transparent focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                         <select
                            value={r.unidadUI}
                            onChange={(e) => {
                              setIngredientes((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], unidadUI: e.target.value as any };
                                return copy;
                              });
                            }}
                            className="w-full bg-muted/50 border-none rounded-lg text-xs font-bold text-center py-1.5 focus:ring-0 text-foreground cursor-pointer"
                          >
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                            <option value="und">und</option>
                          </select>
                      </div>

                      <div className="col-span-2 flex justify-end">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded p-1.5 transition-all"
                          onClick={() => setIngredientes((prev) => prev.filter((_, ix) => ix !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <AddIngredienteRow
                insumos={insumosOrdenados}
                disabledOutputId={outputInsumoId}
                existingIds={ingredientes.map((i) => i.insumoId)}
                onAdd={(row) => setIngredientes((prev) => [...prev, row])}
              />
            </div>
          </div>
          
          {err && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2 animate-in slide-in-from-bottom-2">
              <AlertTriangle className="h-4 w-4" /> {err}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
          <div>
            {initial && (
              <button 
                onClick={() => confirmDelete ? handleDelete() : setConfirmDelete(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${confirmDelete ? "bg-red-600 text-white" : "text-red-500 hover:bg-red-50"}`}
              >
                <Trash2 className="w-4 h-4" /> {confirmDelete ? "Confirmar Borrado" : "Eliminar Receta"}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-background border border-transparent hover:border-border transition-all">
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving || !canSave}
              className="px-8 py-2.5 bg-[#111827] text-white rounded-xl font-bold shadow-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
              {saving ? "Guardando..." : "Guardar Receta"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body // 🔥 DESTINO DEL PORTAL 🔥
  );
}

function AddIngredienteRow({ insumos, onAdd, existingIds, disabledOutputId }: AddRowProps) {
  const [sel, setSel] = useState("");
  const [cantidad, setCantidad] = useState<number | string>("");
  const [unidad, setUnidad] = useState<UnidadMedida>("kg");

  const available = insumos
    .filter((i) => i.id !== disabledOutputId && !existingIds.includes(i.id))
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));

  const handleAdd = () => {
      const ins = insumos.find((i) => i.id === sel);
      if(ins && Number(cantidad) > 0) {
          onAdd({ 
              insumoId: ins.id, 
              insumoNombre: ins.nombre, 
              unidadUI: unidad, 
              cantidadTeorica: Number(cantidad) 
          });
          setSel(""); 
          setCantidad("");
          setUnidad("kg");
      }
  };

  return (
    <div className="mt-3 p-2 bg-card border border-border rounded-xl flex gap-2 items-center shadow-sm">
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="flex-1 bg-transparent border-none text-sm focus:ring-0 font-medium px-2 outline-none"
      >
        <option value="">+ Añadir Insumo...</option>
        {available.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
      </select>
      
      <div className="w-px h-6 bg-border"></div>
      
      <input
        type="number"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        placeholder="Cant."
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        className="w-20 bg-transparent border-none text-sm focus:ring-0 text-right font-medium outline-none"
      />

      <select
        value={unidad as string}
        onChange={(e) => setUnidad(e.target.value as any)}
        className="bg-muted/50 rounded-lg text-xs font-bold border-none py-1.5 focus:ring-0 cursor-pointer"
      >
        <option value="kg">kg</option>
        <option value="g">g</option>
        <option value="L">L</option>
        <option value="ml">ml</option>
        <option value="und">und</option>
      </select>
      
      <button
        type="button"
        disabled={!sel || !cantidad}
        onClick={handleAdd}
        className="h-9 w-9 bg-[#111827] text-white rounded-lg flex items-center justify-center hover:bg-black disabled:opacity-50 transition-all shadow-sm active:scale-90"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}