"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Loader2, MoreVertical, Pencil, Trash2, ArchiveRestore, Copy } from "lucide-react";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, doc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";

// Tamaños estándar y sus equivalentes en litros (referencial)
const TAMAÑOS = [
  { key: "8oz", label: "8 oz", litros: 0.237 },
  { key: "16oz", label: "16 oz", litros: 0.473 },
  { key: "32oz", label: "32 oz", litros: 0.946 },
] as const;

type TamanoKey = (typeof TAMAÑOS)[number]["key"];
type PreciosPorTamano = Record<TamanoKey, number>;

// ✅ Peso por pote (kg) por tamaño (lo usaremos para convertir stockKg -> unidades)
type PesoPorTamanoKg = Record<TamanoKey, number>;

// En insumos: tipo = "comprado" | "intermedio" | "final"
type InsumoTipo = "comprado" | "intermedio" | "final";

type Producto = {
  id?: string;

  // ✅ link al insumo FINAL (obligatorio en creación)
  insumoFinalId: string;

  // nombre queda como snapshot legacy; en UI lo tomamos del insumo final si existe
  nombre?: string;
  nombreNorm?: string;

  preciosPorTamano?: PreciosPorTamano;
  preciosPorTamaño?: PreciosPorTamano; // legacy con ñ
  precio?: number; // legacy

  // ✅ nuevo: peso por pote para calcular unidades desde stockKg del insumo final
  pesoPorTamanoKg?: PesoPorTamanoKg;

  descripcion: string;
  sabores: string[] | string;
  imagen?: string;

  inCatalog?: boolean;
  status?: "draft" | "published";

  archived?: boolean;
  archivedAt?: any;
  archivedBy?: { name?: string } | null;

  createdAt?: any;
  updatedAt?: any;
};

type Insumo = {
  id: string;
  nombre: string;
  unidad: string;
  stock?: number; // asumimos kg en tu inventario
  tipo?: InsumoTipo;
};

// ========== Helpers ==========
function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

function defaultPrecios(precioFallback?: number): PreciosPorTamano {
  const base = Number(precioFallback ?? 0);
  return { "8oz": base, "16oz": base, "32oz": base };
}

function defaultPesoPorTamanoKg(): PesoPorTamanoKg {
  // valores iniciales 0 => el usuario debe ingresarlos
  return { "8oz": 0, "16oz": 0, "32oz": 0 };
}

function formatPEN(amount: number) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "S/ 0.00";
  return `S/ ${n.toFixed(2)}`;
}

function getPrecio(prod: Producto, key: TamanoKey): number {
  const p1 = prod.preciosPorTamano?.[key];
  if (Number.isFinite(Number(p1)) && Number(p1) > 0) return Number(p1);

  const p2 = prod.preciosPorTamaño?.[key];
  if (Number.isFinite(Number(p2)) && Number(p2) > 0) return Number(p2);

  if (Number.isFinite(Number(prod.precio)) && Number(prod.precio) > 0) return Number(prod.precio);
  return 0;
}

function normalizeProductoFromDoc(data: any): Producto {
  const preciosSrc = data.preciosPorTamano ?? data.preciosPorTamaño ?? undefined;
  const fallbackPrecio = Number(data.precio ?? 0);

  const pesoSrc = data.pesoPorTamanoKg ?? undefined;

  return {
    ...data,
    insumoFinalId: String(data.insumoFinalId ?? ""),
    preciosPorTamano: {
      "8oz": Number(preciosSrc?.["8oz"] ?? fallbackPrecio ?? 0),
      "16oz": Number(preciosSrc?.["16oz"] ?? fallbackPrecio ?? 0),
      "32oz": Number(preciosSrc?.["32oz"] ?? fallbackPrecio ?? 0),
    },
    pesoPorTamanoKg: {
      "8oz": Number(pesoSrc?.["8oz"] ?? 0),
      "16oz": Number(pesoSrc?.["16oz"] ?? 0),
      "32oz": Number(pesoSrc?.["32oz"] ?? 0),
    },
    descripcion: String(data.descripcion ?? ""),
    sabores: data.sabores ?? [],
  };
}

