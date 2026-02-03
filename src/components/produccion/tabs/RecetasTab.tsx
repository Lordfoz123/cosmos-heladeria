"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, FlaskConical, Factory, ChevronDown, Loader2, X } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";

type TipoReceta = "subreceta" | "final";
type UnidadUI = "kg" | "g";

type Insumo = { id: string; nombre: string };

type IngredienteReceta = {
  insumoId: string;
  insumoNombre: string;
  unidadUI: UnidadUI;
  cantidadTeorica?: number;
};

export type RecetaProduccionDoc = {
  nombre: string;
  descripcion?: string;
  tipo: TipoReceta;
  batchBaseKg: number;

  outputInsumoId: string;
  outputNombre: string;

  ingredientes: IngredienteReceta[];

  activo: boolean;
  fotoUrl?: string | null;

  createdAt?: any;
  updatedAt?: any;
};

// TODO: reemplaza por tu auth real
const userRole = "admin";
const esAdmin = userRole === "admin" || userRole === "supervisor";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

function AddIngredienteRow({
  insumos,
  onAdd,
  existingIds,
  disabledOutputId,
}: {
  insumos: Array<{ id: string; nombre: string }>;
  onAdd: (row: { insumoId: string; insumoNombre: string; unidadUI: UnidadUI; cantidadTeorica: number }) => void;
  existingIds: string[];
  disabledOutputId: string;
}) {
  const [sel, setSel] = useState("");
  const [unidadUI, setUnidadUI] = useState<UnidadUI>("kg");
  const [cantidad, setCantidad] = useState<number>(1);

  const available = useMemo(() => {
    return insumos
      .filter((i) => !disabledOutputId || i.id !== disabledOutputId)
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
            <option value="">{available.length ? "Selecciona insumo" : "No hay insumos disponibles"}</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>

          {available.length === 0 && (
            <div className="text-xs text-muted-foreground mt-2">
              Revisa que tengas insumos creados o que no hayas agregado todos.
            </div>
          )}
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
            onChange={(e) => {
              const u = e.target.value as UnidadUI;
              setUnidadUI(u);
              setCantidad((prev) => (prev > 0 ? prev : u === "g" ? 100 : 1));
            }}
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
              setCantidad(unidadUI === "g" ? 100 : 1);
              setUnidadUI("kg");
            }}
            className="w-full rounded-lg px-3 py-2 text-sm font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            disabled={!sel || !cantidad || cantidad <= 0}
            title="Agregar"
          >
            <Plus className="h-4 w-4 mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RecetaEditorModal({
  open,
  onClose,
  tipo,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  tipo: TipoReceta;
  initial: { id: string; data: RecetaProduccionDoc } | null;
}) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [batchBaseKg, setBatchBaseKg] = useState<number>(10);
  const [outputInsumoId, setOutputInsumoId] = useState<string>("");
  const [ingredientes, setIngredientes] = useState<
    Array<{ insumoId: string; insumoNombre: string; unidadUI: UnidadUI; cantidadTeorica: number }>
  >([]);

  const [imgFile, setImgFile] = useState<string | null>(null); // base64 o url

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), (snap) => {
      setInsumos(
        snap.docs
          .map((d) => {
            const data = d.data() as any;
            return { id: d.id, nombre: String(data?.nombre ?? "").trim() };
          })
          .filter((i) => i.nombre)
      );
    });
    return () => unsub();
  }, []);

  const insumosOrdenados = useMemo(
    () => insumos.slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es")),
    [insumos]
  );

  const outputNombre = useMemo(
    () => insumosOrdenados.find((i) => i.id === outputInsumoId)?.nombre ?? "",
    [insumosOrdenados, outputInsumoId]
  );

  useEffect(() => {
    if (!open) return;
    setErr("");

    if (initial) {
      setNombre(String(initial.data.nombre ?? ""));
      setDescripcion(String(initial.data.descripcion ?? ""));
      setBatchBaseKg(Number(initial.data.batchBaseKg ?? 10));
      setOutputInsumoId(String(initial.data.outputInsumoId ?? ""));

      setIngredientes(
        (initial.data.ingredientes ?? []).map((i) => ({
          insumoId: i.insumoId,
          insumoNombre: i.insumoNombre,
          unidadUI: i.unidadUI,
          cantidadTeorica: Number(i.cantidadTeorica ?? 0),
        }))
      );

      setImgFile(initial.data.fotoUrl ?? null);
      return;
    }

    setNombre("");
    setDescripcion("");
    setBatchBaseKg(10);
    setOutputInsumoId("");
    setIngredientes([]);
    setImgFile(null);
  }, [open, initial]);

  async function subirImagenAStorage(base64: string, fileName: string): Promise<string> {
    const storage = getStorage();
    const safe = String(fileName || "receta").replace(/[^\w\-]+/g, "_");
    const ref = storageRef(storage, `recetas/${safe}-${Date.now()}.jpg`);
    await uploadString(ref, base64, "data_url");
    return await getDownloadURL(ref);
  }

  function handleImg(files: FileList | null) {
    if (!files || !files.length) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return setErr("Solo imágenes.");
    if (file.size > 2 * 1024 * 1024) return setErr("Imagen máx 2MB.");
    const reader = new FileReader();
    reader.onload = () => setImgFile(reader.result as string);
    reader.readAsDataURL(file);
  }

  const canSave = useMemo(() => {
    if (!nombre.trim()) return false;
    if (!outputInsumoId) return false;
    if (!outputNombre) return false;
    if (!Number.isFinite(Number(batchBaseKg)) || Number(batchBaseKg) <= 0) return false;
    if (ingredientes.length === 0) return false;
    if (ingredientes.some((i) => i.insumoId === outputInsumoId)) return false;
    return true;
  }, [nombre, outputInsumoId, outputNombre, batchBaseKg, ingredientes]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSaving(true);

    try {
      const nombreClean = nombre.trim();
      if (!nombreClean) throw new Error("Nombre requerido.");
      if (!outputInsumoId) throw new Error("Selecciona el output (insumo).");
      if (!outputNombre) throw new Error("Output inválido.");
      if (!Number.isFinite(Number(batchBaseKg)) || Number(batchBaseKg) <= 0) throw new Error("Batch base inválido.");
      if (ingredientes.length === 0) throw new Error("Agrega al menos 1 ingrediente.");
      if (ingredientes.some((i) => i.insumoId === outputInsumoId)) {
        throw new Error("El output no puede ser ingrediente de sí mismo.");
      }

      // Foto: si es data_url => subir a Storage; si ya es URL => conservar
      let fotoUrl: string | null = initial?.data?.fotoUrl ?? null;
      if (imgFile && imgFile.startsWith("data:image/")) {
        fotoUrl = await subirImagenAStorage(imgFile, nombreClean);
      } else if (imgFile && imgFile.startsWith("http")) {
        fotoUrl = imgFile;
      } else if (!imgFile) {
        fotoUrl = null;
      }

      const now = Timestamp.now();

      const payload: RecetaProduccionDoc = {
        nombre: nombreClean,
        descripcion: String(descripcion ?? ""),
        tipo,
        batchBaseKg: Number(batchBaseKg),

        outputInsumoId,
        outputNombre,

        ingredientes: ingredientes.map((i) => ({
          insumoId: i.insumoId,
          insumoNombre: i.insumoNombre,
          unidadUI: i.unidadUI,
          cantidadTeorica: Number(i.cantidadTeorica || 0),
        })),

        activo: true,
        fotoUrl,

        updatedAt: now,
        createdAt: initial?.data?.createdAt ?? now,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card text-card-foreground w-full max-w-2xl rounded-2xl shadow-2xl relative border border-border/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-5 right-6 text-muted-foreground hover:text-foreground transition" onClick={onClose} type="button">
          <X className="h-5 w-5" />
        </button>

        <form className="p-7" onSubmit={save}>
          <h3 className="font-extrabold text-2xl text-foreground">
            {initial ? "Editar" : "Nueva"} {tipo === "subreceta" ? "sub-receta" : "receta final"}
          </h3>

          {/* Foto */}
          <div
            className="mt-5 border-2 border-dashed rounded-2xl overflow-hidden bg-muted/30 cursor-pointer"
            style={{ aspectRatio: "4 / 3", width: "100%", maxWidth: 520 }}
            onClick={() => document.getElementById("imgFileInputReceta")?.click()}
          >
            {imgFile ? (
              <img src={imgFile} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                Click para subir foto (opcional)
              </div>
            )}
            <input
              id="imgFileInputReceta"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImg(e.target.files)}
            />
          </div>

          {/* Campos */}
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
                onChange={(e) => esAdmin ? setBatchBaseKg(Number(e.target.value)) : undefined}
                disabled={!esAdmin}
                className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              {!esAdmin && <div className="text-xs text-muted-foreground mt-1">Solo admin puede editar batch base.</div>}
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-bold text-muted-foreground mb-1">Descripción (opcional)</div>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ej: Helado de vainilla con trozos de galleta"
              />
            </div>

            <div className="md:col-span-2">
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
              <div className="text-xs text-muted-foreground mt-2">
                El output es el insumo que subirá de stock cuando produzcas un lote.
              </div>
            </div>
          </div>

          {/* Ingredientes */}
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
                          copy[idx] = { ...copy[idx], cantidadTeorica: Number.isFinite(v) ? v : 0 };
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
                        const u = e.target.value as UnidadUI;
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
            <button
              type="button"
              className="px-5 py-2 rounded-full font-bold border border-border/60 bg-card hover:bg-muted transition"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={cn(
                "px-6 py-2 rounded-full font-extrabold shadow-sm transition-all inline-flex items-center gap-2",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                (!canSave || saving) && "opacity-70 pointer-events-none"
              )}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>

          {!canSave && (
            <div className="mt-2 text-xs text-muted-foreground">
              Para guardar necesitas: nombre, output y al menos 1 ingrediente (y que el output no esté dentro de ingredientes).
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// -------- LISTADO CON CARDS --------
export function RecetasTab({ tipo }: { tipo: TipoReceta }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<{ id: string; data: RecetaProduccionDoc } | null>(null);
  const [items, setItems] = useState<Array<{ id: string; data: RecetaProduccionDoc }>>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "recetas_produccion"), where("tipo", "==", tipo), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, data: d.data() as RecetaProduccionDoc })));
    });
    return () => unsub();
  }, [tipo]);

  const activos = useMemo(() => items.filter((i) => i.data.activo !== false), [items]);
  const Icon = tipo === "subreceta" ? FlaskConical : Factory;
  const title = tipo === "subreceta" ? "Sub-recetas" : "Recetas finales";

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="bg-muted rounded-lg p-2 flex items-center justify-center">
            <Icon className="text-primary w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-foreground leading-none">{title}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Total: <b className="text-foreground">{activos.length}</b>
            </div>
          </div>
        </div>

        <button
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2 rounded-xl shadow-sm transition inline-flex items-center gap-2"
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
          type="button"
        >
          <Plus className="h-4 w-4" /> Nueva
        </button>
      </div>

      <div className="p-4 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {activos.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">Aún no hay {title.toLowerCase()}.</div>
        ) : (
          activos.map((r) => {
            const expandedThis = expanded === r.id;
            return (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-white shadow-lg shadow-neutral-200 relative flex flex-col p-0 overflow-hidden hover:shadow-xl transition"
              >
                <div className="relative w-full" style={{ aspectRatio: "4/3", background: "#f1f3f5" }}>
                  {r.data.fotoUrl ? (
                    <img src={r.data.fotoUrl} alt={r.data.nombre} className="object-cover w-full h-full" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl font-extrabold text-muted-foreground tracking-tight bg-neutral-200">
                      {r.data.nombre.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="font-bold text-lg text-foreground">{r.data.nombre}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.data.outputNombre}</div>
                    </div>

                    <span
                      className={cn(
                        "text-white font-bold rounded-full px-3 py-1 text-xs shadow",
                        r.data.tipo === "final" ? "bg-emerald-600/90" : "bg-amber-600/90"
                      )}
                    >
                      {r.data.tipo === "final" ? "Final" : "Sub-receta"}
                    </span>
                  </div>

                  {r.data.descripcion && <div className="text-sm text-muted-foreground">{r.data.descripcion}</div>}

                  <div className="flex gap-2 items-center mt-2">
                    <span className="bg-neutral-100 text-foreground font-semibold rounded-full px-2 py-0.5 text-xs">
                      Batch base: {r.data.batchBaseKg} kg
                    </span>
                    <span className="bg-neutral-100 text-foreground font-semibold rounded-full px-2 py-0.5 text-xs">
                      Ingredientes: {r.data.ingredientes?.length ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 py-1 font-bold text-xs flex items-center gap-2 shadow"
                    >
                      🏭 Nuevo lote
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="bg-card border border-border text-foreground rounded-full p-2 shadow-sm hover:bg-muted transition"
                        title="Editar"
                        onClick={() => {
                          setEdit(r);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        className="bg-card border border-border text-destructive rounded-full p-2 shadow-sm hover:bg-muted transition"
                        title="Desactivar"
                        onClick={async () => {
                          if (!confirm(`¿Desactivar "${r.data.nombre}"?`)) return;
                          await updateDoc(doc(db, "recetas_produccion", r.id), {
                            activo: false,
                            updatedAt: Timestamp.now(),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <button
                      title={expandedThis ? "Ocultar ingredientes" : "Ver ingredientes"}
                      className="text-primary px-2 py-1 rounded-full text-xs flex items-center gap-1 mt-2"
                      onClick={() => setExpanded(expandedThis ? null : r.id)}
                      type="button"
                    >
                      Ingredientes
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${expandedThis ? "rotate-180" : ""}`} />
                    </button>

                    <div
                      style={{
                        maxHeight: expandedThis ? 220 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.38s cubic-bezier(.2,1,.3,1)",
                      }}
                      className="transition-all"
                    >
                      {expandedThis && (
                        <ul className="mt-2">
                          {(r.data.ingredientes ?? []).length === 0 ? (
                            <li className="text-muted-foreground italic text-sm">Sin ingredientes.</li>
                          ) : (
                            (r.data.ingredientes ?? []).map((ing) => (
                              <li key={ing.insumoId} className="mb-1 flex gap-2 items-center">
                                <span className="font-bold text-foreground">{ing.insumoNombre}</span>
                                <span className="text-muted-foreground text-xs">({ing.unidadUI})</span>
                                <span className="text-primary text-xs ml-auto">
                                  {Number(ing.cantidadTeorica ?? 0)} {ing.unidadUI}
                                </span>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <RecetaEditorModal open={open} onClose={() => setOpen(false)} tipo={tipo} initial={edit} />
    </section>
  );
}