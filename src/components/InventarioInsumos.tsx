"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Insumo } from "@/types/inventario";
import {
  PackagePlus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  AlertTriangle,
  Plus,
  ChevronLeft,
} from "lucide-react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

// Solo KG y Gramos
const UNIDADES = ["Kg", "Gramos"] as const;
type Unidad = (typeof UNIDADES)[number];

type InsumoTipo = "comprado" | "intermedio" | "final";
type TabTipo = "todos" | InsumoTipo;

const TIPO_CARDS: Array<{
  value: InsumoTipo;
  title: string;
  desc: string;
  imageUrl: string; // 4:3
}> = [
  {
    value: "comprado",
    title: "Materia prima",
    desc: "Se compra. Tiene costo de compra.",
    imageUrl: "/images/insumos/tipo-comprado-4x3.webp",
  },
  {
    value: "intermedio",
    title: "Base / Intermedio (lo preparo)",
    desc: "Se prepara en cocina. Costo se calcula al producir.",
    imageUrl: "/images/insumos/tipo-intermedio-4x3.webp",
  },
  {
    value: "final",
    title: "Producto final",
    desc: "Resultado final. Costo se calcula al producir.",
    imageUrl: "/images/insumos/tipo-final-4x3.webp",
  },
];

// Umbral stock bajo
const LOW_STOCK_THRESHOLD = 5;

const usuarioActual = "usuario demo"; // Cambia por auth real

function LoadingSpinner({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="w-full flex justify-center items-center py-6">
      <Loader2 className="animate-spin mr-3 text-primary" size={22} />
      <span className="text-foreground font-semibold text-base">{text}</span>
    </div>
  );
}

