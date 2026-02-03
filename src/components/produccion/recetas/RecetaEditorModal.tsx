"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { addDoc, collection, doc, onSnapshot, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import type { RecetaProduccionDoc } from "@/components/produccion/tabs/RecetasTab";

type TipoReceta = "subreceta" | "final";
type Insumo = { id: string; nombre: string };

type Props = {
  open: boolean;
  onClose: () => void;
  tipo: TipoReceta;
  initial: { id: string; data: RecetaProduccionDoc } | null;
};

type IngRow = {
  insumoId: string;
  insumoNombre: string;
  unidadUI: "kg" | "g";
  cantidadTeorica: number;
};

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

export function RecetaEditorModal({ open, onClose, tipo, initial }: Props) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      setInsumos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  const [nombre, setNombre] = useState("");
  const [batchBaseKg, setBatchBaseKg] = useState<number>(10);
  const [outputInsumoId, setOutputInsumoId] = useState<string>("");
  const [ingredientes, setIngredientes] = useState<IngRow[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr("");

    if (initial) {
      setNombre(initial.data.nombre ?? "");
      setBatchBaseKg(Number(initial.data.batchBaseKg ?? 10));
      setOutputInsumoId(initial.data.outputInsumoId ?? "");
      setIngredientes(
        (initial.data.ingredientes ?? []).map((i) => ({
          insumoId: i.insumoId,
          insumoNombre: i.insumoNombre,
          unidadUI: i.unidadUI,
          cantidadTeorica: Number(i.cantidadTeorica ?? 0),
        }))
      );
      return;
    }

    setNombre("");
    setBatchBaseKg(10);
    setOutputInsumoId("");
    setIngredientes([]);
  }, [open, initial]);

  const outputNombre = useMemo(() => insumos.find((i) => i.id === outputInsumoId)?.nombre ?? "", [insumos, outputInsumoId]);

  const canSave = useMemo(() => {
    if (!nombre.trim()) return false;
    if (!outputInsumoId) return false;
    if (ingredientes.length === 0) return false;
    if (ingredientes.some((i) => i.insumoId === outputInsumoId)) return false;
    return true;
  }, [nombre, outputInsumoId, ingredientes]);

  async function save() {
    setErr("");
    setSaving(true);
    try {
      const nombreClean = nombre.trim();
      if (!nombreClean) throw new Error("Nombre requerido.");
      if (!outputInsumoId) throw new Error("Selecciona el output (insumo).");
      if (!outputNombre) throw new Error("Output inválido.");
      if (ingredientes.length === 0) throw new Error("Agrega al menos 1 ingrediente.");
      if (ingredientes.some((i) => i.insumoId === outputInsumoId)) {
        throw new Error("El output no puede ser ingrediente de sí mismo.");
      }

      const payload: RecetaProduccionDoc = {
        nombre: nombreClean,
        tipo,
        batchBaseKg: Number(batchBaseKg || 0),
        outputInsumoId,
        outputNombre,
        ingredientes: ingredientes.map((i) => ({
          insumoId: i.insumoId,
          insumoNombre: i.insumoNombre,
          unidadUI: i.unidadUI,
          cantidadTeorica: Number(i.cantidadTeorica || 0),
        })),
        activo: true,
        updatedAt: Timestamp.now(),
        createdAt: initial?.data?.createdAt ?? Timestamp.now(),
      };

      if (initial?.id) {
        await updateDoc(doc(db, "recetas_produccion", initial.id), payload as any);
      } else {
        await addDoc(collection(db, "recetas_produccion"), payload as any);
      }

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Error guardando receta");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const insumosOrdenados = insumos.slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card text-card-foreground w-full max-w-2xl rounded-2xl shadow-2xl relative border border-border/60" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-5 right-6 text-muted-foreground hover:text-foreground transition" onClick={onClose} type="button">
          <X className="h-5 w-5" />
        </button>

        <div className="p-7">
          <h3 className="font-extrabold text-2xl text-foreground">
            {initial ? "Editar" : "Nueva"} {tipo === "subreceta" ? "sub-receta" : "receta final"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            <div>
              <div className="text-xs font-bold text-muted-foreground mb-1">Nombre</div>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground mb-1">Batch base (kg)</div>
              <input
                type="number"
                step="0.1"
                value={batchBaseKg}
                onChange={(e) => setBatchBaseKg(Number(e.target.value))}
                className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-bold text-muted-foreground mb-1">Output (insumo)</div>
            <select
              value={outputInsumoId}
              onChange={(e) => setOutputInsumoId(e.target.value)}
              className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecciona un insumo output</option>
              {insumosOrdenados.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 rounded-2xl border border-border/60 bg-muted/30 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/40 border-b border-border/60">
              <div className="col-span-6 text-xs font-extrabold text-muted-foreground">Ingrediente (insumo)</div>
              <div className="col-span-3 text-xs font-extrabold text-muted-foreground text-right">Cantidad</div>
              <div className="col-span-3 text-xs font-extrabold text-muted-foreground text-right">Unidad</div>
            </div>

            <div className="divide-y divide-border/60">
              {ingredientes.map((r, idx) => (
                <div key={`${r.insumoId}-${idx}`} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                  <div className="col-span-6 font-semibold text-foreground">{r.insumoNombre}</div>

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
                      step={r.unidadUI === "g" ? 1 : 0.1}
                      className="w-full text-right border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="col-span-3 text-right text-sm text-muted-foreground font-bold flex items-center justify-end gap-2">
                    <select
                      value={r.unidadUI}
                      onChange={(e) => {
                        const u = e.target.value as "kg" | "g";
                        setIngredientes((prev) => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], unidadUI: u };
                          return copy;
                        });
                      }}
                      className="border border-border/60 rounded-lg px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>

                    <button
                      type="button"
                      className="rounded-full p-2 border border-border/60 bg-card hover:bg-destructive/10 text-destructive transition"
                      title="Quitar ingrediente"
                      onClick={() => setIngredientes((prev) => prev.filter((_, ix) => ix !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {ingredientes.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">Aún no agregaste ingredientes.</div>
              )}
            </div>
          </div>

          <AddIngredienteRow
            insumos={insumosOrdenados}
            disabledOutputId={outputInsumoId}
            existingIds={ingredientes.map((i) => i.insumoId)}
            onAdd={(row) => setIngredientes((prev) => [...prev, row])}
          />

          {err && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{err}</div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="px-5 py-2 rounded-full font-bold border border-border/60 bg-card hover:bg-muted transition" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              type="button"
              className={cn(
                "px-6 py-2 rounded-full font-extrabold shadow-sm transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                (!canSave || saving) && "opacity-70 pointer-events-none"
              )}
              onClick={save}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddIngredienteRow({
  insumos,
  onAdd,
  existingIds,
  disabledOutputId,
}: {
  insumos: Array<{ id: string; nombre: string }>;
  onAdd: (row: { insumoId: string; insumoNombre: string; unidadUI: "kg" | "g"; cantidadTeorica: number }) => void;
  existingIds: string[];
  disabledOutputId: string;
}) {
  const [sel, setSel] = useState("");
  const [unidadUI, setUnidadUI] = useState<"kg" | "g">("kg");
  const [cantidad, setCantidad] = useState<number>(0);

  const available = useMemo(() => {
    return insumos
      .filter((i) => i.id !== disabledOutputId)
      .filter((i) => !existingIds.includes(i.id))
      .slice()
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
  }, [insumos, existingIds, disabledOutputId]);

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-card p-4">
      <div className="text-xs font-extrabold text-muted-foreground mb-2">Agregar ingrediente</div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
        <div className="md:col-span-6">
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecciona insumo</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <input
            type="number"
            step={unidadUI === "g" ? 1 : 0.1}
            min={0}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="md:col-span-2">
          <select
            value={unidadUI}
            onChange={(e) => setUnidadUI(e.target.value as any)}
            className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
          </select>
        </div>

        <div className="md:col-span-1">
          <button
            type="button"
            onClick={() => {
              if (!sel) return;
              if (!cantidad || cantidad <= 0) return;
              const ins = insumos.find((i) => i.id === sel);
              if (!ins) return;
              onAdd({ insumoId: ins.id, insumoNombre: ins.nombre, unidadUI, cantidadTeorica: Number(cantidad) });
              setSel("");
              setCantidad(0);
              setUnidadUI("kg");
            }}
            className="w-full rounded-lg px-3 py-2 text-sm font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={!sel || !cantidad || cantidad <= 0}
          >
            <Plus className="h-4 w-4 mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}