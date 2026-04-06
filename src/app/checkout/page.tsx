"use client";

import { useCarrito } from "@/components/CarritoContext";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import confetti from "canvas-confetti";
import { MapPin, User, Info, ShieldCheck, Truck, Loader2 } from "lucide-react";
import HeaderCosmos from "@/components/HeaderCosmos"; // 🔥 Importamos el header global

// Configuración de WhatsApp
const WHATSAPP_NUMBER = "51907414295"; 

// Distritos de Arequipa Metropolitana
const AREQUIPA_DISTRITOS = [
  "Arequipa (Cercado)", "Alto Selva Alegre", "Cayma", "Cerro Colorado", 
  "Jacobo Hunter", "José Luis Bustamante y Rivero", "Mariano Melgar", 
  "Miraflores", "Paucarpata", "Sabandía", "Sachaca", "Socabaya", 
  "Tiabaya", "Yanahuara"
];

// Generador de Token de seguridad
function generateAccessToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

export default function CheckoutPage() {
  const router = useRouter();
  const { carrito, limpiarCarrito } = useCarrito();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [distrito, setDistrito] = useState("Yanahuara");
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);

  const totalCalculado = useMemo(() => {
    return (carrito ?? []).reduce((acc, item: any) => {
      const precioUnit = item.producto.tamanos?.find((t:any) => t.id === item.tamaño)?.precio || 0;
      return acc + (precioUnit * item.cantidad);
    }, 0);
  }, [carrito]);

  async function handleFinalizarPedido(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre || !telefono || !direccion) return toast.error("Completa los datos de entrega");
    if (carrito.length === 0) return toast.error("Tu carrito está vacío");

    setEnviando(true);

    try {
      const accessToken = generateAccessToken();
      
      // 1. Registro en Base de Datos
      const docRef = await addDoc(collection(db, "pedidos"), {
        cliente: nombre,
        nombreCliente: nombre, 
        telefono,
        direccion: `${direccion}, ${distrito}`,
        referencia,
        items: carrito.map((item: any) => ({
            productoId: item.producto.id,
            nombre: item.producto.nombre,
            tamano: item.tamaño,
            cantidad: item.cantidad,
            precio: item.producto.tamanos?.find((t:any) => t.id === item.tamaño)?.precio || 0,
            imagen: item.producto.imagen 
        })),
        total: totalCalculado,
        accessToken: accessToken,
        estado: "Pendiente WhatsApp",
        fecha: Timestamp.now()
      });

      // 2. Celebración
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      toast.success("¡Misión iniciada!");

      // 3. Redirección inmediata a la Página de Gracias
      limpiarCarrito();
      router.push(`/pedido/${docRef.id}/gracias?t=${accessToken}`);

    } catch (error) {
        toast.error("Error al procesar pedido");
        setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* 🔥 AÑADIMOS EL HEADER GLOBAL ESTÁNDAR 🔥 */}
      <HeaderCosmos logoHref="/tienda" showWishlist showCart />
      
      <main className="max-w-6xl mx-auto py-12 px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-4">
        <Toaster position="top-center" />

        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-6">
              <div className="relative w-28 h-28 shrink-0 animate-[float_6s_ease-in-out_infinite]">
                  <img 
                      src="/astronauta-moto.png" 
                      alt="Delivery Cosmos" 
                      className="w-full h-full object-contain drop-shadow-md"
                  />
              </div>
              <style jsx>{`
                  @keyframes float {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-4px); }
                  }
              `}</style>
              <div>
                  <h1 className="text-4xl font-black text-foreground tracking-tight mb-1 uppercase italic">Finalizar Compra</h1>
                  <p className="text-muted-foreground font-medium flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Delivery intergaláctico en Arequipa
                  </p>
              </div>
          </div>

          <form onSubmit={handleFinalizarPedido} className="space-y-6">
            <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm space-y-4 hover:border-blue-500/30 transition-colors">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> Datos del Explorador
              </h2>
              <input
                  placeholder="Nombre y Apellidos"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-transparent focus:border-blue-500/30 focus:bg-background transition-all outline-none font-bold placeholder:text-muted-foreground/50 text-foreground"
                  required
              />
              <input
                  placeholder="WhatsApp (9 dígitos)"
                  value={telefono}
                  maxLength={9}
                  onChange={e => setTelefono(e.target.value.replace(/\D/g, ""))}
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-transparent focus:border-blue-500/30 focus:bg-background transition-all outline-none font-bold placeholder:text-muted-foreground/50 text-foreground"
                  required
              />
            </div>

            <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm space-y-4 hover:border-blue-500/30 transition-colors">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Punto de Aterrizaje
              </h2>
              <select 
                  value={distrito} 
                  onChange={e => setDistrito(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-transparent focus:border-blue-500/30 focus:bg-background outline-none font-bold appearance-none cursor-pointer text-foreground"
              >
                  {AREQUIPA_DISTRITOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input
                  placeholder="Dirección exacta (Calle, Número, Urbanización)"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-transparent focus:border-blue-500/30 focus:bg-background transition-all outline-none font-bold placeholder:text-muted-foreground/50 text-foreground"
                  required
              />
              <textarea
                  placeholder="Referencia (ej. Portón azul, frente al parque)"
                  value={referencia}
                  onChange={e => setReferencia(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-transparent focus:border-blue-500/30 focus:bg-background transition-all outline-none font-medium min-h-[100px] resize-none placeholder:text-muted-foreground/50 text-foreground"
              />
            </div>

            <div className="bg-muted/30 p-6 rounded-[2rem] border border-border">
               <div className="flex items-center gap-3 text-foreground mb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="font-bold text-sm uppercase tracking-widest">Protocolo de Envío</span>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-2 font-medium">
                  <p>• Los pedidos se procesan tras validar el pago por WhatsApp.</p>
                  <p>• El tiempo estimado de entrega es de máximo <span className="font-bold text-foreground">24 horas</span>.</p>
                  <p>• El delivery <b className="text-foreground">no está incluido en el precio del producto</b>.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={enviando || carrito.length === 0}
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white h-20 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-500/20 active:scale-95 disabled:opacity-50 hover:scale-[1.02]"
            >
              {enviando ? <Loader2 className="animate-spin w-6 h-6" /> : <WhatsAppIcon />}
              REALIZAR PEDIDO
            </button>
          </form>
        </section>

        {/* RESUMEN LATERAL ADAPTADO AL MODO OSCURO */}
        <aside className="lg:sticky lg:top-28 h-fit animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">Mi Cargamento</h2>
              
              <div className="space-y-3">
                  {carrito.map((item: any, idx: number) => {
                      const precioUnit = item.producto.tamanos?.find((t:any) => t.id === item.tamaño)?.precio || 0;
                      return (
                          <div key={idx} className="flex items-center gap-4 bg-background p-3 rounded-2xl border border-border shadow-sm hover:border-primary/20 transition-colors">
                              <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0 bg-muted/50 p-1">
                                  <img src={item.producto.imagen || "/icons/pote-16oz.png"} className="w-full h-full object-contain" alt={item.producto.nombre} />
                              </div>
                              <div className="flex-1">
                                  <p className="font-bold text-sm uppercase leading-tight text-foreground line-clamp-1">{item.producto.nombre}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{item.tamaño} • Cant: <span className="text-foreground">{item.cantidad}</span></p>
                              </div>
                              <p className="font-black text-sm text-foreground tabular-nums">S/ {(precioUnit * item.cantidad).toFixed(2)}</p>
                          </div>
                      );
                  })}
              </div>

              <div className="pt-6 border-t border-border/50 border-dashed space-y-3">
                  <div className="flex justify-between items-center text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span className="tabular-nums">S/ {totalCalculado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-foreground font-black text-2xl tracking-tighter">
                      <span>TOTAL</span>
                      <span className="text-emerald-500 tabular-nums">S/ {totalCalculado.toFixed(2)}</span>
                  </div>
              </div>

              {/* 🔥 CARTEL INFORMATIVO ADAPTADO 🔥 */}
              <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 flex gap-3 items-center shadow-sm">
                  <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-widest leading-relaxed">
                      Confirmaremos el pago por WhatsApp para proceder con el envío.
                  </p>
              </div>
          </div>
        </aside>
      </main>
    </div>
  );
}