function toNumberOrNull(v: any): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(n: number) {
  return Number(n).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function labelTipo(t?: InsumoTipo) {
  if (t === "comprado") return "Materia prima";
  if (t === "intermedio") return "Intermedio";
  if (t === "final") return "Final";
  return "—";
}

function labelTab(t: TabTipo) {
  if (t === "todos") return "Todos";
  if (t === "comprado") return "Materia prima";
  if (t === "intermedio") return "Intermedios";
  return "Finales";
}

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

type FormState = {
  nombre: string;
  unidad: Unidad;
  stock: number;
  costo: number;
  tipo: InsumoTipo;
};

function buildEmptyForm(tipo: InsumoTipo): FormState {
  return {
    nombre: "",
    unidad: "Kg",
    stock: 0,
    costo: tipo === "comprado" ? 0 : 0,
    tipo,
  };
}

type Step = "tipo" | "form";

function WizardInsumoModal({
  open,
  onClose,
  editId,
  initial,
  onSave,
  saving,
  startStep = "tipo",
}: {
  open: boolean;
  onClose: () => void;
  editId: string | null;
  initial: FormState | null;
  onSave: (payload: FormState, editId: string | null) => Promise<void>;
  saving: boolean;
  startStep?: Step;
}) {
  const [step, setStep] = useState<Step>(startStep);
  const [form, setForm] = useState<FormState>(initial ?? buildEmptyForm("comprado"));

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm(initial);
      setStep("form");
    } else {
      setForm(buildEmptyForm("comprado"));
      setStep(startStep);
    }
  }, [open, initial, startStep]);

  if (!open) return null;

  const costoDisabled = form.tipo !== "comprado";
  const stockDisabled = form.tipo !== "comprado";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground w-full max-w-2xl rounded-2xl shadow-2xl relative border border-border/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-5 right-6 text-muted-foreground hover:text-foreground transition"
          onClick={onClose}
          type="button"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-7">
          <h3 className="font-extrabold text-2xl text-foreground">
            {editId ? "Editar insumo" : "Nuevo insumo"}
          </h3>

          {/* STEP 1: Tipo */}
          {step === "tipo" && !editId && (
            <div className="mt-6">
              <div className="text-sm text-muted-foreground">
                Elige el tipo para mostrar el formulario correcto (y evitar confusión con el costo y stock).
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {TIPO_CARDS.map((t) => {
                  const active = form.tipo === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          tipo: t.value,
                          costo: t.value === "comprado" ? f.costo : 0,
                        }));
                        setStep("form");
                      }}
                      className={cn(
                        "text-left rounded-2xl border overflow-hidden transition",
                        "hover:bg-muted/20",
                        active ? "border-primary bg-primary/5" : "border-border/60 bg-card"
                      )}
                    >
                      <div className="w-full bg-muted/30">
                        <div className="relative w-full" style={{ aspectRatio: "4 / 3" as any }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.imageUrl}
                            alt={t.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="font-extrabold text-sm text-foreground">{t.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="px-5 py-2 rounded-full font-bold border border-border/60 bg-card hover:bg-muted transition"
                  onClick={onClose}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Form */}
          {step === "form" && (
            <div className="mt-6">
              {!editId && (
                <div className="mb-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border transition",
                      "border-border/60 bg-card hover:bg-muted"
                    )}
                    onClick={() => setStep("tipo")}
                    disabled={saving}
                    title="Cambiar tipo"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Tipo
                  </button>
                  <div className="text-sm text-muted-foreground">
                    Tipo: <b className="text-foreground">{labelTipo(form.tipo)}</b>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">Nombre</div>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={saving}
                  />
                </div>

                <div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">Unidad</div>
                  <select
                    value={form.unidad}
                    onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value as Unidad }))}
                    className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={saving}
                  >
                    {UNIDADES.map((u) => (
                      <option value={u} key={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-muted-foreground mt-2">
                    Solo manejamos Kg/Gramos para evitar errores.
                  </div>
                </div>

                {/* Stock */}
                <div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">Stock</div>
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                    className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={saving || stockDisabled}
                  />
                  {stockDisabled && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Se actualiza en Producción
                    </div>
                  )}
                </div>

                {/* Costo */}
                <div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">
                    Costo {form.tipo === "comprado" ? "(compra)" : "(auto)"}
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.costo}
                    onChange={(e) => setForm((f) => ({ ...f, costo: Number(e.target.value) }))}
                    className={cn(
                      "w-full border border-border/60 rounded-lg px-3 py-2 text-sm",
                      "bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                      costoDisabled && "opacity-60"
                    )}
                    disabled={saving || costoDisabled}
                  />
                  {costoDisabled && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Se calcula en Producción
                    </div>
                  )}
                </div>
              </div>

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
                  type="button"
                  className={cn(
                    "px-6 py-2 rounded-full font-extrabold shadow-sm transition-all",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    saving && "opacity-70 pointer-events-none"
                  )}
                  onClick={async () => {
                    await onSave(form, editId);
                  }}
                >
                  {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InventarioInsumos() {
  const [insumos, setInsumos] = useState<Array<Insumo & { tipo?: InsumoTipo }>>([]);
  const [cargando, setCargando] = useState(true);

  const [guardando, setGuardando] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [ajustesStock, setAjustesStock] = useState<Record<string, number | "">>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [modalInitial, setModalInitial] = useState<FormState | null>(null);

  const [tabTipo, setTabTipo] = useState<TabTipo>("todos");

  const [busqueda, setBusqueda] = useState("");
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [orden, setOrden] = useState<"nombre_asc" | "stock_asc" | "stock_desc">("nombre_asc");

  useEffect(() => {
    setCargando(true);
    const unsub = onSnapshot(collection(db, "insumos"), (snapshot) => {
      setInsumos(
        snapshot.docs.map((d) => ({
          ...(d.data() as any),
          id: d.id,
        }))
      );
      setCargando(false);
    });
    return () => unsub();
  }, []);

  function openCreate() {
    setEditId(null);
    setModalInitial(null);
    setModalOpen(true);
  }

  function openEdit(i: Insumo & { tipo?: InsumoTipo }) {
    setEditId(i.id as string);
    setModalInitial({
      nombre: String(i.nombre || ""),
      unidad: (UNIDADES.includes(i.unidad as any) ? i.unidad : "Kg") as Unidad,
      stock: Number(i.stock || 0),
      costo: Number(i.costo || 0),
      tipo: (i.tipo ?? "comprado") as InsumoTipo,
    });
    setModalOpen(true);
  }

  async function registrarMovimiento(payload: {
    insumoId: string;
    insumoNombre: string;
    cantidad: number;
    tipo: "creacion" | "edicion" | "eliminacion" | "entrada" | "salida";
    observacion: string;
  }) {
    await addDoc(collection(db, "movimientos"), {
      fecha: Timestamp.now(),
      insumoId: payload.insumoId,
      insumoNombre: payload.insumoNombre,
      cantidad: payload.cantidad,
      tipo: payload.tipo,
      usuarioNombre: usuarioActual,
      observacion: payload.observacion,
    });
  }

  async function saveFromModal(payload: FormState, editIdLocal: string | null): Promise<void> {
    if (guardando) return;

    const nombre = payload.nombre.trim();
    if (!nombre) {
      toast.error("Ingresa el nombre del insumo.");
      return;
    }
    if (!UNIDADES.includes(payload.unidad)) {
      toast.error("Unidad inválida. Usa Kg o Gramos.");
      return;
    }
    if (!Number.isFinite(payload.stock) || payload.stock < 0) {
      toast.error("Stock inválido.");
      return;
    }

    const costoNum = toNumberOrNull(payload.costo);
    if (payload.tipo === "comprado") {
      if (costoNum === null || costoNum < 0) {
        toast.error("Costo inválido.");
        return;
      }
    }

    const costoFinal = payload.tipo === "comprado" ? Number(costoNum || 0) : 0;

    const docPayload = {
      nombre,
      unidad: payload.unidad,
      stock: Number(payload.stock || 0),
      costo: costoFinal,
      tipo: payload.tipo,
    };

    try {
      setGuardando(true);

      if (editIdLocal) {
        await updateDoc(doc(db, "insumos", editIdLocal), docPayload as any);
        await registrarMovimiento({
          insumoId: editIdLocal,
          insumoNombre: nombre,
          cantidad: 0,
          tipo: "edicion",
          observacion: "Edición de insumo",
        });
        toast.success("Insumo actualizado.");
      } else {
        const docRef = await addDoc(collection(db, "insumos"), docPayload as any);
        await registrarMovimiento({
          insumoId: docRef.id,
          insumoNombre: nombre,
          cantidad: docPayload.stock,
          tipo: "creacion",
          observacion: "Nuevo insumo creado",
        });
        toast.success("Insumo agregado.");
      }

      setModalOpen(false);
      setEditId(null);
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error al guardar. Revisa consola.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleDelete(id: string) {
    if (borrandoId) return;

    const insumo = insumos.find((i) => i.id === id);
    if (!insumo) return;

    setBorrandoId(id);

    const snapshotForUndo = { ...insumo };
    const toastId = toast.custom(
      (t) => (
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border shadow-xl bg-card text-card-foreground border-destructive/25">
          <div className="flex items-start gap-3 p-4">
            <div className="mt-0.5">
              <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-destructive">Insumo eliminado</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                “{snapshotForUndo.nombre}”. Puedes deshacer durante 5s.
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, "insumos", snapshotForUndo.id as string), snapshotForUndo as any);
                      toast.dismiss(t.id);
                      toast.success("Deshacer: insumo restaurado.");
                    } catch {
                      try {
                        await addDoc(collection(db, "insumos"), {
                          nombre: snapshotForUndo.nombre,
                          unidad: snapshotForUndo.unidad,
                          stock: snapshotForUndo.stock,
                          costo: snapshotForUndo.costo,
                          tipo: (snapshotForUndo as any).tipo ?? "comprado",
                        } as any);
                        toast.dismiss(t.id);
                        toast.success("Deshacer: insumo restaurado (nuevo ID).");
                      } catch (e) {
                        console.error(e);
                        toast.error("No se pudo deshacer.");
                      }
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition"
                >
                  Deshacer
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold bg-muted text-foreground hover:bg-muted/80 transition border border-border/60"
                >
                  Ok
                </button>
              </div>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground px-2"
              aria-label="Cerrar"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      ),
      { duration: 5000 }
    );

    try {
      await deleteDoc(doc(db, "insumos", id));
      await registrarMovimiento({
        insumoId: id,
        insumoNombre: insumo.nombre ?? "",
        cantidad: 0,
        tipo: "eliminacion",
        observacion: "Insumo eliminado",
      });
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Error al eliminar insumo.");
    } finally {
      setBorrandoId(null);
    }
  }

  // Solo, suma/resta stock si es "comprado"
  async function handleSumaResta(id: string, delta: number, stockActual: number) {
    const insumo = insumos.find((i) => i.id === id);
    if (!insumo || (insumo.tipo !== "comprado" && insumo.tipo !== undefined)) return; // solo comprado
    try {
      await updateDoc(doc(db, "insumos", id), {
        stock: Math.max(0, stockActual + delta),
      });
      await registrarMovimiento({
        insumoId: id,
        insumoNombre: insumo.nombre ?? "",
        cantidad: Math.abs(delta),
        tipo: delta > 0 ? "entrada" : "salida",
        observacion: delta > 0 ? "Ingreso de stock" : "Salida de stock",
      });
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar el stock.");
    }
  }

  async function handleAplicarAjuste(id: string, stockActual: number) {
    const insumo = insumos.find((i) => i.id === id);
    if (!insumo || (insumo.tipo !== "comprado" && insumo.tipo !== undefined)) return;
    const delta = ajustesStock[id];
    if (delta === "" || delta === undefined) {
      toast.error("Ingresa un ajuste (ej: 5 o -3).");
      return;
    }
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) {
      toast.error("El ajuste debe ser un número distinto de 0.");
      return;
    }
    await handleSumaResta(id, n, stockActual);
    setAjustesStock((prev) => ({ ...prev, [id]: "" }));
    toast.success("Stock actualizado.");
  }

  const insumosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let list = insumos.filter((i) => {
      const tipoI: InsumoTipo = ((i as any).tipo ?? "comprado") as InsumoTipo;
      const okTipo = tabTipo === "todos" ? true : tipoI === tabTipo;
      const okBusqueda = q ? (i.nombre ?? "").toLowerCase().includes(q) : true;
      const okLow = soloStockBajo ? Number(i.stock) <= LOW_STOCK_THRESHOLD : true;
      return okTipo && okBusqueda && okLow;
    });

    list.sort((a, b) => {
      if (orden === "nombre_asc") return (a.nombre ?? "").localeCompare(b.nombre ?? "");
      if (orden === "stock_asc") return Number(a.stock) - Number(b.stock);
      return Number(b.stock) - Number(a.stock);
    });

    return list;
  }, [insumos, busqueda, soloStockBajo, orden, tabTipo]);

  const tabs: Array<{ key: TabTipo; label: string }> = [
    { key: "todos", label: "Todos" },
    { key: "comprado", label: "Materia prima" },
    { key: "intermedio", label: "Intermedios" },
    { key: "final", label: "Finales" },
  ];

  return (
    <Card className="mb-10 bg-card text-card-foreground border border-border/60">
      <CardHeader className="flex flex-col items-center pb-2 gap-2">
        <div className="bg-primary/20 border border-primary/25 rounded-lg p-2 mx-auto flex items-center justify-center">
          <PackagePlus className="w-6 h-6 text-white" />
        </div>

        <CardTitle className="text-2xl md:text-3xl font-bold text-foreground leading-none text-center mb-0">
          Insumos globales
        </CardTitle>

        <div className="text-muted-foreground text-sm text-center mt-1 mb-2">
          Administra insumos por tipo. Marca stock bajo para priorizar compras.
        </div>

        <div className="w-full flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2 rounded-full shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo insumo
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <WizardInsumoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          editId={editId}
          initial={modalInitial}
          onSave={saveFromModal}
          saving={guardando}
          startStep="tipo"
        />

        {cargando ? (
          <LoadingSpinner text="Cargando insumos..." />
        ) : (
          <>
            {/* Tabs tipo */}
            <div className="flex flex-wrap gap-2 mb-3">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTabTipo(t.key)}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm font-extrabold border transition",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    tabTipo === t.key
                      ? "bg-primary/15 text-foreground border-primary/25"
                      : "bg-card text-muted-foreground border-border/60 hover:bg-muted"
                  )}
                  title={t.label}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Barra de búsqueda + filtros */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={`Buscar en: ${labelTab(tabTipo)}...`}
                  className="w-full border border-border rounded-lg pl-10 pr-10 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                    title="Limpiar"
                  >
                    <X size={16} className="text-muted-foreground" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoloStockBajo((v) => !v)}
                  className={[
                    "px-3 py-2 rounded-lg text-sm font-bold border transition",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    soloStockBajo
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-card text-foreground border-border hover:bg-muted",
                  ].join(" ")}
                  title={`Stock bajo: <= ${LOW_STOCK_THRESHOLD}`}
                >
                  Stock bajo
                </button>

                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as any)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  title="Ordenar"
                >
                  <option value="nombre_asc">Nombre A–Z</option>
                  <option value="stock_asc">Stock ↑</option>
                  <option value="stock_desc">Stock ↓</option>
                </select>
              </div>
            </div>

            {/* Tabla */}
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-sm bg-card">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="py-2 px-2 text-left font-semibold text-muted-foreground">Nombre</th>
                    <th className="py-2 px-2 text-left font-semibold text-muted-foreground">Unidad</th>
                    <th className="py-2 px-2 text-center font-semibold text-muted-foreground">Stock</th>
                    <th className="py-2 px-2 text-right font-semibold text-muted-foreground">Costo</th>
                    <th className="py-2 px-2 text-center font-semibold text-muted-foreground">Acciones</th>
                  </tr>
                </thead>

                <AnimatePresence initial={false}>
                  <tbody>
                    {insumosFiltrados.length === 0 && (
                      <motion.tr
                        initial={{ opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.35, type: "spring", damping: 18, stiffness: 120 }}
                      >
                        <td colSpan={5} className="p-4 text-center text-muted-foreground italic">
                          {insumos.length === 0
                            ? "Todavía no has agregado ningún insumo"
                            : "No hay resultados con esos filtros"}
                        </td>
                      </motion.tr>
                    )}

                    {insumosFiltrados.map((i) => {
                      const stockNum = Number(i.stock) || 0;
                      const isZero = stockNum === 0;
                      const isLow = stockNum > 0 && stockNum <= LOW_STOCK_THRESHOLD;
                      const isComprado = (i.tipo ?? "comprado") === "comprado";

                      return (
                        <motion.tr
                          key={i.id}
                          layout
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97, y: 18 }}
                          transition={{ duration: 0.38, type: "spring", damping: 18, stiffness: 134 }}
                          className="border-b border-border/60 last:border-b-0"
                        >
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{i.nombre}</span>
                              {isZero && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/20">
                                  Sin stock
                                </span>
                              )}
                              {isLow && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Bajo
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2 px-2 text-muted-foreground">{i.unidad}</td>

                          <td className="py-2 px-2 text-center font-mono">
                            <div className="flex items-center justify-center gap-1">
                              <span className="inline-block text-base font-semibold min-w-10 text-center text-foreground">
                                {stockNum}
                              </span>
                              <motion.button
                                type="button"
                                whileHover={isComprado ? { scale: 1.12 } : undefined}
                                whileTap={isComprado ? { scale: 0.93 } : undefined}
                                className="ml-1 px-2 py-0.5 text-base rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold transition border border-emerald-500/20"
                                title="Sumar +1"
                                onClick={() => isComprado && handleSumaResta(i.id as string, 1, stockNum)}
                                disabled={!isComprado}
                              >
                                +
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={isComprado ? { scale: 1.12 } : undefined}
                                whileTap={isComprado ? { scale: 0.93 } : undefined}
                                className="px-2 py-0.5 text-base rounded bg-destructive/15 text-destructive hover:bg-destructive/20 font-bold transition border border-destructive/20"
                                title="Restar -1"
                                onClick={() => isComprado && handleSumaResta(i.id as string, -1, stockNum)}
                                disabled={!isComprado}
                              >
                                -
                              </motion.button>
                            </div>
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <input
                                value={ajustesStock[i.id as string] ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "") return setAjustesStock((p) => ({ ...p, [i.id as string]: "" }));
                                  const n = Number(v);
                                  if (!Number.isFinite(n)) return;
                                  setAjustesStock((p) => ({ ...p, [i.id as string]: n }));
                                }}
                                placeholder="+/-"
                                className="w-16 border border-border rounded-lg px-2 py-1 text-xs bg-background text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                inputMode="numeric"
                                disabled={!isComprado}
                              />
                              <button
                                type="button"
                                onClick={() => isComprado && handleAplicarAjuste(i.id as string, stockNum)}
                                className="px-2 py-1 text-xs font-bold rounded-lg bg-primary/15 text-foreground hover:bg-primary/20 transition border border-primary/20 focus:outline-none focus:ring-2 focus:ring-ring"
                                disabled={!isComprado}
                              >
                                Aplicar
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-semibold text-foreground">
                            <span>S/</span>
                            {formatMoney(Number(i.costo) || 0)}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex gap-2 justify-center items-center">
                              <motion.button
                                whileHover={{ scale: 1.12, rotate: 8 }}
                                whileTap={{ scale: 0.92, rotate: -4 }}
                                className={[
                                  "text-muted-foreground hover:text-foreground",
                                  "hover:bg-muted p-1.5 rounded-lg",
                                  "border border-transparent hover:border-border/60",
                                  "focus:outline-none focus:ring-2 focus:ring-ring",
                                ].join(" ")}
                                title="Editar"
                                onClick={() => openEdit(i as any)}
                                type="button"
                              >
                                <Pencil className="w-5 h-5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.12, rotate: -10 }}
                                whileTap={{ scale: 0.92, rotate: 5 }}
                                className={[
                                  "text-destructive hover:bg-muted p-1.5 rounded-lg border border-transparent hover:border-border/60",
                                  "focus:outline-none focus:ring-2 focus:ring-ring",
                                  borrandoId === i.id ? "opacity-60 pointer-events-none" : "",
                                ].join(" ")}
                                title="Eliminar"
                                onClick={() => handleDelete(i.id as string)}
                                type="button"
                              >
                                <Trash2 className="w-5 h-5" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </AnimatePresence>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}