function validatePrecios(precios?: PreciosPorTamano) {
  if (!precios) return "Faltan precios por tamaño.";
  for (const sz of TAMAÑOS) {
    const v = Number(precios[sz.key]);
    if (!Number.isFinite(v) || v <= 0) return `Precio inválido para ${sz.label}.`;
  }
  return "";
}

function validatePesoPorTamano(pesos?: PesoPorTamanoKg) {
  if (!pesos) return "Faltan pesos por tamaño (kg).";
  for (const sz of TAMAÑOS) {
    const v = Number(pesos[sz.key]);
    if (!Number.isFinite(v) || v <= 0) return `Peso (kg) inválido para ${sz.label}.`;
  }
  return "";
}

// ========== Loading Spinner ==========
function LoadingSpinner({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="w-full flex justify-center items-center py-8">
      <Loader2 className="animate-spin mr-3 text-primary" size={24} />
      <span className="text-foreground font-semibold text-base">{text}</span>
    </div>
  );
}

// ----- Imagen Drag & Drop Helper ------
function DragAndDropImg({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFile(files: FileList | null) {
    if (!files || !files.length) return;
    const file = files[0];
    if (file.size > 1024 * 1024) {
      alert("Imagen demasiado grande. Elige una menor a 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div
      className={[
        "rounded-xl border-2 border-dashed flex flex-col items-center justify-center min-h-[180px] mb-7 cursor-pointer transition-all",
        "bg-muted/40",
        dragActive ? "border-primary/60 bg-primary/10" : "border-border/60 hover:border-border",
      ].join(" ")}
      style={{ aspectRatio: "4 / 3", width: "100%", maxWidth: 340 }}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFile(e.dataTransfer.files);
      }}
    >
      {value ? (
        <img
          src={value}
          alt="Preview"
          className="block w-full h-auto object-cover rounded-lg pointer-events-none"
          style={{ minHeight: 98, aspectRatio: "4/3" }}
        />
      ) : (
        <div className="flex flex-col items-center pointer-events-none py-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={44}
            height={44}
            viewBox="0 0 24 24"
            fill="none"
            className="mb-2 text-muted-foreground mx-auto block"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor" opacity="0.18" />
            <path
              d="M5 15L10 10L13.5 14L17.5 10.5L21 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="9" r="1" fill="currentColor" />
          </svg>

          <span className="font-semibold text-foreground mb-1 text-base text-center">Arrastra una imagen aquí</span>
          <span className="text-xs text-muted-foreground mb-1 text-center">o haz click para seleccionar</span>
          <span className="text-xs text-muted-foreground text-center">(máx 1MB, proporción 4:3 es ideal)</span>
        </div>
      )}

      <input type="file" accept="image/*" ref={inputRef} className="hidden" onChange={(e) => handleFile(e.target.files)} />
    </div>
  );
}

// ============ Main Component =============
const usuarioActual = "usuario demo"; // Cambia por auth real si tienes

export default function ProductosYRecetas() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  const [tab, setTab] = useState<"activos" | "archivados">("activos");

  // ✅ Form nuevo (ya no hay nombre, ni recetas/ingredientes)
  const [form, setForm] = useState<Partial<Producto>>({
    insumoFinalId: "",
    preciosPorTamano: defaultPrecios(0),
    pesoPorTamanoKg: defaultPesoPorTamanoKg(),
    descripcion: "",
    sabores: "",
    imagen: "",
  });

  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargandoInsumos, setCargandoInsumos] = useState(true);

  const [editProducto, setEditProducto] = useState<Producto | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  useEffect(() => {
    function onDocClick() {
      setMenuOpenFor(null);
    }
    if (menuOpenFor) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpenFor]);

  // Productos
  useEffect(() => {
    setCargandoProductos(true);
    const unsub = onSnapshot(collection(db, "productos"), (querySnapshot) => {
      setProductos(
        querySnapshot.docs.map((d) =>
          normalizeProductoFromDoc({
            ...(d.data() as any),
            id: d.id,
          })
        )
      );
      setCargandoProductos(false);
    });
    return () => unsub();
  }, []);

  // Insumos (para elegir FINAL)
  useEffect(() => {
    setCargandoInsumos(true);
    const unsub = onSnapshot(collection(db, "insumos"), (snapshot) => {
      setInsumos(snapshot.docs.map((d) => ({ ...(d.data() as Insumo), id: d.id })));
      setCargandoInsumos(false);
    });
    return () => unsub();
  }, []);

  const insumosFinales = useMemo(() => {
    return insumos
      .filter((i) => (i as any).tipo === "final")
      .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
  }, [insumos]);

  const insumoById = useMemo(() => {
    const m = new Map<string, Insumo>();
    for (const i of insumos) m.set(i.id, i);
    return m;
  }, [insumos]);

  const productosFiltrados = useMemo(() => {
    const activos = productos.filter((p) => !p.archived);
    const archivados = productos.filter((p) => !!p.archived);
    const base = tab === "archivados" ? archivados : activos;

    return [...base].sort((a, b) => {
      const an = String(insumoById.get(a.insumoFinalId)?.nombre ?? a.nombre ?? "").trim().toLowerCase();
      const bn = String(insumoById.get(b.insumoFinalId)?.nombre ?? b.nombre ?? "").trim().toLowerCase();
      return an.localeCompare(bn, "es");
    });
  }, [productos, tab, insumoById]);

  function calcUnidadesDisponibles(stockKg: number, pesoKg: number) {
    const s = Number(stockKg);
    const p = Number(pesoKg);
    if (!Number.isFinite(s) || !Number.isFinite(p) || p <= 0) return null;
    return Math.floor(Math.max(0, s) / p);
  }

  const handleSave = async () => {
    try {
      setErrorMsg("");

      const insumoFinalId = String(form.insumoFinalId ?? "").trim();
      if (!insumoFinalId) return setErrorMsg("Selecciona un insumo final.");

      const ins = insumoById.get(insumoFinalId);
      if (!ins) return setErrorMsg("El insumo seleccionado no existe.");

      // ✅ validar que sea final
      if ((ins as any).tipo !== "final") return setErrorMsg("El insumo seleccionado debe ser tipo FINAL.");

      const precios = (form.preciosPorTamano ?? defaultPrecios(0)) as PreciosPorTamano;
      const precioErr = validatePrecios(precios);
      if (precioErr) return setErrorMsg(precioErr);

      const pesos = (form.pesoPorTamanoKg ?? defaultPesoPorTamanoKg()) as PesoPorTamanoKg;
      const pesoErr = validatePesoPorTamano(pesos);
      if (pesoErr) return setErrorMsg(pesoErr);

      if (!form.imagen) return setErrorMsg("Falta imagen.");

      const now = Timestamp.now();
      const nombreNorm = String(ins.nombre || "").trim().toLowerCase();

      const docRef = await addDoc(collection(db, "productos"), {
        insumoFinalId,
        // snapshot
        nombre: String(ins.nombre || ""),
        nombreNorm,

        preciosPorTamano: {
          "8oz": Number(precios["8oz"]),
          "16oz": Number(precios["16oz"]),
          "32oz": Number(precios["32oz"]),
        },

        // legacy opcional
        precio: Number(precios["8oz"]),

        pesoPorTamanoKg: {
          "8oz": Number(pesos["8oz"]),
          "16oz": Number(pesos["16oz"]),
          "32oz": Number(pesos["32oz"]),
        },

        descripcion: String(form.descripcion ?? ""),
        sabores: String(form.sabores ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        imagen: form.imagen,

        inCatalog: false,
        status: "draft",
        archived: false,
        createdAt: now,
        updatedAt: now,
      });

      await addDoc(collection(db, "movimientos"), {
        fecha: now,
        productoId: docRef.id,
        productoNombre: String(ins.nombre || ""),
        cantidad: 0,
        tipo: "creacion_producto",
        usuarioNombre: usuarioActual,
        observacion: "Producto creado (inventario)",
      });

      setMsg("¡Producto guardado!");
      setForm({
        insumoFinalId: "",
        preciosPorTamano: defaultPrecios(0),
        pesoPorTamanoKg: defaultPesoPorTamanoKg(),
        descripcion: "",
        sabores: "",
        imagen: "",
      });
      setShowForm(false);
      setTimeout(() => setMsg(""), 1500);
    } catch (e: any) {
      setErrorMsg(e?.message || "Error guardando producto");
    }
  };

  async function duplicarProducto(prod: Producto) {
    if (!prod.id) return;
    if (!window.confirm(`¿Duplicar este producto?`)) return;

    try {
      const now = Timestamp.now();
      const copyBase = normalizeProductoFromDoc(prod);

      await addDoc(collection(db, "productos"), {
        insumoFinalId: copyBase.insumoFinalId,
        nombre: String(copyBase.nombre ?? ""),
        nombreNorm: String(copyBase.nombreNorm ?? ""),

        descripcion: String(copyBase.descripcion ?? ""),
        sabores: Array.isArray(copyBase.sabores)
          ? copyBase.sabores
          : String(copyBase.sabores ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
        imagen: copyBase.imagen ?? "",

        preciosPorTamano: {
          "8oz": Number(copyBase.preciosPorTamano?.["8oz"] ?? 0),
          "16oz": Number(copyBase.preciosPorTamano?.["16oz"] ?? 0),
          "32oz": Number(copyBase.preciosPorTamano?.["32oz"] ?? 0),
        },
        precio: Number(copyBase.preciosPorTamano?.["8oz"] ?? copyBase.precio ?? 0),

        pesoPorTamanoKg: {
          "8oz": Number(copyBase.pesoPorTamanoKg?.["8oz"] ?? 0),
          "16oz": Number(copyBase.pesoPorTamanoKg?.["16oz"] ?? 0),
          "32oz": Number(copyBase.pesoPorTamanoKg?.["32oz"] ?? 0),
        },

        inCatalog: false,
        status: "draft",
        archived: false,
        createdAt: now,
        updatedAt: now,
      });

      setMsg("Producto duplicado");
      setTimeout(() => setMsg(""), 1500);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Error duplicando producto");
    }
  }

  async function archiveProducto(prod: Producto) {
    if (!prod.id) return;

    if (!window.confirm(`¿Archivar este producto?\n\nNo se borrará, solo se ocultará del inventario activo.`)) return;

    const now = Timestamp.now();

    await updateDoc(doc(db, "productos", prod.id), {
      archived: true,
      archivedAt: now,
      archivedBy: { name: usuarioActual },
      inCatalog: false,
      status: "draft",
      updatedAt: now,
    });

    setMsg("Producto archivado");
    setTimeout(() => setMsg(""), 1500);
  }

  async function restoreProducto(prod: Producto) {
    if (!prod.id) return;

    const now = Timestamp.now();

    await updateDoc(doc(db, "productos", prod.id), {
      archived: false,
      archivedAt: null,
      archivedBy: null,
      updatedAt: now,
    });

    setMsg("Producto restaurado");
    setTimeout(() => setMsg(""), 1500);
  }

  const handleUpdateProducto = async () => {
    try {
      if (!editProducto?.id) return;
      setErrorMsg("");

      const insumoFinalId = String(editProducto.insumoFinalId ?? "").trim();
      if (!insumoFinalId) return setErrorMsg("Selecciona un insumo final.");

      const ins = insumoById.get(insumoFinalId);
      if (!ins) return setErrorMsg("El insumo seleccionado no existe.");
      if ((ins as any).tipo !== "final") return setErrorMsg("El insumo seleccionado debe ser tipo FINAL.");

      const precios = (editProducto.preciosPorTamano ?? defaultPrecios(Number(editProducto.precio ?? 0))) as PreciosPorTamano;
      const precioErr = validatePrecios(precios);
      if (precioErr) return setErrorMsg(precioErr);

      const pesos = (editProducto.pesoPorTamanoKg ?? defaultPesoPorTamanoKg()) as PesoPorTamanoKg;
      const pesoErr = validatePesoPorTamano(pesos);
      if (pesoErr) return setErrorMsg(pesoErr);

      if (!editProducto.imagen) return setErrorMsg("Falta imagen.");

      await updateDoc(doc(db, "productos", editProducto.id), {
        insumoFinalId,
        nombre: String(ins.nombre || ""),
        nombreNorm: String(ins.nombre || "").trim().toLowerCase(),

        preciosPorTamano: {
          "8oz": Number(precios["8oz"]),
          "16oz": Number(precios["16oz"]),
          "32oz": Number(precios["32oz"]),
        },
        precio: Number(precios["8oz"]),

        pesoPorTamanoKg: {
          "8oz": Number(pesos["8oz"]),
          "16oz": Number(pesos["16oz"]),
          "32oz": Number(pesos["32oz"]),
        },

        descripcion: String(editProducto.descripcion ?? ""),
        sabores: Array.isArray(editProducto.sabores)
          ? editProducto.sabores
          : String(editProducto.sabores ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
        imagen: editProducto.imagen,
        updatedAt: Timestamp.now(),
      });

      setEditProducto(null);
      setMsg("Producto actualizado");
      setTimeout(() => setMsg(""), 1800);
    } catch (e: any) {
      setErrorMsg(e?.message || "Error actualizando producto");
    }
  };

  const inputClass =
    "border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-ring text-base transition placeholder:text-muted-foreground";

  const boldLabel = "text-sm font-semibold text-muted-foreground mb-1 block";

  const mainBtn =
    "bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-bold shadow-sm " +
    "transition-all duration-200 text-base flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring";

  const cardShadow = "shadow-[0_8px_28px_-18px_rgba(0,0,0,0.65)]";

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12 pt-4 font-sans">
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between mt-2 mb-2">
        <div>
          <div className="flex gap-2 items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-none">Productos</h2>
            <span className="bg-muted/60 text-foreground rounded-full px-3 py-0.5 font-semibold text-sm border border-border/60">
              {productosFiltrados.length}
            </span>
          </div>
          <div className="text-muted-foreground text-sm mt-1">Inventario: aquí se crean/editar/duplicar productos.</div>
        </div>

        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.96 }}
          className={mainBtn}
          onClick={() => {
            setShowForm(true);
            setForm({
              insumoFinalId: "",
              preciosPorTamano: defaultPrecios(0),
              pesoPorTamanoKg: defaultPesoPorTamanoKg(),
              descripcion: "",
              sabores: "",
              imagen: "",
            });
            setErrorMsg("");
          }}
        >
          <Plus size={18} /> Agregar producto
        </motion.button>
      </div>

      <div className="inline-flex rounded-full bg-muted/60 p-1.5 mb-5 border border-border/60 shadow-sm gap-2">
        <button
          onClick={() => setTab("activos")}
          className={[
            "px-5 py-2 rounded-full font-extrabold transition focus:outline-none focus:ring-2 focus:ring-ring",
            tab === "activos" ? "bg-card text-foreground border border-border/60" : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Activos
        </button>
        <button
          onClick={() => setTab("archivados")}
          className={[
            "px-5 py-2 rounded-full font-extrabold transition focus:outline-none focus:ring-2 focus:ring-ring",
            tab === "archivados"
              ? "bg-card text-foreground border border-border/60"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Archivados
        </button>
      </div>

      {msg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl px-4 py-3 mb-4">
          {msg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-destructive/15 border border-destructive/20 text-destructive font-semibold rounded-xl px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      <AnimatePresence mode="wait">
        {cargandoProductos ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingSpinner text="Cargando productos..." />
          </motion.div>
        ) : productosFiltrados.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center text-muted-foreground"
          >
            {tab === "archivados" ? "No hay productos archivados." : "No hay productos activos."}
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 22 }}>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 mt-6">
              <AnimatePresence mode="popLayout">
                {productosFiltrados.map((prod) => {
                  const id = String(prod.id);
                  const isArchived = !!prod.archived;

                  const linkedInsumo = prod.insumoFinalId ? insumoById.get(prod.insumoFinalId) : undefined;
                  const displayNombre = linkedInsumo?.nombre ?? prod.nombre ?? "(Sin insumo final)";
                  const stockKg = Number(linkedInsumo?.stock ?? 0);

                  return (
                    <motion.div
                      key={id}
                      layout
                      initial={{ opacity: 0, y: 26, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96, y: 26 }}
                      transition={{ duration: 0.43, type: "spring", damping: 23, stiffness: 160 }}
                      className={[
                        "bg-card text-card-foreground border border-border/60 rounded-2xl p-5 flex flex-col relative group transition-all",
                        cardShadow,
                        isArchived ? "opacity-70" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-xl font-extrabold text-foreground">{displayNombre}</h3>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenFor((curr) => (curr === id ? null : id));
                            }}
                            className="bg-card border border-border/60 text-muted-foreground rounded-full p-2 shadow-sm hover:bg-muted hover:text-foreground transition focus:outline-none focus:ring-2 focus:ring-ring"
                            aria-label="Más opciones"
                            title="Más opciones"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {menuOpenFor === id && (
                            <div
                              className="absolute right-0 mt-2 w-56 rounded-xl border border-border/60 bg-card shadow-lg overflow-hidden z-30"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2 disabled:opacity-50"
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  setEditProducto(normalizeProductoFromDoc(prod));
                                }}
                                disabled={isArchived}
                                title={isArchived ? "Restaura para editar" : "Editar"}
                              >
                                <Pencil size={16} /> Editar
                              </button>

                              <button
                                type="button"
                                className="w-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2 disabled:opacity-50"
                                onClick={() => {
                                  setMenuOpenFor(null);
                                  duplicarProducto(prod);
                                }}
                                disabled={isArchived}
                                title={isArchived ? "Restaura para duplicar" : "Duplicar"}
                              >
                                <Copy size={16} /> Duplicar
                              </button>

                              {!isArchived ? (
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2"
                                  onClick={() => {
                                    setMenuOpenFor(null);
                                    archiveProducto(prod);
                                  }}
                                >
                                  <Trash2 size={16} /> Archivar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                                  onClick={() => {
                                    setMenuOpenFor(null);
                                    restoreProducto(prod);
                                  }}
                                >
                                  <ArchiveRestore size={16} /> Restaurar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {prod.imagen && (
                        <img
                          src={prod.imagen}
                          className="w-full rounded-lg mb-4 object-cover"
                          style={{ aspectRatio: "4/3", maxHeight: 220 }}
                          alt={displayNombre}
                        />
                      )}

                      <div className="text-muted-foreground text-base mb-2">{prod.descripcion}</div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {(Array.isArray(prod.sabores) ? prod.sabores : String(prod.sabores ?? "").split(","))
                          .map((s) => String(s).trim())
                          .filter(Boolean)
                          .map((s, i) => (
                            <span
                              key={i}
                              className="bg-muted text-muted-foreground border border-border/60 px-3 py-1 rounded-full text-xs font-semibold"
                            >
                              {s}
                            </span>
                          ))}
                      </div>

                      <div className="mb-3">
                        <div className="font-bold text-foreground mb-2">Precios:</div>
                        <div className="flex flex-wrap gap-2">
                          {TAMAÑOS.map((sz) => (
                            <span
                              key={sz.key}
                              className="bg-muted/60 text-foreground border border-border/60 px-3 py-1 rounded-full text-xs font-bold"
                            >
                              {sz.label}: {formatPEN(getPrecio(prod, sz.key))}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mb-1">
                        <div className="font-bold text-foreground mb-2">Stock (estimado por potes):</div>
                        <div className="flex flex-wrap gap-2">
                          {TAMAÑOS.map((sz) => {
                            const pesoKg = Number(prod.pesoPorTamanoKg?.[sz.key] ?? 0);
                            const u = calcUnidadesDisponibles(stockKg, pesoKg);
                            return (
                              <span
                                key={sz.key}
                                className="bg-card text-muted-foreground border border-border/60 px-3 py-1 rounded-full text-xs font-bold"
                                title={linkedInsumo ? `Stock ${stockKg} kg / ${pesoKg} kg por ${sz.label}` : "Falta link a insumo final"}
                              >
                                {sz.label}: {u == null ? "—" : u}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Basado en stock del insumo final en kg (inventario) y “peso por pote” configurado.
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------- MODAL EDITAR PRODUCTO ----------- */}
      <AnimatePresence>
        {editProducto && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
          >
            <motion.div
              className="bg-card text-card-foreground w-full max-w-xl rounded-2xl shadow-2xl relative border border-border/60 p-0"
              initial={{ opacity: 0, y: 38, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 35, scale: 0.97 }}
              transition={{ duration: 0.32, type: "spring", damping: 20, stiffness: 210 }}
            >
              <button
                className="absolute top-5 right-7 text-2xl text-muted-foreground hover:text-foreground transition"
                onClick={() => {
                  setEditProducto(null);
                  setErrorMsg("");
                }}
                aria-label="Cerrar"
                type="button"
              >
                ×
              </button>

              <form
                className="p-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateProducto();
                }}
              >
                <h3 className="font-extrabold text-2xl mb-7 text-foreground flex gap-2 items-center">Editar producto</h3>

                <div className="flex w-full justify-center mb-7">
                  <DragAndDropImg
                    value={editProducto.imagen}
                    onChange={(img) => setEditProducto((f) => (f ? { ...f, imagen: img } : f))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 mb-4">
                  <div className="col-span-2">
                    <label className={boldLabel}>Insumo final</label>
                    <select
                      className={inputClass}
                      value={editProducto.insumoFinalId ?? ""}
                      onChange={(e) => setEditProducto((p) => (p ? { ...p, insumoFinalId: e.target.value } : p))}
                      required
                      disabled={cargandoInsumos}
                    >
                      <option value="">Selecciona insumo final</option>
                      {insumosFinales.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-muted-foreground mt-2">
                      El nombre del producto se toma del insumo final (no editable aquí).
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className={boldLabel}>Precios por tamaño</label>
                    <div className="grid grid-cols-3 gap-3">
                      {TAMAÑOS.map((sz) => (
                        <div key={sz.key}>
                          <div className="text-xs font-bold text-muted-foreground mb-1">{sz.label}</div>
                          <input
                            className={inputClass}
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={editProducto.preciosPorTamano?.[sz.key] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setEditProducto((p) =>
                                p
                                  ? {
                                      ...p,
                                      preciosPorTamano: {
                                        ...(p.preciosPorTamano ?? p.preciosPorTamaño ?? defaultPrecios(Number(p.precio ?? 0))),
                                        [sz.key]: val,
                                      },
                                    }
                                  : p
                              );
                            }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className={boldLabel}>Peso por pote (kg)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {TAMAÑOS.map((sz) => (
                        <div key={sz.key}>
                          <div className="text-xs font-bold text-muted-foreground mb-1">
                            {sz.label} <span className="font-normal">({sz.litros} L ref.)</span>
                          </div>
                          <input
                            className={inputClass}
                            type="number"
                            min={0.001}
                            step={0.001}
                            value={editProducto.pesoPorTamanoKg?.[sz.key] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setEditProducto((p) =>
                                p
                                  ? {
                                      ...p,
                                      pesoPorTamanoKg: {
                                        ...(p.pesoPorTamanoKg ?? defaultPesoPorTamanoKg()),
                                        [sz.key]: val,
                                      },
                                    }
                                  : p
                              );
                            }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Usa el peso real promedio del pote lleno (para convertir stock en kg → unidades).
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className={boldLabel}>Sabores (coma)</label>
                    <input
                      className={inputClass}
                      placeholder="Sabores"
                      value={Array.isArray(editProducto.sabores) ? editProducto.sabores.join(", ") : (editProducto.sabores ?? "")}
                      onChange={(e) => setEditProducto((f) => (f ? { ...f, sabores: e.target.value } : f))}
                    />
                  </div>
                  <div>
                    <label className={boldLabel}>Descripción</label>
                    <input
                      className={inputClass}
                      placeholder="Descripción"
                      value={editProducto.descripcion ?? ""}
                      onChange={(e) => setEditProducto((f) => (f ? { ...f, descripcion: e.target.value } : f))}
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-destructive/15 border border-destructive/20 rounded-lg px-4 py-2 text-destructive font-semibold mt-2">
                    {errorMsg}
                  </div>
                )}

                <div className="flex justify-end pt-2 mt-2">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 font-bold rounded-full shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ minWidth: 180 }}
                  >
                    Guardar cambios
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------- MODAL NUEVO ----------- */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
          >
            <motion.div
              className="bg-card text-card-foreground w-full max-w-xl rounded-2xl shadow-2xl relative border border-border/60 p-0"
              initial={{ opacity: 0, y: 38, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 35, scale: 0.97 }}
              transition={{ duration: 0.32, type: "spring", damping: 20, stiffness: 210 }}
            >
              <button
                className="absolute top-5 right-7 text-2xl text-muted-foreground hover:text-foreground transition"
                onClick={() => {
                  setShowForm(false);
                  setErrorMsg("");
                }}
                aria-label="Cerrar"
                type="button"
              >
                ×
              </button>

              <form
                className="p-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <h3 className="font-extrabold text-2xl mb-7 text-foreground flex gap-2 items-center">
                  <Plus size={20} /> Agregar producto
                </h3>

                <div className="flex w-full justify-center mb-7">
                  <DragAndDropImg value={form.imagen} onChange={(img) => setForm((f) => ({ ...f, imagen: img }))} />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 mb-4">
                  <div className="col-span-2">
                    <label className={boldLabel}>Insumo final</label>
                    <select
                      className={inputClass}
                      value={form.insumoFinalId ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, insumoFinalId: e.target.value }))}
                      required
                      disabled={cargandoInsumos}
                    >
                      <option value="">Selecciona insumo final</option>
                      {insumosFinales.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-muted-foreground mt-2">
                      El nombre del producto se toma del insumo final (no se escribe manualmente).
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className={boldLabel}>Precios por tamaño</label>
                    <div className="grid grid-cols-3 gap-3">
                      {TAMAÑOS.map((sz) => (
                        <div key={sz.key}>
                          <div className="text-xs font-bold text-muted-foreground mb-1">{sz.label}</div>
                          <input
                            className={inputClass}
                            type="number"
                            min={0}
                            step={0.01}
                            value={form.preciosPorTamano?.[sz.key] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setForm((f) => ({
                                ...f,
                                preciosPorTamano: {
                                  ...(f.preciosPorTamano ?? defaultPrecios(0)),
                                  [sz.key]: val,
                                },
                              }));
                            }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className={boldLabel}>Peso por pote (kg)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {TAMAÑOS.map((sz) => (
                        <div key={sz.key}>
                          <div className="text-xs font-bold text-muted-foreground mb-1">
                            {sz.label} <span className="font-normal">({sz.litros} L ref.)</span>
                          </div>
                          <input
                            className={inputClass}
                            type="number"
                            min={0.001}
                            step={0.001}
                            value={form.pesoPorTamanoKg?.[sz.key] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setForm((f) => ({
                                ...f,
                                pesoPorTamanoKg: {
                                  ...(f.pesoPorTamanoKg ?? defaultPesoPorTamanoKg()),
                                  [sz.key]: val,
                                },
                              }));
                            }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Usa el peso real promedio del pote lleno. (No asumas 1L = 1kg para helado).
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className={boldLabel}>Sabores (coma)</label>
                    <input
                      className={inputClass}
                      placeholder="Sabores"
                      value={String(form.sabores ?? "")}
                      onChange={(e) => setForm((f) => ({ ...f, sabores: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={boldLabel}>Descripción</label>
                    <input
                      className={inputClass}
                      placeholder="Descripción"
                      value={String(form.descripcion ?? "")}
                      onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-destructive/15 border border-destructive/20 rounded-lg px-4 py-2 text-destructive font-semibold mt-2">
                    {errorMsg}
                  </div>
                )}

                <div className="flex justify-end pt-2 mt-2">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 font-bold rounded-full shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ minWidth: 180 }}
                  >
                    Guardar producto
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}