"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Factory,
  FlaskConical,
  Scale,
  X,
  Search,
} from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { aplicarMovimientoStock, crearMovimiento } from "@/lib/produccion/firestoreStock";

type TipoReceta = "subreceta" | "final";
type Step = 1 | 2 | 3 | 4;
type UnidadUI = "g" | "kg" | "oz";

// En insumos: tipo = "comprado" | "intermedio" | "final"
type InsumoTipo = "comprado" | "intermedio" | "final";

type RecetaProduccionDoc = {
  nombre: string;
  tipo: TipoReceta;
  batchBaseKg: number;
  outputInsumoId: string;
  outputNombre: string;
  ingredientes: Array<{
    insumoId: string;
    insumoNombre: string;
    unidadUI: "kg" | "g";
    cantidadTeorica?: number;
  }>;
  activo: boolean;
};

type InsumoDoc = {
  nombre: string;
  stock: number; // kg
  costo?: number; // ✅ S/ por kg
  tipo?: InsumoTipo;
  imagenUrl?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  usuarioNombre: string;
  tipo?: TipoReceta; // opcional: filtra si quieres abrir solo subrecetas o solo finales
  recetaIdInicial?: string; // usado por el sub-wizard
};

type InputRow = {
  insumoId: string;
  insumoNombre: string;
  unidadUI: UnidadUI;
  cantidad: number; // valor ingresado según unidadUI
};

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

function ozToKg(oz: number) {
  return (oz * 28.349523125) / 1000;
}

function toKg(unidad: UnidadUI, cantidad: number) {
  const n = Number(cantidad || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (unidad === "g") return n / 1000;
  if (unidad === "oz") return ozToKg(n);
  return n;
}

function fmtKg(n: number) {
  return (Number(n) || 0).toFixed(3).replace(/\.?0+$/, "");
}

function fmtMoney(n: number) {
  return Number(n || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function getInsumo(insumoId: string) {
  const snap = await getDoc(doc(db, "insumos", insumoId));
  if (!snap.exists()) return null;
  return { id: snap.id, data: snap.data() as InsumoDoc };
}

function ChipTipo({ tipo }: { tipo?: TipoReceta }) {
  if (!tipo) return null;
  const isSub = tipo === "subreceta";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border",
        isSub
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
      )}
    >
      {isSub ? "Intermedio" : "Final"}
    </span>
  );
}

