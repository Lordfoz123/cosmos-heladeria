"use client";

import { useEffect, useMemo, useState } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import toast from "react-hot-toast";
import {
  doc,
  updateDoc,
  collection,
  onSnapshot,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Phone,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const WHATSAPP_TIENDA_E164_NO_PLUS = "51965127795";

function getPublicBaseUrl() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && /^https?:\/\//.test(env)) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function buildVoucherLink(pedidoId: string, token: string) {
  const base = getPublicBaseUrl();
  return `${base}/pedido/${pedidoId}/voucher?t=${encodeURIComponent(token)}`;
}

function buildThanksLink(pedidoId: string, token?: string) {
  const base = getPublicBaseUrl();
  // gracias usa token para personalización/validación
  const t = token ? `?t=${encodeURIComponent(token)}` : "";
  return `${base}/pedido/${pedidoId}/gracias${t}`;
}

function buildWaMeUrl(phoneE164NoPlus: string, text: string) {
  return `https://wa.me/${phoneE164NoPlus}?text=${encodeURIComponent(text)}`;
}

function pickTelefono(pedido: any): string | undefined {
  return (
    pedido?.telefonoCliente ??
    pedido?.telefono ??
    pedido?.celular ??
    pedido?.whatsapp ??
    pedido?.telefonoWhatsapp ??
    pedido?.numero ??
    pedido?.phone ??
    pedido?.phoneNumber ??
    undefined
  );
}

type Pedido = {
  id: string;
  productos: {
    productoId: string;
    nombre: string;
    tamaño: string;
    cantidad: number;
    precioUnit: number;
    imagen?: string;
  }[];

  medioPago: "yape" | "plin" | "tarjeta" | "efectivo" | string;
  pagoConfirmado: boolean;

  estadoPago?: "pendiente" | "voucher_subido" | "pagado" | "rechazado" | string;

  voucher?: {
    status?: "none" | "uploaded" | "deleted";
    path?: string;
    uploadedAt?: any;
  };

  accessToken?: string;

  fecha: any;
  nombreCliente?: string;
  telefonoCliente?: string;
  total: number;

  historial?: {
    fecha: any;
    estado: string;
    usuario?: string;
    motivo?: string;
  }[];

  alergias?: string;
  fotoPedido?: string;

  motivoRechazo?: string;
};

function formatFirestoreDate(fecha: any) {
  if (!fecha) return "-";
  if (fecha instanceof Date) return fecha.toLocaleString();
  if (fecha.toDate) return fecha.toDate().toLocaleString();
  if (typeof fecha.seconds === "number")
    return new Date(fecha.seconds * 1000).toLocaleString();
  return "-";
}

function pagoPill(pedido: Pedido) {
  if (pedido.medioPago === "yape")
    return (
      <span className="px-2 py-1 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-bold border border-violet-500/20">
        Yape
      </span>
    );
  if (pedido.medioPago === "plin")
    return (
      <span className="px-2 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-500/20">
        Plin
      </span>
    );
  if (pedido.medioPago === "tarjeta")
    return (
      <span className="px-2 py-1 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-500/20">
        Tarjeta
      </span>
    );
  if (pedido.medioPago === "efectivo")
    return (
      <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
        Efectivo
      </span>
    );
  return null;
}

