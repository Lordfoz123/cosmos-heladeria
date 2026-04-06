"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { CheckCircle2, ShoppingBag, Rocket } from "lucide-react";

// Configuración sincronizada con tu número actualizado
const WHATSAPP_NUMBER = "51907414295";

export default function GraciasPagoPage() {
  const params = useParams<{ pedidoId: string }>();
  const searchParams = useSearchParams();

  const pedidoId = params?.pedidoId;
  const token = searchParams?.get("t") ?? "";

  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const pedidoCode = useMemo(
    () => (pedidoId ? pedidoId.slice(-5).toUpperCase() : ""),
    [pedidoId]
  );

  useEffect(() => {
    async function loadPedido() {
      if (!pedidoId) return setLoading(false);
      try {
        const snap = await getDoc(doc(db, "pedidos", pedidoId));
        if (snap.exists()) {
          const data = snap.data();
          // Validación de token por seguridad
          if (token === data.accessToken || !data.accessToken) {
            setPedido(data);
          } else {
            setError("Acceso no autorizado a la misión.");
          }
        } else {
            setError("No se encontró el registro de la misión.");
        }
      } catch (e) {
        setError("Error al conectar con la base central.");
      } finally {
        setLoading(false);
      }
    }
    loadPedido();
  }, [pedidoId, token]);

  // Generamos el mensaje dinámico para el botón final
  const handleWhatsAppChat = () => {
    if (!pedido) return;

    const baseUrl = window.location.origin;
    
    // Mapeamos los items para incluir el enlace al producto y forzar la miniatura en WA
    const productosTxt = pedido.items.map((item: any) => {
        const productLink = `${baseUrl}/producto/${item.productoId}`;
        return `• ${item.nombre} (${item.tamano}) x${item.cantidad}\n   S/ ${(item.precio * item.cantidad).toFixed(2)}\n   Ver: ${productLink}`;
    }).join('\n\n');

    const mensaje = encodeURIComponent(
        `🍦 *NUEVO PEDIDO - COSMOS HELADERÍA*\n` +
        `--------------------------------\n` +
        `*ID Pedido:* #${pedidoCode}\n\n` +
        `*DATOS DEL CLIENTE:*\n` +
        `👤 Nombre: ${pedido.nombreCliente}\n` +
        `📞 WhatsApp: ${pedido.telefono}\n` +
        `📍 Dirección: ${pedido.direccion}\n` +
        `${pedido.referencia ? `🏠 Ref: ${pedido.referencia}\n` : ''}\n` +
        `*DETALLE DEL PEDIDO:*\n` +
        `${productosTxt}\n\n` +
        `*TOTAL A PAGAR: S/ ${pedido.total.toFixed(2)}*\n` +
        `--------------------------------\n` +
        `Confirmado desde la web. ¡Espero mi helado! 🚀`
    );

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`, '_blank');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] flex flex-col items-center justify-center gap-4 text-white font-sans">
        <Rocket className="w-12 h-12 text-primary animate-bounce" />
        <p className="font-bold tracking-widest text-xs animate-pulse">SINCRONIZANDO CON BASE CENTRAL...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white font-sans">
      {/* FONDO ESPACIAL */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.22),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(34,211,238,0.18),transparent_45%)]" />
        <div className="stars absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
        {/* ASTRONAUTA CON ANIMACIÓN SUTIL */}
        <div className="mb-8 animate-float">
          <Image
            src="/astronauta-moto.png"
            alt="Astronauta Cosmos"
            width={240}
            height={240}
            priority
            className="drop-shadow-[0_20px_50px_rgba(59,130,246,0.5)]"
          />
        </div>

        <section className="w-full space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">
              ¡Misión Registrada!
            </h1>
            <p className="text-blue-200/70 font-medium text-lg italic">
              {pedido?.nombreCliente ? `Todo listo para el despegue, ${pedido.nombreCliente.split(' ')[0]}` : 'Cargamento listo en plataforma'}.
            </p>
          </div>

          {error ? (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-red-200 text-sm font-bold uppercase tracking-widest">
              ⚠️ {error}
            </div>
          ) : (
            <>
              {/* TARJETA DE RESUMEN TÉCNICO */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                <div className="flex justify-around items-center border-b border-white/10 pb-6">
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Código Pedido</p>
                    <p className="text-2xl font-black text-white tracking-tighter">#{pedidoCode}</p>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Total Misión</p>
                    <p className="text-2xl font-black text-emerald-400 tracking-tighter">S/ {Number(pedido?.total || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <p className="text-[11px] text-left text-emerald-100 font-bold leading-relaxed uppercase">
                    Misión guardada con éxito. Pulsa el botón inferior para notificarnos y coordinar el pago por WhatsApp.
                  </p>
                </div>

                {/* BOTÓN PRINCIPAL WHATSAPP */}
                <button
                  onClick={handleWhatsAppChat}
                  className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#1ebc57] text-white h-16 rounded-[1.8rem] font-black text-lg transition-all shadow-xl shadow-green-500/20 active:scale-95"
                >
                  <WhatsAppIcon />
                  FINALIZA TU PEDIDO
                </button>
              </div>

              <Link
                href="/tienda"
                className="inline-flex items-center gap-2 text-white/40 hover:text-white font-bold text-[10px] uppercase tracking-[0.3em] transition-colors pt-4"
              >
                <ShoppingBag className="w-4 h-4" />
                Regresar a la Galaxia Tienda
              </Link>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .stars {
          background-image: radial-gradient(2px 2px at 20px 30px, #eee, transparent),
                            radial-gradient(1px 1px at 100px 80px, #fff, transparent),
                            radial-gradient(2px 2px at 220px 120px, #ddd, transparent);
          background-size: 550px 400px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        .animate-float {
          animation: float 4.5s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}

function WhatsAppIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-brand-whatsapp">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
        <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
      </svg>
    );
}