"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Loader2, History, Trash2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

// ✅ Tipos ampliados (insumo/producto/pedido + masivos)
type MovimientoTipo =
  | "entrada"
  | "salida"
  | "ajuste"
  | "ajuste_masivo"
  | "edicion_producto"
  | "creacion_producto"
  | "eliminacion_producto"
  | "edicion_insumo"
  | "creacion_insumo"
  | "eliminacion_insumo"
  // ✅ pedidos
  | "pedido_creado"
  | "pedido_tomado"
  | "pedido_entregado"
  | "pago_confirmado";

type Movimiento = {
  id: string;
  fecha: { seconds: number; nanoseconds: number } | any;

  tipo: MovimientoTipo;

  // insumos/productos (como antes)
  insumoId?: string;
  insumoNombre?: string;
  productoId?: string;
  productoNombre?: string;

  // ✅ pedidos
  pedidoId?: string;
  pedidoOrden?: number | string;
  clienteNombre?: string;

  // comunes
  cantidad?: number;
  usuarioNombre?: string;
  observacion?: string;

  // ✅ masivo (opcional)
  batchId?: string;
  itemsCount?: number;
  detalle?: string;
};

const tipoLabels: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  ajuste_masivo: "Ajuste masivo",

  creacion_producto: "Nuevo prod.",
  edicion_producto: "Edit. prod.",
  eliminacion_producto: "Elim. prod.",

  creacion_insumo: "Nuevo insumo",
  edicion_insumo: "Edit. insumo",
  eliminacion_insumo: "Elim. insumo",

  pedido_creado: "Pedido creado",
  pedido_tomado: "Pedido tomado",
  pedido_entregado: "Pedido entregado",
  pago_confirmado: "Pago confirmado",
};

// ✅ Tokenizados para dark mode
const tipoColor: Record<string, string> = {
  entrada:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  salida: "bg-destructive/15 text-destructive border border-destructive/20",
  ajuste:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  ajuste_masivo:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20",

  creacion_producto:
    "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
  edicion_producto:
    "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  eliminacion_producto:
    "bg-destructive/15 text-destructive border border-destructive/20",

  creacion_insumo:
    "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20",
  edicion_insumo:
    "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
  eliminacion_insumo:
    "bg-destructive/15 text-destructive border border-destructive/20",

  pedido_creado:
    "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  pedido_tomado: "bg-primary/15 text-foreground border border-primary/20",
  pedido_entregado:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  pago_confirmado:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
};

function formateaFecha(fecha: Movimiento["fecha"]) {
  try {
    if (!fecha) return "—";
    if (fecha?.toDate) return fecha.toDate().toLocaleString("es-PE");
    if (typeof fecha.seconds === "number")
      return new Date(fecha.seconds * 1000).toLocaleString("es-PE");
    return "—";
  } catch {
    return "—";
  }
}

function getEntidad(m: Movimiento): "insumo" | "producto" | "pedido" | "otro" {
  if (m.pedidoId) return "pedido";
  if (m.insumoId) return "insumo";
  if (m.productoId) return "producto";
  return "otro";
}

const PAGE_SIZE = 8;

/**
 * Confirmación con toast (tokenizado).
 */