function estadoPagoPill(pedido: Pedido) {
  if (pedido.medioPago === "tarjeta")
    return (
      <span className="px-2 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20">
        Pagado
      </span>
    );

  if (pedido.estadoPago === "voucher_subido") {
    return (
      <span className="px-2 py-1 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 rounded-lg text-xs font-bold border border-cyan-500/20">
        Voucher subido
      </span>
    );
  }

  if (pedido.estadoPago === "rechazado") {
    return (
      <span className="px-2 py-1 bg-rose-500/15 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold border border-rose-500/20">
        Rechazado
      </span>
    );
  }

  if (pedido.estadoPago === "pagado" || pedido.pagoConfirmado) {
    return (
      <span className="px-2 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20">
        Pagado
      </span>
    );
  }

  if ((pedido.medioPago === "yape" || pedido.medioPago === "plin") && !pedido.pagoConfirmado)
    return (
      <span className="px-2 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold border border-amber-500/20">
        Por confirmar
      </span>
    );

  if (pedido.medioPago === "efectivo" && !pedido.pagoConfirmado)
    return (
      <span className="px-2 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold border border-amber-500/20">
        Por cobrar
      </span>
    );

  return null;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function showSuccessToast(message: string) {
  toast.custom(
    (t) => (
      <div
        className={[
          "pointer-events-auto w-full max-w-md rounded-2xl border shadow-xl",
          "bg-card text-card-foreground border-emerald-500/25",
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
            <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <div className="flex-1">
            <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
              Listo
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {message}
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
    { duration: 2200 }
  );
}

function VoucherModal({
  abierto,
  pedido,
  onClose,
  onApprove,
  onReject,
}: {
  abierto: boolean;
  pedido: Pedido | null;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onReject: (motivo: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string>("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!abierto) return;

    setUrl("");
    setMotivo("");

    const path = pedido?.voucher?.path;
    if (!path) return;

    setLoading(true);
    getDownloadURL(ref(storage, path))
      .then((u) => setUrl(u))
      .catch(() => {
        toast.error("No se pudo cargar el voucher (URL).");
      })
      .finally(() => setLoading(false));
  }, [abierto, pedido?.voucher?.path]);

  if (!abierto || !pedido) return null;

  const isTarjeta = pedido.medioPago === "tarjeta";
  const hasVoucher = !!pedido.voucher?.path;

  const telefono = pickTelefono(pedido);
  const code = pedido.id.slice(-5).toUpperCase();

  const waText = (() => {
    if (isTarjeta) {
      const link = buildThanksLink(pedido.id, pedido.accessToken);
      return `Hola ${pedido.nombreCliente || ""}. Tu pago con tarjeta del pedido #${code} está confirmado ✅. Confirmación: ${link}`;
    }

    if (pedido.accessToken) {
      const link = buildVoucherLink(pedido.id, pedido.accessToken);
      if (pedido.estadoPago === "rechazado") {
        return `Hola ${pedido.nombreCliente || ""}. Tu voucher del pedido #${code} no se ve claro 🙏 ¿podrías reenviarlo aquí? ${link}`;
      }
      if (!hasVoucher) {
        return `Hola ${pedido.nombreCliente || ""}. Para confirmar tu pedido #${code}, por favor sube tu voucher aquí: ${link}`;
      }
      return `Hola ${pedido.nombreCliente || ""}. Ya recibí tu voucher del pedido #${code}. Estoy revisándolo 🙌`;
    }

    return `Hola ${pedido.nombreCliente || ""}. Sobre tu pedido #${code}, ¿me confirmas tu voucher por favor?`;
  })();

  const waUrlCliente = telefono
    ? buildWaMeUrl(String(telefono).replace(/\D/g, ""), waText)
    : buildWaMeUrl(WHATSAPP_TIENDA_E164_NO_PLUS, waText);

  const canApprove =
    !isTarjeta &&
    (pedido.medioPago === "yape" || pedido.medioPago === "plin") &&
    hasVoucher &&
    !pedido.pagoConfirmado &&
    pedido.estadoPago !== "pagado";

  const showActions = canApprove;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground w-full max-w-2xl rounded-2xl border border-border/60 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="min-w-0">
            <div className="font-black text-foreground">
              {isTarjeta ? "Confirmación" : "Voucher"} — Pedido #{code}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatFirestoreDate(pedido.fecha)} · Total S/{Number(pedido.total).toFixed(2)}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground px-2"
            aria-label="Cerrar"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
              <div className="px-4 py-2 border-b border-border/60 text-xs font-bold text-muted-foreground">
                {isTarjeta ? "Detalle" : "Imagen del voucher"}
              </div>

              <div className="p-4">
                {isTarjeta ? (
                  <div className="text-sm text-muted-foreground">
                    Este pedido fue pagado con tarjeta. No requiere voucher.
                    <div className="mt-3">
                      <a
                        href={buildThanksLink(pedido.id, pedido.accessToken)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-primary"
                      >
                        Abrir confirmación <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    {!hasVoucher && (
                      <div className="text-sm text-muted-foreground">
                        Este pedido aún no tiene voucher subido.
                      </div>
                    )}

                    {hasVoucher && loading && (
                      <div className="text-sm text-muted-foreground">Cargando voucher…</div>
                    )}

                    {hasVoucher && !loading && url && (
                      <a href={url} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={url}
                          alt="Voucher"
                          className="w-full max-h-[520px] object-contain rounded-lg bg-black/5"
                        />
                        <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-primary">
                          Abrir en nueva pestaña <ExternalLink className="h-4 w-4" />
                        </div>
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="text-xs font-bold text-muted-foreground">Cliente</div>
              <div className="mt-1 font-extrabold text-foreground">
                {pedido.nombreCliente || "Online"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {pickTelefono(pedido) ? `📞 ${pickTelefono(pedido)}` : "Sin teléfono registrado"}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {pagoPill(pedido)}
                {estadoPagoPill(pedido)}
              </div>

              <a
                href={waUrlCliente}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-extrabold bg-card border border-border/60 hover:bg-muted transition"
                title="Escribir por WhatsApp"
              >
                <Phone className="h-4 w-4" />
                WhatsApp cliente
              </a>
            </div>

            {showActions && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="text-xs font-bold text-muted-foreground">
                  Rechazar (opcional)
                </div>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: No se ve el monto / falta fecha / imagen borrosa…"
                  className="mt-2 w-full min-h-[96px] rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => onReject(motivo)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-extrabold bg-rose-600 text-white hover:bg-rose-700 transition"
                    type="button"
                  >
                    <XCircle className="h-4 w-4" />
                    Rechazar pago
                  </button>

                  <button
                    onClick={onApprove}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobar pago
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Tip: coordina la entrega/recojo por WhatsApp.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-extrabold bg-card border border-border/60 hover:bg-muted transition"
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;

  const btnBase =
    "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-extrabold transition " +
    "focus:outline-none focus:ring-2 focus:ring-ring border";

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-2">
      <div className="text-xs text-muted-foreground">
        Página <span className="font-bold text-foreground">{page}</span> de{" "}
        <span className="font-bold text-foreground">{pageCount}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={[
            btnBase,
            page <= 1
              ? "opacity-60 pointer-events-none bg-muted border-border/60 text-muted-foreground"
              : "bg-card border-border/60 hover:bg-muted text-foreground",
          ].join(" ")}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <button
          className={[
            btnBase,
            page >= pageCount
              ? "opacity-60 pointer-events-none bg-muted border-border/60 text-muted-foreground"
              : "bg-card border-border/60 hover:bg-muted text-foreground",
          ].join(" ")}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function PedidosColumna() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [tab, setTab] = useState<
    "pendientes" | "voucher" | "pagados" | "rechazados" | "todos"
  >("pendientes");
  const [sort, setSort] = useState<"ultimo" | "primero">("ultimo");
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pedidos"), (snap) => {
      setPedidos(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Pedido))
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => setPage(1), [tab, sort]);

  async function registrarMovimiento(opts: {
    tipo: "pago_confirmado" | "pago_rechazado";
    pedido: Pedido;
    observacion?: string;
  }) {
    const now = Timestamp.now();
    await addDoc(collection(db, "movimientos"), {
      fecha: now,
      tipo: opts.tipo,
      pedidoId: opts.pedido.id,
      pedidoOrden: opts.pedido.id.slice(-5).toUpperCase(),
      clienteNombre: opts.pedido.nombreCliente || "Online",
      usuarioNombre: "Admin", // TODO: reemplazar con usuario real (Firebase Auth)
      observacion: opts.observacion ?? "",
    });
  }

  async function aprobarPago(pedido: Pedido) {
    setProcesando(pedido.id);
    try {
      const pedidoRef = doc(db, "pedidos", pedido.id);
      await updateDoc(pedidoRef, {
        pagoConfirmado: true,
        estadoPago: "pagado",
        pagoConfirmadoAt: Timestamp.now(),
        historial: (pedido.historial ?? []).concat({
          fecha: new Date(),
          estado: "pago_aprobado",
          usuario: "Admin",
        }),
      });

      // ✅ agregar al historial global (movimientos)
      await registrarMovimiento({
        tipo: "pago_confirmado",
        pedido,
        observacion: `Pago aprobado (${pedido.medioPago})`,
      });

      showSuccessToast("Pago aprobado.");
      setSelectedPedido(null);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo aprobar el pago.");
    }
    setProcesando(null);
  }

  async function rechazarPago(pedido: Pedido, motivo: string) {
    setProcesando(pedido.id);
    try {
      const pedidoRef = doc(db, "pedidos", pedido.id);
      await updateDoc(pedidoRef, {
        pagoConfirmado: false,
        estadoPago: "rechazado",
        motivoRechazo: (motivo || "").slice(0, 240),
        pagoRechazadoAt: Timestamp.now(),
        historial: (pedido.historial ?? []).concat({
          fecha: new Date(),
          estado: "pago_rechazado",
          usuario: "Admin",
          motivo: (motivo || "").slice(0, 240),
        }),
      });

      // ✅ agregar al historial global (movimientos)
      await registrarMovimiento({
        tipo: "pago_rechazado",
        pedido,
        observacion: `Pago rechazado (${pedido.medioPago}) · ${(motivo || "").slice(0, 120)}`,
      });

      showSuccessToast("Pago rechazado.");
      setSelectedPedido(null);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo rechazar el pago.");
    }
    setProcesando(null);
  }

  const pedidosFiltrados = useMemo(() => {
    const base = pedidos.filter((p) => {
      const isYapePlin = p.medioPago === "yape" || p.medioPago === "plin";

      const hasVoucher = p.voucher?.status === "uploaded" && !!p.voucher?.path;
      const estadoPago = p.estadoPago;

      const isPagado =
        p.pagoConfirmado || estadoPago === "pagado" || p.medioPago === "tarjeta";
      const isRechazado = estadoPago === "rechazado";
      const isVoucherSubido = estadoPago === "voucher_subido" || hasVoucher;

      if (tab === "todos") return true;
      if (tab === "pagados") return isPagado;
      if (tab === "rechazados") return isRechazado;
      if (tab === "voucher")
        return isYapePlin && isVoucherSubido && !isPagado && !isRechazado;

      if (tab === "pendientes") {
        if (p.medioPago === "efectivo" && !p.pagoConfirmado) return true;
        if (isYapePlin && !isVoucherSubido && !isPagado && !isRechazado) return true;
        return false;
      }

      return true;
    });

    base.sort((a, b) => {
      const getMillis = (pedido: Pedido) => {
        const f: any = pedido.fecha;
        if (!f) return 0;
        if (f instanceof Date) return f.getTime();
        if (typeof f?.toDate === "function") return f.toDate().getTime();
        if (typeof f?.seconds === "number") return f.seconds * 1000;
        if (typeof f === "string") {
          const d = new Date(f);
          return Number.isNaN(d.getTime()) ? 0 : d.getTime();
        }
        if (typeof f === "number") return f;
        return 0;
      };

      return sort === "ultimo"
        ? getMillis(b) - getMillis(a)
        : getMillis(a) - getMillis(b);
    });

    return base;
  }, [pedidos, tab, sort]);

  const pageCount = Math.max(1, Math.ceil(pedidosFiltrados.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pedidosPaginados = pedidosFiltrados.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const tabBase =
    "px-5 py-2 rounded-full font-extrabold transition " +
    "focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="w-full flex flex-col gap-6 px-4 md:px-8">
      {/* Tabs + orden */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="inline-flex rounded-full bg-muted/60 p-1.5 border border-border/60 shadow-sm gap-2 flex-wrap">
          <button
            onClick={() => setTab("pendientes")}
            className={[
              tabBase,
              tab === "pendientes"
                ? "bg-primary text-primary-foreground border border-primary/30"
                : "bg-card text-muted-foreground border border-border/60 hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            Pendientes
          </button>
          <button
            onClick={() => setTab("voucher")}
            className={[
              tabBase,
              tab === "voucher"
                ? "bg-cyan-600 text-white border border-cyan-700"
                : "bg-card text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:bg-muted",
            ].join(" ")}
          >
            Voucher subido
          </button>
          <button
            onClick={() => setTab("pagados")}
            className={[
              tabBase,
              tab === "pagados"
                ? "bg-emerald-600 text-white border border-emerald-700"
                : "bg-card text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-muted",
            ].join(" ")}
          >
            Pagados
          </button>
          <button
            onClick={() => setTab("rechazados")}
            className={[
              tabBase,
              tab === "rechazados"
                ? "bg-rose-600 text-white border border-rose-700"
                : "bg-card text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-muted",
            ].join(" ")}
          >
            Rechazados
          </button>
          <button
            onClick={() => setTab("todos")}
            className={[
              tabBase,
              tab === "todos"
                ? "bg-card text-foreground border border-border/60"
                : "bg-card text-muted-foreground border border-border/60 hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            Todos
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-semibold">Orden:</span>

          <div className="inline-flex rounded-full bg-muted/60 p-1.5 border border-border/60 shadow-sm gap-2">
            <button
              onClick={() => setSort("primero")}
              className={[
                "px-4 py-1.5 rounded-full text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-ring",
                sort === "primero"
                  ? "bg-card text-foreground border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              title="Primero"
              type="button"
            >
              Primero
            </button>
            <button
              onClick={() => setSort("ultimo")}
              className={[
                "px-4 py-1.5 rounded-full text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-ring",
                sort === "ultimo"
                  ? "bg-card text-foreground border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              title="Último"
              type="button"
            >
              Último
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="w-full">
        {pedidosPaginados.map((pedido) => {
          const principal = pedido.productos?.[0];
          const extraCount = Math.max((pedido.productos?.length ?? 0) - 1, 0);
          const code = pedido.id.slice(-5).toUpperCase();

          const hasVoucher =
            pedido.voucher?.status === "uploaded" && !!pedido.voucher?.path;
          const isVoucherSubido = pedido.estadoPago === "voucher_subido" || hasVoucher;
          const isRechazado = pedido.estadoPago === "rechazado";

          const canViewVoucher = !!pedido.voucher?.path;

          const canApprove =
            pedido.medioPago !== "tarjeta" &&
            (pedido.medioPago === "yape" || pedido.medioPago === "plin") &&
            isVoucherSubido &&
            !pedido.pagoConfirmado &&
            pedido.estadoPago !== "pagado" &&
            !isRechazado;

          const telefono = pickTelefono(pedido);

          const waText = (() => {
            if (pedido.pagoConfirmado || pedido.estadoPago === "pagado" || pedido.medioPago === "tarjeta") {
              return `Hola ${pedido.nombreCliente || ""}. Pago confirmado ✅ del pedido #${code}. ¡Gracias!`;
            }
            if (isRechazado && pedido.accessToken) {
              const link = buildVoucherLink(pedido.id, pedido.accessToken);
              return `Hola ${pedido.nombreCliente || ""}. Tu voucher del pedido #${code} fue rechazado 🙏 ¿podrías reenviarlo aquí? ${link}`;
            }
            if (isVoucherSubido) {
              return `Hola ${pedido.nombreCliente || ""}. Ya recibí tu voucher del pedido #${code}. Estoy revisándolo 🙌`;
            }
            if (pedido.accessToken) {
              const link = buildVoucherLink(pedido.id, pedido.accessToken);
              return `Hola ${pedido.nombreCliente || ""}. Para confirmar tu pedido #${code}, por favor sube tu voucher aquí: ${link}`;
            }
            return `Hola ${pedido.nombreCliente || ""}. Sobre tu pedido #${code}, ¿me confirmas tu voucher por favor?`;
          })();

          const waUrlCliente = telefono
            ? buildWaMeUrl(String(telefono).replace(/\D/g, ""), waText)
            : buildWaMeUrl(WHATSAPP_TIENDA_E164_NO_PLUS, waText);

          return (
            <div
              key={pedido.id}
              className="bg-card text-card-foreground border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 mb-5 w-full"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-foreground text-lg">
                      Pedido #{code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatFirestoreDate(pedido.fecha)}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground mt-1">
                    Cliente:{" "}
                    <span className="text-foreground font-bold">
                      {pedido.nombreCliente || "Online"}
                    </span>
                    {pedido.alergias && (
                      <span className="ml-3 px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
                        Alergias: {pedido.alergias}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center md:justify-end">
                  {pagoPill(pedido)}
                  {estadoPagoPill(pedido)}

                  <a
                    href={waUrlCliente}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold bg-card border border-border/60 hover:bg-muted transition"
                    title="Escribir por WhatsApp"
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp
                  </a>
                </div>
              </div>

              {principal && (
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  {principal.imagen ? (
                    <img
                      src={principal.imagen}
                      alt={principal.nombre}
                      className="w-full md:w-28 h-40 md:h-28 object-cover rounded-xl border border-border/60 shadow-sm"
                    />
                  ) : (
                    <div className="w-full md:w-28 h-40 md:h-28 rounded-xl bg-muted border border-border/60" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-foreground text-lg truncate">
                      {principal.nombre}{" "}
                      <span className="font-normal text-xs text-muted-foreground">
                        {principal.tamaño}
                      </span>
                    </div>
                    <div className="text-foreground font-bold mt-1">
                      x{principal.cantidad}{" "}
                      <span className="font-normal text-xs text-muted-foreground">
                        S/{principal.precioUnit}
                      </span>
                      {extraCount > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          +{extraCount} item{extraCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="md:text-right w-full md:w-auto">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-2xl font-black text-foreground">
                      S/{Number(pedido.total).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {canViewVoucher && (
                    <button
                      onClick={() => setSelectedPedido(pedido)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold bg-primary text-primary-foreground hover:bg-primary/90 transition"
                      type="button"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver voucher
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  {canApprove && (
                    <button
                      onClick={() => void aprobarPago(pedido)}
                      disabled={procesando === pedido.id}
                      className={[
                        "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition",
                        procesando === pedido.id
                          ? "opacity-60 pointer-events-none bg-emerald-600 text-white"
                          : "bg-emerald-600 text-white hover:bg-emerald-700",
                      ].join(" ")}
                      type="button"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {procesando === pedido.id ? "Procesando…" : "Aprobar pago"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {pedidosFiltrados.length === 0 && (
          <div className="text-muted-foreground text-sm text-center my-14">
            No hay pedidos en esta sección.
          </div>
        )}

        {pedidosFiltrados.length > 0 && (
          <Pagination
            page={safePage}
            pageCount={pageCount}
            onPageChange={(p) => setPage(Math.max(1, Math.min(pageCount, p)))}
          />
        )}
      </div>

      <VoucherModal
        abierto={!!selectedPedido}
        pedido={selectedPedido}
        onClose={() => setSelectedPedido(null)}
        onApprove={async () => {
          if (!selectedPedido) return;
          await aprobarPago(selectedPedido);
        }}
        onReject={async (motivo) => {
          if (!selectedPedido) return;
          await rechazarPago(selectedPedido, motivo);
        }}
      />
    </div>
  );
}