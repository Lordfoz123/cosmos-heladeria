"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom"; // 🔥 IMPORTAMOS PORTAL 🔥
import { X, Plus, Trash2, Upload, Loader2, Image as ImageIcon, FlaskConical, ScrollText, AlertTriangle, Save } from "lucide-react";
import { addDoc, collection, doc, onSnapshot, Timestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";

// --- TIPOS ---
export type TipoReceta = "subreceta" | "final";

interface Insumo { 
  id: string; 
  nombre: string; 
}

interface IngRow {
  insumoId: string;
  insumoNombre: string;
  unidadUI: "kg" | "g";
  cantidadTeorica: number;
  cantidadEnBaseKg: number;
}

type Props = {
  open: boolean;
  onClose: () => void;
  tipo: TipoReceta;
  initial: any;
};

export function ModalFinal({ open, onClose, tipo: initialTipo, initial }: Props) {
  // 🔥 ESTADO DE MONTAJE PARA EVITAR ERRORES DE SSR EN NEXT.JS CON PORTALS 🔥
  const [mounted, setMounted] = useState(false);

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Efecto para activar el Portal una vez cargada la vista
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
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoReceta>(initialTipo);
  const [imagen, setImagen] = useState("");
  const [batchBaseKg, setBatchBaseKg] = useState<number>(10);
  const [outputInsumoId, setOutputInsumoId] = useState<string>(""); 
  const [ingredientes, setIngredientes] = useState<IngRow[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);

    if (initial) {
      const d = initial.data;
      setNombre(d.nombre ?? "");
      setTipoSeleccionado(d.tipo ?? initialTipo);
      setImagen(d.imagen ?? "");
      setBatchBaseKg(Number(d.batchBaseKg ?? 10));
      setOutputInsumoId(d.outputInsumoId ?? "");
      
      setIngredientes(
        (d.ingredientes ?? []).map((i: any) => ({
          insumoId: i.insumoId,
          insumoNombre: i.insumoNombre,
          unidadUI: i.unidadUI || "kg",
          cantidadTeorica: Number(i.cantidadTeorica ?? 0),
          cantidadEnBaseKg: i.cantidadEnBaseKg ?? (i.unidadUI === "g" ? Number(i.cantidadTeorica || 0) / 1000 : Number(i.cantidadTeorica || 0)),
        }))
      );
    } else {
      setNombre("");
      setTipoSeleccionado(initialTipo);
      setImagen("");
      setBatchBaseKg(10);
      setOutputInsumoId("");
      setIngredientes([]);
    }
  }, [open, initial, initialTipo]);

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

  const canSave = useMemo(() => {
    if (!nombre.trim()) return false;
    if (!outputInsumoId) return false;
    if (ingredientes.length === 0) return false;
    return true;
  }, [nombre, outputInsumoId, ingredientes]);

  async function handleSave() {
    setSaving(true);
    try {
      const nombreOutput = insumos.find((i) => i.id === outputInsumoId)?.nombre ?? "";
      
      const ingredientesProcesados = ingredientes.map((i) => {
        const conversion = i.unidadUI === "g" ? Number(i.cantidadTeorica || 0) / 1000 : Number(i.cantidadTeorica || 0);
        return {
          ...i,
          cantidadTeorica: Number(i.cantidadTeorica || 0),
          cantidadEnBaseKg: conversion
        };
      });

      const payload = {
        nombre: nombre.trim(),
        tipo: tipoSeleccionado,
        imagen,
        batchBaseKg: Number(batchBaseKg || 0),
        outputInsumoId,
        outputNombre: nombreOutput,
        ingredientes: ingredientesProcesados,
        activo: true,
        updatedAt: Timestamp.now(),
        ...(initial ? {} : { createdAt: Timestamp.now() }) 
      };

      if (initial?.id) {
        await updateDoc(doc(db, "recetas_produccion", initial.id), payload);
        toast.success("Receta actualizada");
      } else {
        await addDoc(collection(db, "recetas_produccion"), payload);
        toast.success("Receta creada");
      }
      onClose();
    } catch (e) {
      console.error("❌ ERROR AL GUARDAR:", e);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "recetas_produccion", initial.id));
      toast.success("Receta eliminada");
      onClose();
    } catch (error) {
      toast.error("Error al eliminar");
    } finally {
      setSaving(false);
    }
  }

  // 🔥 CONDICIÓN APLICADA CON MONTAJE PARA PORTAL 🔥
  if (!open || !mounted) return null;
  const insumosOrdenados = [...insumos].sort((a, b) => a.nombre.localeCompare(b.nombre));

  // 🔥 SE USA CREATEPORTAL PARA TELETRANSPORTAR AL <body> 🔥
  // 🔥 SE USA z-[99999] PARA ASEGURAR QUE QUEDE ENCIMA DE TODO 🔥
  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl relative border border-border flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/5">
          <div>
             <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
              {initial ? "Editar Fórmula" : "Nueva Fórmula"}
            </h3>
            <p className="text-xs text-muted-foreground">Define los parámetros técnicos de producción.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="flex gap-4 mb-8 p-1 bg-muted/30 rounded-xl w-fit border border-border/50">
             <button type="button" onClick={() => setTipoSeleccionado('subreceta')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tipoSeleccionado === 'subreceta' ? 'bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <FlaskConical className="w-4 h-4"/> Base / Intermedio
             </button>
             <button type="button" onClick={() => setTipoSeleccionado('final')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tipoSeleccionado === 'final' ? 'bg-pink-100 text-pink-700 shadow-sm ring-1 ring-pink-200' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <ScrollText className="w-4 h-4"/> Receta Maestra
             </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3 space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-2 block">Referencia Visual</label>
                <div onClick={() => fileInputRef.current?.click()} className={`relative w-full aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group ${imagen ? 'border-primary/50' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}>
                  {uploading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : imagen ? <><img src={imagen} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]"><p className="text-white text-xs font-bold flex items-center gap-2"><Upload className="w-4 h-4"/> Cambiar</p></div></> : <div className="text-center p-4"><div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2"><ImageIcon className="w-6 h-6 text-muted-foreground" /></div><span className="text-xs font-bold text-muted-foreground uppercase">Subir Foto</span></div>}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase">Nombre Técnico</label>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Ej. Base Blanca 2.0" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase">Batch (kg)</label>
                    <input type="number" step="0.1" value={batchBaseKg} onChange={(e) => setBatchBaseKg(Number(e.target.value))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase">Output (Stock)</label>
                    <select value={outputInsumoId} onChange={(e) => setOutputInsumoId(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer">
                      <option value="">Seleccionar...</option>
                      {insumosOrdenados.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-2/3 flex flex-col h-full bg-muted/10 rounded-2xl border border-border p-1">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <label className="text-xs font-bold uppercase text-foreground flex items-center gap-2"><FlaskConical className="w-3.5 h-3.5"/> Formulación</label>
                <span className="text-[10px] bg-white border px-2 py-0.5 rounded-full text-muted-foreground font-bold shadow-sm">{ingredientes.length} items</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/30 sticky top-0 z-10 text-[10px] font-bold uppercase text-muted-foreground">
                        <tr><th className="px-4 py-2">Ingrediente</th><th className="px-4 py-2 text-right">Cantidad</th><th className="px-4 py-2 w-10"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {ingredientes.map((ing, idx) => (
                            <tr key={idx} className="group hover:bg-white transition-colors">
                                <td className="px-4 py-2 text-sm font-medium text-foreground">{ing.insumoNombre}</td>
                                <td className="px-4 py-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <input
                                            type="number"
                                            value={ing.cantidadTeorica}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                const copy = [...ingredientes];
                                                copy[idx].cantidadTeorica = v;
                                                copy[idx].cantidadEnBaseKg = copy[idx].unidadUI === "g" ? v / 1000 : v;
                                                setIngredientes(copy);
                                            }}
                                            className="w-20 text-right bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none font-mono text-sm"
                                        />
                                        <select
                                            value={ing.unidadUI}
                                            onChange={(e) => {
                                                const u = e.target.value as "kg"|"g";
                                                const copy = [...ingredientes];
                                                copy[idx].unidadUI = u;
                                                copy[idx].cantidadEnBaseKg = u === "g" ? Number(copy[idx].cantidadTeorica || 0) / 1000 : Number(copy[idx].cantidadTeorica || 0);
                                                setIngredientes(copy);
                                            }}
                                            className="text-xs bg-transparent font-bold text-muted-foreground outline-none cursor-pointer"
                                        >
                                            <option value="kg">kg</option>
                                            <option value="g">g</option>
                                        </select>
                                    </div>
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button onClick={() => setIngredientes(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-border bg-white rounded-b-xl">
                 <AddIngredienteRow insumos={insumosOrdenados} existingIds={ingredientes.map(i => i.insumoId)} disabledOutputId={outputInsumoId} onAdd={(row) => setIngredientes([...ingredientes, row])} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/5 flex justify-between items-center gap-3 px-8">
          <div>{initial && (confirmDelete ? <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-in fade-in slide-in-from-left-2"><span className="text-[10px] font-bold text-red-600 uppercase">¿Seguro?</span><button onClick={handleDelete} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold">Sí</button><button onClick={() => setConfirmDelete(false)} className="px-3 py-1 bg-white border text-xs font-bold">No</button></div> : <button onClick={() => setConfirmDelete(true)} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition flex items-center gap-2 text-xs font-bold"><Trash2 className="w-4 h-4" /> Eliminar</button>)}</div>
          <div className="flex gap-3"><button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Cancelar</button><button onClick={handleSave} disabled={saving || !canSave} className="px-8 py-2.5 bg-[#111827] text-white rounded-xl font-bold shadow-lg disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 text-sm">{saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}{saving ? "Guardando..." : "Guardar Fórmula"}</button></div>
        </div>
      </div>
    </div>,
    document.body // 🔥 Destino del Portal 🔥
  );
}

function AddIngredienteRow({ insumos, onAdd, existingIds, disabledOutputId }: { insumos: Insumo[], onAdd: (row: IngRow) => void, existingIds: string[], disabledOutputId: string }) {
  const [sel, setSel] = useState("");
  const [cantidad, setCantidad] = useState<number>(0);
  const [unidad, setUnidad] = useState<"kg" | "g">("kg"); 

  const available = insumos.filter((i) => i.id !== disabledOutputId && !existingIds.includes(i.id));

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1 relative">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none font-medium text-foreground cursor-pointer hover:bg-muted/50 transition-colors">
            <option value="">+ Seleccionar insumo...</option>
            {available.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
      </div>
      <div className="w-32 relative flex gap-1">
        <input type="number" value={cantidad || ''} onChange={(e) => setCantidad(Number(e.target.value))} placeholder="0.00" className="w-full bg-muted/30 border border-border rounded-lg pl-3 pr-2 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono text-right" />
        <select value={unidad} onChange={(e) => setUnidad(e.target.value as "kg"|"g")} className="text-[10px] font-bold bg-transparent outline-none cursor-pointer">
            <option value="kg">kg</option><option value="g">g</option>
        </select>
      </div>
      <button type="button" disabled={!sel || !cantidad} onClick={() => {
          const ins = insumos.find((i) => i.id === sel);
          if(ins) {
            onAdd({ 
              insumoId: ins.id, 
              insumoNombre: ins.nombre, 
              unidadUI: unidad, 
              cantidadTeorica: cantidad,
              cantidadEnBaseKg: unidad === "g" ? cantidad / 1000 : cantidad
            });
          }
          setSel(""); setCantidad(0);
        }} className="h-9 w-9 bg-[#111827] text-white rounded-lg flex items-center justify-center hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"><Plus className="h-4 w-4" /></button>
    </div>
  );
}