export function WizardLoteModal({ open, onClose, usuarioNombre, tipo, recetaIdInicial }: Props) {
  const [step, setStep] = useState<Step>(1);

  const [recetas, setRecetas] = useState<Array<{ id: string; data: RecetaProduccionDoc }>>([]);
  const [recetaId, setRecetaId] = useState<string>("");

  const receta = useMemo(() => recetas.find((r) => r.id === recetaId)?.data, [recetas, recetaId]);
  const recetaRef = useMemo(() => recetas.find((r) => r.id === recetaId), [recetas, recetaId]);

  // UI: “Rinde aprox.” (referencia)
  const [rindeAproxKg, setRindeAproxKg] = useState<number>(10);
  // UI: peso final real
  const [resultadoKg, setResultadoKg] = useState<number>(10);

  const [inputs, setInputs] = useState<InputRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");

  const [outputInsumo, setOutputInsumo] = useState<{ id: string; data: InsumoDoc } | null>(null);

  const [faltantes, setFaltantes] = useState<
    Array<{ insumoId: string; nombre: string; faltaKg: number; stockKg: number; tipo?: InsumoTipo }>
  >([]);

  // ✅ Step 1: búsqueda
  const [busquedaReceta, setBusquedaReceta] = useState("");

  // Sub-wizard para producir intermedios
  const [subWizard, setSubWizard] = useState<{
    open: boolean;
    recetaId: string;
    titulo: string;
  } | null>(null);

  // ✅ Datos de costeo calculados (para mostrar en Step 4)
  const [costeo, setCosteo] = useState<{
    costoTotalInputs: number;
    costoPorKgOutput: number;
    mermaKg: number;
    totalInputsKg: number;
  }>({
    costoTotalInputs: 0,
    costoPorKgOutput: 0,
    mermaKg: 0,
    totalInputsKg: 0,
  });

  // cargar recetas de Firestore
  useEffect(() => {
    if (!open) return;

    const base = collection(db, "recetas_produccion");
    const q = tipo
      ? query(base, where("tipo", "==", tipo), where("activo", "==", true))
      : query(base, where("activo", "==", true));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, data: d.data() as RecetaProduccionDoc }));
      list.sort((a, b) => String(a.data.nombre).localeCompare(String(b.data.nombre), "es"));
      setRecetas(list);

      // Selección inicial:
      if (recetaIdInicial) {
        setRecetaId(recetaIdInicial);
        return;
      }
      if (!recetaId && list.length > 0) setRecetaId(list[0]!.id);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tipo, recetaIdInicial]);

  // cuando cambia receta, reset inputs
  useEffect(() => {
    if (!receta || !open) return;

    setErr("");
    setStep(1);
    setFaltantes([]);
    setCosteo({ costoTotalInputs: 0, costoPorKgOutput: 0, mermaKg: 0, totalInputsKg: 0 });

    const base = Number(receta.batchBaseKg || 10);
    setRindeAproxKg(base);
    setResultadoKg(base);

    setInputs(
      (receta.ingredientes ?? []).map((i) => ({
        insumoId: i.insumoId,
        insumoNombre: i.insumoNombre,
        unidadUI: i.unidadUI === "g" ? "g" : "kg",
        cantidad: 0,
      }))
    );
  }, [recetaId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // load output insumo doc
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!receta?.outputInsumoId) {
        setOutputInsumo(null);
        return;
      }
      const ins = await getInsumo(receta.outputInsumoId);
      if (!alive) return;
      setOutputInsumo(ins);
    }
    load();
    return () => {
      alive = false;
    };
  }, [receta?.outputInsumoId]);

  const usedInputs = useMemo(() => {
    return inputs
      .map((r) => ({ ...r, kg: toKg(r.unidadUI, r.cantidad) }))
      .filter((x) => x.kg > 0);
  }, [inputs]);

  const totalInputsKg = useMemo(() => usedInputs.reduce((acc, r) => acc + r.kg, 0), [usedInputs]);

  const recetasFiltradas = useMemo(() => {
    const q = busquedaReceta.trim().toLowerCase();
    if (!q) return recetas;
    return recetas.filter((r) => String(r.data.nombre || "").toLowerCase().includes(q));
  }, [recetas, busquedaReceta]);

  async function revisarStock() {
    const falt: Array<{ insumoId: string; nombre: string; faltaKg: number; stockKg: number; tipo?: InsumoTipo }> =
      [];

    for (const r of usedInputs) {
      const ins = await getInsumo(r.insumoId);
      if (!ins) throw new Error(`No existe el insumo "${r.insumoNombre}" en inventario.`);

      const stockKg = Number(ins.data.stock || 0);
      const faltaKg = Math.max(0, r.kg - stockKg);
      if (faltaKg > 0) {
        falt.push({
          insumoId: r.insumoId,
          nombre: ins.data.nombre || r.insumoNombre,
          faltaKg,
          stockKg,
          tipo: ins.data.tipo,
        });
      }
    }

    setFaltantes(falt);
    return falt;
  }

  async function calcularCosteoPreview() {
    let costoTotalInputs = 0;
    for (const x of usedInputs) {
      const ins = await getInsumo(x.insumoId);
      if (!ins) throw new Error(`No existe el insumo "${x.insumoNombre}" en inventario.`);
      const costoKg = Number(ins.data.costo || 0);
      costoTotalInputs += Number(x.kg) * costoKg;
    }

    const outputKg = Number(resultadoKg || 0);
    const totalKg = Number(totalInputsKg || 0);
    const mermaKg = Math.max(0, totalKg - outputKg);
    const costoPorKgOutput = outputKg > 0 ? costoTotalInputs / outputKg : 0;

    setCosteo({
      costoTotalInputs,
      costoPorKgOutput,
      mermaKg,
      totalInputsKg: totalKg,
    });
  }

  function canGoNext() {
    if (step === 1) return Boolean(recetaId);
    if (step === 2) return rindeAproxKg > 0 && resultadoKg > 0;
    if (step === 3) return usedInputs.length > 0;
    if (step === 4) return resultadoKg > 0 && faltantes.length === 0;
    return false;
  }

  async function next() {
    setErr("");
    try {
      if (step === 3) {
        await revisarStock();
        await calcularCosteoPreview();
      }
      setStep((s) => (Math.min(4, (s + 1) as Step) as Step));
    } catch (e: any) {
      setErr(e?.message || "Error inesperado");
    }
  }

  function back() {
    setErr("");
    setStep((s) => (Math.max(1, (s - 1) as Step) as Step));
  }

  async function finalizar() {
    setErr("");
    setSaving(true);

    try {
      if (!recetaRef || !receta) throw new Error("Receta no encontrada");
      if (usedInputs.length === 0) throw new Error("Ingresa al menos 1 ingrediente con cantidad > 0.");
      const outputKg = Number(resultadoKg || 0);
      if (!outputKg || outputKg <= 0) throw new Error("El peso final real debe ser > 0.");

      const falt = await revisarStock();
      if (falt.length > 0) {
        throw new Error("Hay ingredientes sin stock suficiente. Prepara el intermedio o repón stock.");
      }

      // ✅ 1) Calcular costo inputs (S/ por kg) + merma + costo/kg output
      let costoTotalInputs = 0;
      for (const x of usedInputs) {
        const ins = await getInsumo(x.insumoId);
        if (!ins) throw new Error(`No existe el insumo "${x.insumoNombre}" en inventario.`);
        const costoKg = Number(ins.data.costo || 0);
        costoTotalInputs += Number(x.kg) * costoKg;
      }

      const totalKg = Number(totalInputsKg || 0);
      const mermaKg = Math.max(0, totalKg - outputKg);
      const costoPorKgOutput = outputKg > 0 ? costoTotalInputs / outputKg : 0;

      // ✅ 2) Crear lote + guardar costeo
      const loteDoc = await addDoc(collection(db, "lotes_produccion"), {
        recetaId: recetaRef.id,
        recetaNombre: receta.nombre,
        tipo: receta.tipo,
        rindeAproxKg: Number(rindeAproxKg || 0),

        outputInsumoId: receta.outputInsumoId,
        outputNombre: receta.outputNombre,
        outputKg,

        inputs: usedInputs.map((x) => ({
          insumoId: x.insumoId,
          insumoNombre: x.insumoNombre,
          kg: Number(x.kg),
        })),

        totalInputsKg: totalKg,
        mermaKg,
        costoTotalInputs,
        costoPorKgOutput,

        usuarioNombre,
        createdAt: serverTimestamp(),
      });

      const obsBase = `Producción: ${receta.nombre} (lote ${loteDoc.id})`;

      // ✅ 3) Movimientos stock inputs
      for (const x of usedInputs) {
        await aplicarMovimientoStock({ insumoId: x.insumoId, delta: -Number(x.kg) });
        await crearMovimiento({
          insumoId: x.insumoId,
          insumoNombre: x.insumoNombre,
          cantidad: Number(x.kg),
          tipo: "salida",
          observacion: obsBase,
          usuarioNombre,
        });
      }

      // ✅ 4) Movimiento stock output
      await aplicarMovimientoStock({ insumoId: receta.outputInsumoId, delta: outputKg });
      await crearMovimiento({
        insumoId: receta.outputInsumoId,
        insumoNombre: receta.outputNombre,
        cantidad: outputKg,
        tipo: "entrada",
        observacion: obsBase,
        usuarioNombre,
      });

      // ✅ 5) Actualizar costo del insumo output (promedio ponderado)
      await runTransaction(db, async (tx) => {
        const outRef = doc(db, "insumos", receta.outputInsumoId);
        const outSnap = await tx.get(outRef);
        if (!outSnap.exists()) return;

        const out = outSnap.data() as InsumoDoc;

        // Como ya sumaste el stock con aplicarMovimientoStock, "stock actual" incluye outputKg.
        const stockAntesKg = Math.max(0, Number(out.stock || 0) - outputKg);
        const costoActualKg = Number(out.costo || 0);

        const denom = stockAntesKg + outputKg;
        const nuevoCostoPromKg =
          denom > 0
            ? (stockAntesKg * costoActualKg + outputKg * costoPorKgOutput) / denom
            : costoPorKgOutput;

        tx.update(outRef, {
          costo: Number.isFinite(nuevoCostoPromKg) ? nuevoCostoPromKg : 0,
        } as any);
      });

      onClose();
    } catch (e: any) {
      setErr(e?.message || "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function prepararIntermedioAhora(insumoIntermedioId: string, nombre: string) {
    const q = query(
      collection(db, "recetas_produccion"),
      where("tipo", "==", "subreceta"),
      where("activo", "==", true),
      where("outputInsumoId", "==", insumoIntermedioId)
    );

    const snap = await new Promise<any>((resolve) => {
      const unsub = onSnapshot(q, (s) => {
        unsub();
        resolve(s);
      });
    });

    const docs = snap.docs as Array<any>;
    if (!docs || docs.length === 0) {
      throw new Error(`No encontré una sub-receta activa que produzca "${nombre}".`);
    }

    const recetaIdSub = docs[0].id as string;

    setSubWizard({
      open: true,
      recetaId: recetaIdSub,
      titulo: `Preparar: ${nombre}`,
    });
  }

  if (!open) return null;

  const IconTipo = receta?.tipo === "subreceta" ? FlaskConical : Factory;
  const StepIcon = step === 1 ? ClipboardList : step === 2 ? Scale : step === 3 ? Scale : CheckCircle2;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className={cn(
            "bg-card text-card-foreground w-full rounded-2xl shadow-2xl relative border border-border/60",
            // más ancho en desktop, pero mobile-first
            "max-w-2xl"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-5 right-6 text-muted-foreground hover:text-foreground transition z-10"
            onClick={onClose}
            aria-label="Cerrar"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-7">
            <div className="flex items-start gap-3">
              <div className="bg-primary/15 border border-primary/20 rounded-xl p-2">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-2xl text-foreground">Nueva preparación</h3>
                <p className="text-sm text-muted-foreground mt-1">Paso {step} de 4 — Pesaje real.</p>
              </div>
              {receta?.tipo && (
                <div className="hidden md:flex items-center gap-2 text-xs font-extrabold text-muted-foreground">
                  <IconTipo className="h-4 w-4" />
                  {receta.tipo === "subreceta" ? "Base / Intermedio" : "Final"}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { n: 1, label: "Elegir receta" },
                { n: 2, label: "Rinde / Peso final" },
                { n: 3, label: "Pesar ingredientes" },
                { n: 4, label: "Confirmar" },
              ].map((s) => (
                <div
                  key={s.n}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-bold",
                    step === s.n
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground"
                  )}
                >
                  {s.n}. {s.label}
                </div>
              ))}
            </div>

            {/* Step 1: Hero 9:16 + cards + búsqueda */}
            {step === 1 && (
              <div className="mt-6">
                <div
                  className={cn(
                    "rounded-2xl overflow-hidden border border-border/60 bg-muted/30 relative",
                    "aspect-[9/16] md:aspect-[16/6]"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/produccion/step1-hero-9x16.webp"
                    alt="Producción"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      // fallback: si no existe la imagen
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                    <div className="text-white font-extrabold text-xl md:text-2xl">
                      ¿Qué vas a preparar?
                    </div>
                    <div className="text-white/80 text-sm mt-1">
                      Busca y selecciona una receta para continuar.
                    </div>

                    <div className="mt-3 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" size={18} />
                      <input
                        value={busquedaReceta}
                        onChange={(e) => setBusquedaReceta(e.target.value)}
                        placeholder="Buscar receta..."
                        className={cn(
                          "w-full rounded-xl pl-10 pr-10 py-2.5 text-sm",
                          "bg-black/45 text-white placeholder:text-white/60",
                          "border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                        )}
                      />
                      {busquedaReceta && (
                        <button
                          type="button"
                          onClick={() => setBusquedaReceta("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10"
                          title="Limpiar"
                        >
                          <X size={16} className="text-white/80" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-bold text-muted-foreground mb-2">
                    Recetas disponibles ({recetasFiltradas.length})
                  </div>

                  <div className="max-h-[340px] md:max-h-[360px] overflow-auto pr-1 space-y-2">
                    {recetasFiltradas.map((r) => {
                      const active = r.id === recetaId;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            // ✅ mobile-first: al tocar, selecciona y avanza al paso 2
                            setRecetaId(r.id);
                            setStep(2);
                          }}
                          className={cn(
                            "w-full text-left rounded-2xl border p-4 transition",
                            "hover:bg-muted/40",
                            active ? "border-primary bg-primary/10" : "border-border/60 bg-card"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-extrabold text-foreground text-base truncate">
                                {r.data.nombre}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Resultado: <b className="text-foreground">{r.data.outputNombre}</b>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <ChipTipo tipo={r.data.tipo} />
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {recetasFiltradas.length === 0 && (
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                        No hay recetas que coincidan con la búsqueda.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="text-xs font-bold text-muted-foreground mb-1">Rinde aprox. (kg)</div>
                  <input
                    value={rindeAproxKg}
                    onChange={(e) => setRindeAproxKg(Number(e.target.value))}
                    type="number"
                    step="0.1"
                    className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="text-xs font-bold text-muted-foreground mb-1">Peso final real (kg)</div>
                  <input
                    value={resultadoKg}
                    onChange={(e) => setResultadoKg(Number(e.target.value))}
                    type="number"
                    step="0.1"
                    className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="mt-6">
                <div className="text-sm text-muted-foreground">
                  Pesa cada ingrediente. Unidades: <b className="text-foreground">g / oz / kg</b>.
                </div>

                <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/40 border-b border-border/60">
                    <div className="col-span-6 text-xs font-extrabold text-muted-foreground">Ingrediente</div>
                    <div className="col-span-3 text-xs font-extrabold text-muted-foreground text-right">Cantidad</div>
                    <div className="col-span-3 text-xs font-extrabold text-muted-foreground text-right">Unidad</div>
                  </div>

                  <div className="divide-y divide-border/60">
                    {inputs.map((r, idx) => (
                      <div key={`${r.insumoId}-${idx}`} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                        <div className="col-span-6 font-semibold text-foreground">{r.insumoNombre}</div>

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
                            step={r.unidadUI === "kg" ? 0.1 : 1}
                            className={cn(
                              "w-full text-right border border-border/60 rounded-lg px-3 py-2 text-sm",
                              "bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            )}
                          />
                        </div>

                        <div className="col-span-3 text-right">
                          <select
                            value={r.unidadUI}
                            onChange={(e) => {
                              const unidadUI = e.target.value as UnidadUI;
                              setInputs((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], unidadUI };
                                return copy;
                              });
                            }}
                            className="border border-border/60 rounded-lg px-2 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="g">g</option>
                            <option value="oz">oz</option>
                            <option value="kg">kg</option>
                          </select>
                        </div>

                        <div className="col-span-12 text-xs text-muted-foreground text-right">
                          ≈ {fmtKg(toKg(r.unidadUI, r.cantidad))} kg
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    Total ingredientes:{" "}
                    <span className="font-extrabold text-foreground">{fmtKg(totalInputsKg)} kg</span>
                  </div>
                  <div>
                    Peso final: <span className="font-extrabold text-foreground">{fmtKg(resultadoKg)} kg</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="text-sm text-muted-foreground">Resumen</div>

                <div className="mt-2 grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preparación</span>
                    <span className="font-extrabold text-foreground">{receta?.nombre ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Resultado</span>
                    <span className="font-extrabold text-foreground">{receta?.outputNombre ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ingredientes (kg)</span>
                    <span className="font-extrabold text-foreground">{fmtKg(totalInputsKg)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Peso final real (kg)</span>
                    <span className="font-extrabold text-foreground">{fmtKg(resultadoKg)}</span>
                  </div>

                  {/* ✅ Costeo */}
                  <div className="mt-3 pt-3 border-t border-border/60 grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Merma (kg)</span>
                      <span className="font-extrabold text-foreground">{fmtKg(costeo.mermaKg)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Costo total insumos (S/)</span>
                      <span className="font-extrabold text-foreground">{fmtMoney(costeo.costoTotalInputs)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Costo por kg resultado (S/)</span>
                      <span className="font-extrabold text-foreground">{fmtMoney(costeo.costoPorKgOutput)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Este costo se guardará en el insumo resultado al finalizar.
                    </div>
                  </div>
                </div>

                {faltantes.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                    <div className="text-sm font-extrabold text-amber-700 dark:text-amber-300">Falta stock en:</div>
                    <ul className="mt-2 text-sm text-amber-700 dark:text-amber-200 list-disc ml-5">
                      {faltantes.map((f) => (
                        <li key={f.insumoId} className="flex items-center justify-between gap-3">
                          <span>
                            {f.nombre}: falta {fmtKg(f.faltaKg)} kg (stock {fmtKg(f.stockKg)} kg)
                          </span>

                          {f.tipo === "intermedio" ? (
                            <button
                              type="button"
                              className="shrink-0 px-3 py-1 rounded-full text-xs font-extrabold border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 transition"
                              onClick={async () => {
                                try {
                                  await prepararIntermedioAhora(f.insumoId, f.nombre);
                                } catch (e: any) {
                                  setErr(e?.message || "No se pudo abrir el preparador de intermedio");
                                }
                              }}
                            >
                              Preparar ahora
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    <div className="text-xs text-muted-foreground mt-2">
                      Si es materia prima (comprado), debes reponer stock.
                    </div>
                  </div>
                )}
              </div>
            )}

            {err && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {err}
              </div>
            )}

            <div className="mt-6 flex justify-between gap-2">
              <button
                type="button"
                className={cn(
                  "px-4 py-2 rounded-full font-bold border border-border/60 bg-card hover:bg-muted transition inline-flex items-center gap-2",
                  step === 1 && "opacity-60 pointer-events-none"
                )}
                onClick={back}
                disabled={saving || step === 1}
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  className={cn(
                    "px-5 py-2 rounded-full font-extrabold shadow-sm transition-all inline-flex items-center gap-2",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    (!canGoNext() || saving) && "opacity-70 pointer-events-none"
                  )}
                  onClick={next}
                  disabled={!canGoNext() || saving}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "px-6 py-2 rounded-full font-extrabold shadow-sm transition-all inline-flex items-center gap-2",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    (saving || faltantes.length > 0) && "opacity-70 pointer-events-none"
                  )}
                  onClick={finalizar}
                  disabled={saving || faltantes.length > 0}
                  title={faltantes.length > 0 ? "Resuelve faltantes antes de finalizar" : "Finalizar"}
                >
                  {saving ? "Guardando..." : "Finalizar"}
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-wizard modal (intermedio) */}
      {subWizard?.open ? (
        <WizardLoteModal
          open={subWizard.open}
          onClose={async () => {
            setSubWizard(null);
            try {
              await revisarStock();
              await calcularCosteoPreview();
            } catch (e: any) {
              setErr(e?.message || "Error recalculando stock");
            }
          }}
          usuarioNombre={usuarioNombre}
          tipo="subreceta"
          recetaIdInicial={subWizard.recetaId}
        />
      ) : null}
    </>
  );
}