"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { CheckCircle2, Phone, AlertTriangle, Hourglass } from "lucide-react";

const WHATSAPP_TIENDA_E164_NO_PLUS = "51965127795";
const ASTRONAUT_URL =
  "https://fullframe-design.com/wp-content/uploads/2026/01/imagen-gracias.png";

type PedidoData = {
  accessToken?: string;
  nombreCliente?: string;
  total?: number;
  medioPago?: string;
  pagoConfirmado?: boolean;
  estadoPago?: string; // pagado_confirmado | pendiente_confirmacion | pendiente_voucher | etc
};

function buildWaMeUrl(phoneE164NoPlus: string, text: string) {
  return `https://wa.me/${phoneE164NoPlus}?text=${encodeURIComponent(text)}`;
}

export default function GraciasPagoPage() {
  const params = useParams<{ pedidoId: string }>();
  const searchParams = useSearchParams();

  const pedidoId = params?.pedidoId;
  const token = searchParams?.get("t") ?? "";

  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<PedidoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pedidoCode = useMemo(
    () => (pedidoId ? pedidoId.slice(-5).toUpperCase() : ""),
    [pedidoId]
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!pedidoId) {
        setError("Pedido inválido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const timeout = setTimeout(() => {
        if (!alive) return;
        setError("No se pudo cargar el pedido (timeout).");
        setLoading(false);
      }, 7000);

      try {
        const refPedido = doc(db, "pedidos", pedidoId);
        const snap = await getDoc(refPedido);

        if (!alive) return;

        if (!snap.exists()) {
          setError("Pedido no encontrado.");
          setPedido(null);
          return;
        }

        const data = snap.data() as PedidoData;

        // ✅ Validación token
        if (!token || token !== data.accessToken) {
          setError("Link inválido o expirado.");
          setPedido(null);
          return;
        }

        setPedido(data);
      } catch (e: any) {
        console.error("Error getDoc:", e);
        setError(e?.message || "Error cargando el pedido.");
        setPedido(null);
      } finally {
        clearTimeout(timeout);
        if (!alive) return;
        setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [pedidoId, token]);

  const nombre = (pedido?.nombreCliente || "").trim();
  const saludo = nombre ? `¡Gracias, ${nombre}!` : "¡Gracias por tu compra!";

  const isIzipay = (pedido?.medioPago || "").toLowerCase() === "izipay";
  const estadoPago = (pedido?.estadoPago || "").toLowerCase();
  const pagadoConfirmado =
    Boolean(pedido?.pagoConfirmado) || estadoPago === "pagado_confirmado";

  const statusUi = useMemo(() => {
    if (error) return { kind: "error" as const };

    if (!pedido) return { kind: "error" as const };

    if (!isIzipay) {
      return {
        kind: "not-card" as const,
        title: "Pedido registrado",
        desc: "Tu pedido fue registrado. Si pagas por voucher, súbelo en la pantalla anterior.",
      };
    }

    if (pagadoConfirmado) {
      return {
        kind: "ok" as const,
        title: "Pago confirmado",
        desc: "Tu pago fue confirmado ✅. En breve coordinamos contigo.",
      };
    }

    return {
      kind: "pending" as const,
      title: "Pago en verificación",
      desc: "Estamos verificando tu pago con tarjeta. Te contactaremos en breve.",
    };
  }, [error, pedido, isIzipay, pagadoConfirmado]);

  const waText = useMemo(() => {
    if (statusUi.kind === "ok") {
      return `Hola, soy ${nombre || "cliente"} 😊. Realicé el pedido #${pedidoCode} y mi pago con tarjeta fue confirmado. ¿Me ayudas con la coordinación?`;
    }
    return `Hola, soy ${nombre || "cliente"} 😊. Realicé el pedido #${pedidoCode}. ¿Me ayudas con la coordinación?`;
  }, [nombre, pedidoCode, statusUi.kind]);

  const waUrl = buildWaMeUrl(WHATSAPP_TIENDA_E164_NO_PLUS, waText);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] text-white grid place-items-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur-md">
          <h1 className="text-2xl font-extrabold">Cargando…</h1>
          <p className="mt-2 text-white/70">Preparando tu confirmación.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.22),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(34,211,238,0.18),transparent_45%)]" />
        <div className="stars absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 py-10">
        <div className="mb-3 mt-2 animate-float">
          <Image
            src={ASTRONAUT_URL}
            alt="Astronauta"
            width={260}
            height={260}
            priority
            className="drop-shadow-[0_20px_35px_rgba(0,0,0,0.45)]"
          />
        </div>

        <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          <h1 className="text-center text-3xl font-bold leading-tight">{saludo}</h1>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4 text-rose-100 text-sm font-semibold">
              {error}
            </div>
          ) : (
            <>
              <p className="mt-3 text-center text-white/80">{statusUi.desc}</p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-white/90">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-white/60">Pedido</div>
                    <div className="text-lg font-extrabold">#{pedidoCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-white/60">Total</div>
                    <div className="text-lg font-extrabold">
                      S/{Number(pedido?.total ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {statusUi.kind === "ok" ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-200 border border-emerald-400/30">
                    <CheckCircle2 className="h-4 w-4" />
                    Pagado con tarjeta
                  </div>
                ) : statusUi.kind === "pending" ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-100 border border-amber-400/30">
                    <Hourglass className="h-4 w-4" />
                    Pago en verificación
                  </div>
                ) : (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-extrabold text-sky-100 border border-sky-400/30">
                    <AlertTriangle className="h-4 w-4" />
                    Pedido registrado
                  </div>
                )}
              </div>

              <a
                href={waUrl}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-extrabold shadow transition bg-emerald-500 text-white hover:bg-emerald-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="h-5 w-5" />
                Contactar por WhatsApp
              </a>

              <div className="mt-3">
                <Link
                  href="/tienda"
                  className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 font-extrabold shadow transition bg-white/10 text-white hover:bg-white/15 border border-white/10"
                >
                  Volver a la tienda
                </Link>
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .stars {
          background-image: radial-gradient(
              2px 2px at 20px 30px,
              rgba(255, 255, 255, 0.32),
              transparent 40%
            ),
            radial-gradient(
              1px 1px at 100px 80px,
              rgba(255, 255, 255, 0.22),
              transparent 40%
            ),
            radial-gradient(
              2px 2px at 220px 120px,
              rgba(255, 255, 255, 0.2),
              transparent 40%
            ),
            radial-gradient(
              1px 1px at 340px 200px,
              rgba(255, 255, 255, 0.16),
              transparent 40%
            ),
            radial-gradient(
              2px 2px at 480px 70px,
              rgba(255, 255, 255, 0.16),
              transparent 40%
            ),
            radial-gradient(
              1px 1px at 560px 260px,
              rgba(255, 255, 255, 0.14),
              transparent 40%
            );
          background-size: 600px 320px;
          background-repeat: repeat;
          filter: blur(0.2px);
        }

        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .animate-float {
          animation: float 4.5s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}