function confirmToast(opts: {
  title: string;
  description?: string;
  onConfirm: () => Promise<void>;
}) {
  const id = toast.custom(
    (t) => (
      <div
        className={[
          "pointer-events-auto w-full max-w-md rounded-2xl border shadow-xl",
          "bg-card text-card-foreground border-amber-500/25",
          "transition-all will-change-transform",
          t.visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-[0.98]",
        ].join(" ")}
        style={{
          transitionDuration: t.visible ? "160ms" : "180ms",
          transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5">
            <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <div className="flex-1">
            <div className="font-extrabold text-amber-600 dark:text-amber-400">
              {opts.title}
            </div>
            {opts.description && (
              <div className="text-sm text-muted-foreground mt-0.5">
                {opts.description}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  try {
                    await opts.onConfirm();
                    toast.success("Acción completada.");
                  } catch (e) {
                    console.error(e);
                    toast.error("No se pudo completar la acción.");
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition"
                type="button"
              >
                Confirmar
              </button>

              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-muted text-foreground hover:bg-muted/80 transition border border-border/60"
                type="button"
              >
                Cancelar
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
    { duration: 6000 }
  );

  return id;
}

export default function HistorialMovimientos() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);

  // filtros
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<string>("");
  const [entidad, setEntidad] = useState<
    "todos" | "insumo" | "producto" | "pedido"
  >("todos");
  const [insumoFiltro, setInsumoFiltro] = useState<string>("");
  const [productoFiltro, setProductoFiltro] = useState<string>("");
  const [pedidoFiltro, setPedidoFiltro] = useState<string>("");

  // paginación
  const [page, setPage] = useState(1);

  useEffect(() => {
    setCargando(true);
    const q = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMovimientos(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Movimiento)
        );
        setCargando(false);
      },
      (err) => {
        console.error(err);
        setCargando(false);
        toast.error("Error cargando movimientos.");
      }
    );
    return () => unsub();
  }, []);

  // listas únicas para filtros
  const insumosUnicos = useMemo(
    () =>
      Array.from(
        new Set(
          movimientos.map((m) => m.insumoNombre).filter(Boolean) as string[]
        )
      ).sort(),
    [movimientos]
  );
  const productosUnicos = useMemo(
    () =>
      Array.from(
        new Set(
          movimientos.map((m) => m.productoNombre).filter(Boolean) as string[]
        )
      ).sort(),
    [movimientos]
  );
  const pedidosUnicos = useMemo(
    () =>
      Array.from(
        new Set(
          movimientos
            .map((m) =>
              m.pedidoOrden
                ? String(m.pedidoOrden)
                : m.pedidoId
                  ? m.pedidoId.slice(-5).toUpperCase()
                  : ""
            )
            .filter(Boolean)
        )
      ).sort(),
    [movimientos]
  );

  const movimientosFiltro = useMemo(() => {
    const q = search.trim().toLowerCase();

    return movimientos.filter((m) => {
      const ent = getEntidad(m);

      const okEntidad =
        entidad === "todos" ||
        (entidad === "insumo" && ent === "insumo") ||
        (entidad === "producto" && ent === "producto") ||
        (entidad === "pedido" && ent === "pedido");

      const okTipo = !tipo || m.tipo === tipo;

      const okInsumo =
        entidad !== "producto" && entidad !== "pedido"
          ? !insumoFiltro || m.insumoNombre === insumoFiltro
          : true;

      const okProducto =
        entidad === "producto"
          ? !productoFiltro || m.productoNombre === productoFiltro
          : true;

      const pedidoKey = m.pedidoOrden
        ? String(m.pedidoOrden)
        : m.pedidoId
          ? m.pedidoId.slice(-5).toUpperCase()
          : "";
      const okPedido =
        entidad === "pedido" ? !pedidoFiltro || pedidoKey === pedidoFiltro : true;

      const okSearch =
        q.length === 0 ||
        (m.insumoNombre ?? "").toLowerCase().includes(q) ||
        (m.productoNombre ?? "").toLowerCase().includes(q) ||
        (m.usuarioNombre ?? "").toLowerCase().includes(q) ||
        (m.observacion ?? "").toLowerCase().includes(q) ||
        (m.detalle ?? "").toLowerCase().includes(q) ||
        (m.clienteNombre ?? "").toLowerCase().includes(q) ||
        (m.pedidoId ?? "").toLowerCase().includes(q);

      return okEntidad && okTipo && okInsumo && okProducto && okPedido && okSearch;
    });
  }, [movimientos, entidad, tipo, insumoFiltro, productoFiltro, pedidoFiltro, search]);

  const totalPages = Math.ceil(movimientosFiltro.length / PAGE_SIZE) || 1;

  useEffect(() => {
    setPage(1);
  }, [search, tipo, entidad, insumoFiltro, productoFiltro, pedidoFiltro]);

  const movimientosPage = movimientosFiltro.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  async function borrarHistorialFiltrado() {
    if (movimientosFiltro.length === 0) return;

    confirmToast({
      title: "Borrar historial filtrado",
      description: `Se eliminarán ${movimientosFiltro.length} registros. Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        for (const mov of movimientosFiltro) {
          await deleteDoc(doc(db, "movimientos", mov.id));
        }
      },
    });
  }

  async function borrarMovimiento(id: string) {
    confirmToast({
      title: "Borrar movimiento",
      description: "Se eliminará este registro del historial.",
      onConfirm: async () => {
        await deleteDoc(doc(db, "movimientos", id));
      },
    });
  }

  const pillFocus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="max-w-5xl mx-auto px-2 pb-12 pt-2 font-sans w-full">
      {/* Header */}
      <div className="flex flex-col items-center mb-3">
        <div className="bg-primary/20 border border-primary/25 rounded-lg p-2 flex items-center justify-center mb-0">
          <History className="text-white w-6 h-6" />
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-none text-center">
          Historial de movimientos y pedidos
        </h2>

        <div className="text-muted-foreground text-sm text-center mt-1 mb-4">
          Movimientos de inventario + eventos de pedidos (tomado/entregado/pago).
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-7 items-center justify-center">
        <input
          type="text"
          placeholder="Buscar: insumo, producto, pedido, cliente, usuario, observación..."
          className="border border-border rounded-lg px-4 py-2 text-base bg-background text-foreground w-80 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border border-border rounded-lg px-3 py-2 text-base bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {Object.keys(tipoLabels).map((t) => (
            <option key={t} value={t}>
              {tipoLabels[t]}
            </option>
          ))}
        </select>

        {/* ✅ Tabs entidad (fix: pill tabs como Catálogo) */}
        <div className="inline-flex rounded-full bg-muted/60 p-1 border border-border/60 shadow-sm gap-1">
          <button
            type="button"
            className={[
              "px-4 py-2 rounded-full font-extrabold text-base transition",
              pillFocus,
              entidad === "todos"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            ].join(" ")}
            onClick={() => setEntidad("todos")}
          >
            Todos
          </button>

          <button
            type="button"
            className={[
              "px-4 py-2 rounded-full font-extrabold text-base transition",
              pillFocus,
              entidad === "insumo"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            ].join(" ")}
            onClick={() => setEntidad("insumo")}
          >
            Insumos
          </button>

          <button
            type="button"
            className={[
              "px-4 py-2 rounded-full font-extrabold text-base transition",
              pillFocus,
              entidad === "producto"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            ].join(" ")}
            onClick={() => setEntidad("producto")}
          >
            Productos
          </button>

          <button
            type="button"
            className={[
              "px-4 py-2 rounded-full font-extrabold text-base transition",
              pillFocus,
              entidad === "pedido"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            ].join(" ")}
            onClick={() => setEntidad("pedido")}
          >
            Pedidos
          </button>
        </div>

        {entidad === "insumo" && (
          <select
            className="border border-border rounded-lg px-3 py-2 text-base bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={insumoFiltro}
            onChange={(e) => setInsumoFiltro(e.target.value)}
          >
            <option value="">Todos los insumos</option>
            {insumosUnicos.map((n, i) => (
              <option value={n} key={i}>
                {n}
              </option>
            ))}
          </select>
        )}

        {entidad === "producto" && (
          <select
            className="border border-border rounded-lg px-3 py-2 text-base bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={productoFiltro}
            onChange={(e) => setProductoFiltro(e.target.value)}
          >
            <option value="">Todos los productos</option>
            {productosUnicos.map((n, i) => (
              <option value={n} key={i}>
                {n}
              </option>
            ))}
          </select>
        )}

        {entidad === "pedido" && (
          <select
            className="border border-border rounded-lg px-3 py-2 text-base bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={pedidoFiltro}
            onChange={(e) => setPedidoFiltro(e.target.value)}
          >
            <option value="">Todos los pedidos</option>
            {pedidosUnicos.map((n, i) => (
              <option value={n} key={i}>
                {n}
              </option>
            ))}
          </select>
        )}

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="ml-2 px-4 py-2 bg-destructive/15 text-destructive rounded-xl font-bold transition border border-destructive/20 disabled:opacity-50 hover:bg-destructive/20"
          style={{ fontSize: 15 }}
          onClick={borrarHistorialFiltrado}
          disabled={movimientosFiltro.length === 0}
        >
          <Trash2 size={17} className="inline mr-1" /> Borrar este historial
        </motion.button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={30} />
          <span className="ml-4 font-semibold text-foreground">
            Cargando movimientos...
          </span>
        </div>
      ) : movimientosFiltro.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground font-semibold italic">
          No se encontraron movimientos
        </div>
      ) : (
        <motion.div
          key={`${entidad}-${tipo}-${insumoFiltro}-${productoFiltro}-${pedidoFiltro}-${page}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.23 }}
        >
          <div className="w-full overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full border-collapse overflow-hidden">
              <thead>
                <tr className="text-muted-foreground border-b border-border/60 bg-muted/40">
                  <th className="py-2 px-4 text-left text-base font-bold whitespace-nowrap">
                    Fecha
                  </th>
                  {entidad !== "producto" && entidad !== "pedido" && (
                    <th className="py-2 px-4 text-left text-base font-bold">
                      Insumo
                    </th>
                  )}
                  {entidad !== "insumo" && entidad !== "pedido" && (
                    <th className="py-2 px-4 text-left text-base font-bold">
                      Producto
                    </th>
                  )}
                  {(entidad === "todos" || entidad === "pedido") && (
                    <th className="py-2 px-4 text-left text-base font-bold">
                      Pedido
                    </th>
                  )}
                  <th className="py-2 px-4 text-left text-base font-bold">
                    Tipo
                  </th>
                  <th className="py-2 px-4 text-right text-base font-bold">
                    Cantidad
                  </th>
                  <th className="py-2 px-4 text-left text-base font-bold">
                    Usuario
                  </th>
                  <th className="py-2 px-4 text-left text-base font-bold">
                    Observación
                  </th>
                  <th className="py-2 px-3 text-base font-bold"></th>
                </tr>
              </thead>

              <tbody>
                {movimientosPage.map((m) => {
                  const pedidoLabel = m.pedidoOrden
                    ? `#${m.pedidoOrden}`
                    : m.pedidoId
                      ? `#${m.pedidoId.slice(-5).toUpperCase()}`
                      : "—";

                  return (
                    <tr key={m.id} className="border-b border-border/60 last:border-b-0">
                      <td className="py-2 px-4 whitespace-nowrap text-foreground">
                        {formateaFecha(m.fecha)}
                      </td>

                      {entidad !== "producto" && entidad !== "pedido" && (
                        <td className="py-2 px-4 font-medium text-foreground">
                          {m.insumoNombre ?? "—"}
                        </td>
                      )}

                      {entidad !== "insumo" && entidad !== "pedido" && (
                        <td className="py-2 px-4 font-semibold text-foreground">
                          {m.productoNombre ?? "—"}
                        </td>
                      )}

                      {(entidad === "todos" || entidad === "pedido") && (
                        <td className="py-2 px-4">
                          {m.pedidoId ? (
                            <div className="leading-tight">
                              <div className="font-bold text-foreground">
                                {pedidoLabel}
                              </div>
                              {m.clienteNombre && (
                                <div className="text-xs text-muted-foreground">
                                  {m.clienteNombre}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}

                      <td className="py-2 px-4">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-[13px] font-semibold truncate max-w-[170px] block text-center",
                            tipoColor[m.tipo] ??
                              "bg-muted text-muted-foreground border border-border/60",
                          ].join(" ")}
                        >
                          {tipoLabels[m.tipo] ?? m.tipo}
                          {m.itemsCount ? ` · x${m.itemsCount}` : ""}
                        </span>
                      </td>

                      <td className="py-2 px-4 text-right font-mono font-bold text-foreground">
                        {typeof m.cantidad === "number" ? m.cantidad : "—"}
                      </td>

                      <td className="py-2 px-4 text-muted-foreground">
                        {m.usuarioNombre ?? "—"}
                      </td>

                      <td className="py-2 px-4 text-muted-foreground">
                        {m.observacion ?? ""}
                        {m.detalle ? (
                          <div className="text-xs text-muted-foreground mt-0.5 opacity-80">
                            {m.detalle}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-2 px-3">
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.95 }}
                          title="Eliminar movimiento"
                          onClick={() => borrarMovimiento(m.id)}
                          className="bg-destructive/15 text-destructive p-2 rounded-full hover:bg-destructive/20 border border-destructive/20"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex justify-end items-center gap-4 mt-4 mb-2">
            <button
              className="rounded-lg px-4 py-2 bg-muted font-bold disabled:opacity-50 border border-border/60 hover:bg-muted/80"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              type="button"
            >
              Anterior
            </button>
            <span className="font-semibold text-foreground">
              Página {page} de {totalPages}
            </span>
            <button
              className="rounded-lg px-4 py-2 bg-muted font-bold disabled:opacity-50 border border-border/60 hover:bg-muted/80"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}