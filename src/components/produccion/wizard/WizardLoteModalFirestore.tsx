"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { aplicarMovimientoStock, crearMovimiento } from "@/lib/produccion/firestoreStock";

type Receta = {
  nombre: string;
  tipo: "subreceta" | "final";
  batchBaseKg: number;
  outputInsumoId: string;
  outputNombre: string;
  ingredientes: Array<{ insumoId: string; insumoNombre: string; unidadUI: "kg" | "g" }>;
  activo: boolean;
};

type Insumo = { id: string; nombre: string; stock?: number };

type Props = { open: boolean; onClose: () => void; usuarioNombre: string };

type InputRow = { insumoId: string; insumoNombre: string; unidadUI: "kg" | "g"; cantidad: number };

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

function toKg(row: { unidadUI: "kg" | "g"; cantidad: number }) {
  const n = Number(row.cantidad || 0);
  return row.unidadUI === "g" ? n / 1000 : n;
}

export function WizardLoteModalFirestore({ open, onClose, usuarioNombre }: Props) {
  const [recetas, setRecetas] = useState<Array<{ id: string; data: Receta }>>([]);
  const [insumosById, setInsumosById] = useState<Record<string, Insumo>>({});

  useEffect(() => {
    const q = query(collection(db, "recetas_produccion"), where("activo", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      setRecetas(snap.docs.map((d) => ({ id: d.id, data: d.data() as Receta })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      const m: Record<string, Insumo> = {};
      snap.docs.forEach((d) => (m[d.id] = { id: d.id, ...(d.data() as any) }));
      setInsumosById(m);
    });
    return () => unsub();
  }, []);

  const [recetaId, setRecetaId] = useState<string>("");
  const receta = useMemo(() => recetas.find((r) => r.id === recetaId)?.data ?? null, [recetas, recetaId]);

  const [batchKg, setBatchKg] = useState<number>(10);
  const [outputKg, setOutputKg] = useState<number>(10);
  const [inputs, setInputs] = useState<InputRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [successId, setSuccessId] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setSuccessId("");
    if (!recetaId && recetas.length > 0) setRecetaId(recetas[0].id);
  }, [open, recetas, recetaId]);

  useEffect(() => {
    if (!receta) return;
    setBatchKg(Number(receta.batchBaseKg || 10));
    setOutputKg(Number(receta.batchBaseKg || 10));
    setInputs((receta.ingredientes ?? []).map((i) => ({ insumoId: i.insumoId, insumoNombre: i.insumoNombre, unidadUI: i.unidadUI, cantidad: 0 })));
  }, [recetaId, receta]);

  const stockIssues = useMemo(() => {
    const issues: Array<{ insumoNombre: string; need: number; have: number }> = [];
    for (const r of inputs) {
      const need = toKg(r);
      if (!need || need <= 0) continue;
      const have = Number(insumosById[r.insumoId]?.stock ?? 0);
      if (have < need) issues.push({ insumoNombre: r.insumoNombre, need, have });
    }
    return issues;
  }, [inputs, insumosById]);

  async function cerrarLote() {
    setErr("");
    setSuccessId("");
    setSaving(true);

    try {
      if (!receta || !recetaId) throw new Error("Selecciona una receta.");
      if (!receta.outputInsumoId) throw new Error("Receta inválida: falta outputInsumoId.");
      if (!outputKg || outputKg <= 0) throw new Error("Output (kg) debe ser > 0.");

      const resolvedInputs = inputs.map((r) => ({ ...r, kg: toKg(r) })).filter((r) => r.kg > 0);
      if (resolvedInputs.length === 0) throw new Error("Ingresa al menos 1 ingrediente con cantidad > 0.");
      if (stockIssues.length > 0) {
        const top = stockIssues[0];
        throw new Error(`Stock insuficiente: ${top.insumoNombre} (tienes ${top.have.toFixed(3)} kg, necesitas ${top.need.toFixed(3)} kg)`);
      }

      const outSnap = await getDoc(doc(db, "insumos", receta.outputInsumoId));
      if (!outSnap.exists()) throw new Error("El insumo output ya no existe.");

      const loteDoc = await addDoc(collection(db, "lotes_produccion"), {
        recetaId,
        recetaNombre: receta.nombre,
        tipo: receta.tipo,
        batchKg: Number(batchKg || 0),
        outputInsumoId: receta.outputInsumoId,
        outputNombre: receta.outputNombre,
        outputKg: Number(outputKg || 0),
        inputs: resolvedInputs.map((x) => ({ insumoId: x.insumoId, insumoNombre: x.insumoNombre, kg: Number(x.kg) })),
        usuarioNombre,
        createdAt: serverTimestamp(),
      });

      const loteId = loteDoc.id;
      const obsBase = `Producción: ${receta.nombre} (lote ${loteId})`;

      for (const x of resolvedInputs) {
        await aplicarMovimientoStock({ insumoId: x.insumoId, delta: -Number(x.kg) });
        await crearMovimiento({ insumoId: x.insumoId, insumoNombre: x.insumoNombre, cantidad: Number(x.kg), tipo: "salida", observacion: obsBase, usuarioNombre });
      }

      await aplicarMovimientoStock({ insumoId: receta.outputInsumoId, delta: Number(outputKg) });
      await crearMovimiento({ insumoId: receta.outputInsumoId, insumoNombre: receta.outputNombre, cantidad: Number(outputKg), tipo: "entrada", observacion: obsBase, usuarioNombre });

      setSuccessId(loteId);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div className="bg-card text-card-foreground w-full max-w-2xl rounded-2xl shadow-2xl relative border border-border/60" onClick={(e) => e.stopPropagation()}>
        <button className={cn("absolute top-5 right-6 text-muted-foreground hover:text-foreground transition", saving && "opacity-50 pointer-events-none")} onClick={onClose} type="button">
          <X className="h-5 w-5" />
        </button>

        <div className="p-7">
          <h3 className="font-extrabold text-2xl text-foreground">Nuevo lote</h3>

          {successId ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
              <div className="font-extrabold text-emerald-700 dark:text-emerald-300">Lote guardado</div>
              <div className="text-muted-foreground">
                ID: <span className="font-mono text-foreground">{successId}</span>
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" className="px-5 py-2 rounded-full font-extrabold bg-primary text-primary-foreground hover:bg-primary/90" onClick={onClose}>
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                <div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">Receta</div>
                  <select value={recetaId} onChange={(e) => setRecetaId(e.target.value)} className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" disabled={saving}>
                    {recetas
                      .slice()
                      .sort((a, b) => String(a.data.nombre).localeCompare(String(b.data.nombre), "es"))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.data.nombre} ({r.data.tipo})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs font-bold text-muted-foreground mb-1">Batch (kg)</div>
                    <input value={batchKg} onChange={(e) => setBatchKg(Number(e.target.value))} type="number" step="0.1" disabled={saving} className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-muted-foreground mb-1">Output real (kg)</div>
                    <input value={outputKg} onChange={(e) => setOutputKg(Number(e.target.value))} type="number" step="0.1" disabled={saving} className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-border/60 bg-muted/30 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/40 border-b border-border/60">
                  <div className="col-span-6 text-xs font-extrabold text-muted-foreground">Ingrediente</div>
                  <div className="col-span-3 text-xs font-extrabold text-muted-foreground text-right">Cantidad</div>
                  <div className="col-span-3 text-xs font-extrabold text-muted-foreground text-right">Unidad</div>
                </div>

                <div className="divide-y divide-border/60">
                  {inputs.map((r, idx) => (
                    <div key={r.insumoId} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                      <div className="col-span-6 font-semibold text-foreground">
                        {r.insumoNombre}
                        <div className="text-xs text-muted-foreground">Stock: {Number(insumosById[r.insumoId]?.stock ?? 0).toFixed(3)} kg</div>
                      </div>

                      <div className="col-span-3">
                        <input
                          value={r.cantidad}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setInputs((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], cantidad: isNaN(v) ? 0 : v };
                              return copy;
                            });
                          }}
                          type="number"
                          step={r.unidadUI === "g" ? 1 : 0.1}
                          disabled={saving}
                          className="w-full text-right border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="col-span-3 text-right text-sm text-muted-foreground font-bold">{r.unidadUI}</div>
                    </div>
                  ))}
                  {inputs.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">Esta receta no tiene ingredientes.</div>}
                </div>
              </div>

              {stockIssues.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                  <div className="font-extrabold">Stock insuficiente</div>
                  <div className="mt-1 text-xs">
                    Ejemplo: {stockIssues[0].insumoNombre} (tienes {stockIssues[0].have.toFixed(3)} kg, necesitas {stockIssues[0].need.toFixed(3)} kg)
                  </div>
                </div>
              )}

              {err && <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" className="px-5 py-2 rounded-full font-bold border border-border/60 bg-card hover:bg-muted transition" onClick={onClose} disabled={saving}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-6 py-2 rounded-full font-extrabold shadow-sm transition-all",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    (saving || stockIssues.length > 0) && "opacity-70 pointer-events-none"
                  )}
                  onClick={cerrarLote}
                >
                  {saving ? "Guardando..." : "Cerrar lote"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}