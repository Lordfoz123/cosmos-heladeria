"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCarrito } from "@/components/CarritoContext";
import CartSlider from "@/components/CartSlider";
import { Card, CardContent } from "@/components/ui/card";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Heart, ShoppingCart, Sparkles, LogIn, X, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import HeaderCosmos from "@/components/HeaderCosmos";
import { motion, AnimatePresence } from "framer-motion";

// 🔥 CONFIGURACIÓN DE ETIQUETAS (ESTILO STICKER SÓLIDO) 🔥
const TAG_CONFIG: Record<string, { bg: string, text: string }> = {
    "Sin Azúcar": { bg: "bg-[#29b6f6]", text: "Sin Azúcar" },
    "Sin Lácteos": { bg: "bg-[#8bc34a]", text: "Sin Lácteos" },
    "Sin Gluten": { bg: "bg-[#ffc107]", text: "Sin Gluten" },
    "Sin Soya": { bg: "bg-[#ec407a]", text: "Sin Soya" },
};

const IMAGENES_TAMANOS: Record<string, string> = {
    '8oz':  '/icons/pote-8oz.png',
    '16oz': '/icons/pote-16oz.png',
    '32oz': '/icons/pote-32oz.png'
};

const ESCALAS_VISUALES: Record<string, string> = {
    '8oz':  'scale-[0.7]',
    '16oz': 'scale-[0.85]',
    '32oz': 'scale-[1.05]'
};

export default function TiendaOnline() {
  const router = useRouter();
  const { user } = useAuth() || {}; 
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [stars, setStars] = useState<{ id: number; top: number; left: number; size: number; duration: number; delay: number; xMove: number; yMove: number; }[]>([]);
  
  const carritoApi = useCarrito();
  const carrito = carritoApi?.carrito || [];
  const addToCart = carritoApi?.addToCart || (() => {});
  const updateCantidad = carritoApi?.updateCantidad || (() => {});
  const removeFromCart = carritoApi?.removeFromCart || (() => {});
  const showCart = carritoApi?.showCart || false;
  const setShowCart = carritoApi?.setShowCart || (() => {});
  const total = carritoApi?.total || 0;
  const finalizarCompra = carritoApi?.finalizarCompra || (() => {});
  const wishlist = carritoApi?.wishlist || [];
  const addToWishlist = carritoApi?.addToWishlist || (() => {});
  const removeFromWishlist = carritoApi?.removeFromWishlist || (() => {});

  useEffect(() => {
    const generateStars = () => {
      return Array.from({ length: 40 }).map((_, i) => ({
        id: i, 
        top: Math.floor(Math.random() * 100), 
        left: Math.floor(Math.random() * 100),
        size: Math.random() > 0.5 ? 2 : 3, 
        duration: Math.floor(Math.random() * 10) + 20,
        delay: Math.floor(Math.random() * 5), 
        xMove: Math.floor((Math.random() - 0.5) * 40), 
        yMove: Math.floor((Math.random() - 0.5) * 40),
      }));
    };
    setStars(generateStars());
  }, []);

  useEffect(() => {
    const q = query(collection(db, "productos_tienda"), where("activo", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const isInWishlist = (id: string) => wishlist.some((w: any) => w.id === id);

  const toggleWishlist = (prod: any) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    if (isInWishlist(prod.id)) {
        removeFromWishlist(prod.id);
    } else {
        addToWishlist(prod);
    }
  };

  return (
    <section className="w-full bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-200 min-h-screen font-sans selection:bg-[#bcd4dc]/30 pb-32 relative overflow-x-hidden transition-colors duration-300">
      
      <div className="hidden dark:block absolute inset-0 z-0 overflow-hidden pointer-events-none fixed">
        {stars.map((star) => (
          <motion.div 
            key={star.id} 
            className="absolute bg-white rounded-full"
            style={{ 
              width: `${star.size}px`, height: `${star.size}px`, top: `${star.top}%`, left: `${star.left}%`,
              boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.6)`
            }}
            animate={{ x: [0, star.xMove, 0], y: [0, star.yMove, 0], opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: star.duration, delay: star.delay, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      <div className="relative z-40">
        <HeaderCosmos logoHref="/" showWishlist showCart />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto">
          <div className="px-6 mt-10 mb-16">
            <div className="relative overflow-hidden rounded-[3rem] bg-black h-[400px] flex items-center shadow-lg dark:shadow-2xl group transition-all duration-300">
                <img src="/hero-tienda.webp" onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2000&auto=format&fit=crop" }} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90" alt="Hero Tienda" />
                <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative z-20 p-8 md:p-16 max-w-2xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 bg-[#bcd4dc]/20 backdrop-blur-md border border-[#bcd4dc]/50 px-4 py-1.5 rounded-full text-white dark:text-[#bcd4dc] text-[11px] font-bold tracking-wide shadow-sm mb-6">
                        <Sparkles className="w-3 h-3 text-[#bcd4dc]" /> Catálogo Completo
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight text-balance leading-none transition-colors duration-300">
                        Tienda <span className="text-[#bcd4dc] drop-shadow-md">Cosmos</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-slate-200 font-medium text-lg md:text-xl transition-colors duration-300">
                        Nuestra galaxia de sabores Plant-Based listos para abducir tu paladar.
                    </motion.p>
                </div>
            </div>
          </div>

          <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-6">
            {loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-32 text-slate-500">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#bcd4dc]" />
                  <p className="font-bold uppercase tracking-widest text-sm">Escaneando catálogo...</p>
              </div>
            ) : productos.length === 0 ? (
              <div className="col-span-full text-center py-32 text-slate-500 font-bold uppercase tracking-widest">
                  No hay misiones disponibles en este cuadrante.
              </div>
            ) : (
              productos.map((prod) => (
                <ProductoTiendaCard key={prod.id} prod={prod} onToggleWishlist={() => toggleWishlist(prod)} isWishlisted={isInWishlist(prod.id)} addToCart={addToCart} />
              ))
            )}
          </div>
      </div>

      <CartSlider show={showCart} cart={carrito} onClose={() => setShowCart(false)} updateCantidad={updateCantidad} removeFromCart={removeFromCart} total={total} finalizarCompra={finalizarCompra} />

      <AnimatePresence>
        {loginModalOpen && (
          <motion.div className="fixed inset-0 z-[99999] bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-colors duration-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLoginModalOpen(false)}>
            <motion.div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[2rem] shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 overflow-hidden text-center relative transition-colors duration-300" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setLoginModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              <div className="p-8 pt-12">
                <div className="w-20 h-20 bg-pink-50 dark:bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-pink-100 dark:border-pink-500/20"><Heart className="w-10 h-10 text-pink-500 fill-pink-500 animate-pulse" /></div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">¡Guarda tus favoritos!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">Crea una cuenta o inicia sesión para armar tu propia colección de sabores y pedirlos cuando quieras.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => router.push("/login?next=/tienda")} className="w-full py-4 bg-[#bcd4dc] text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"><LogIn className="w-4 h-4" /> Entrar / Registrarse</button>
                  <button onClick={() => setLoginModalOpen(false)} className="w-full py-4 bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">Seguir explorando</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ProductoTiendaCard({ prod, onToggleWishlist, isWishlisted, addToCart }: any) {
  const [selectedTam, setSelectedTam] = useState<any>(null);
  const [showSizes, setShowSizes] = useState(false);
  const tamanosDisponibles = (prod.tamanos || []).filter((t: any) => t.precio > 0);

  return (
    <Card className="group rounded-[2.5rem] border-0 shadow-xl hover:shadow-2xl dark:border dark:border-white/5 dark:shadow-none bg-white dark:bg-[#0B0F19] overflow-hidden transition-all duration-500 hover:-translate-y-2 flex flex-col h-full relative">
      
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-50 dark:bg-[#030712] m-2 rounded-[2.2rem] transition-colors duration-300">
        <Link href={`/producto/${prod.id}`} className="block w-full h-full">
            <img src={prod.imagen || "/icons/pote-16oz.png"} alt={prod.nombre} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 dark:from-[#030712] via-transparent to-transparent opacity-80" />
        </Link>
        
        {/* Botón de favoritos (Esquina superior derecha) */}
        <button 
          onClick={onToggleWishlist}
          className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors border shadow-sm ${isWishlisted ? 'bg-pink-50 dark:bg-pink-500/20 border-pink-200 dark:border-pink-500/40 text-pink-500' : 'bg-white/80 dark:bg-black/40 backdrop-blur-md border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-black/60'}`}
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* 🔥 STICKER GIGANTE: SOLO SIN AZÚCAR, ABAJO A LA DERECHA 🔥 */}
        {prod.etiquetas && prod.etiquetas.includes("Sin Azúcar") && (
            <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
                {prod.etiquetas
                    .filter((etiquetaId: string) => etiquetaId === "Sin Azúcar")
                    .map((etiquetaId: string) => {
                    const tagData = TAG_CONFIG[etiquetaId];
                    if (!tagData) return null;
                    return (
                        <div key={etiquetaId} className={`relative flex flex-col items-center justify-center w-[75px] h-[75px] rounded-full shadow-lg border-[3px] border-white dark:border-[#0B0F19] ${tagData.bg}`}>
                            <div className="absolute inset-[3px] border border-dashed border-white/70 rounded-full" />
                            
                            {/* Texto más grande, sin ícono y centrado */}
                            <span className="text-[10px] font-black text-white uppercase text-center leading-[1.1] px-1 z-10 break-words w-full">
                                Sin<br/>Azúcar
                            </span>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      <CardContent className="p-6 pt-4 flex flex-col flex-1 relative z-10">
        <div className="mb-4">
            <Link href={`/producto/${prod.id}`}>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1 line-clamp-1 hover:text-[#bcd4dc] dark:hover:text-[#bcd4dc] transition-colors">{prod.nombre}</h3>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium leading-relaxed transition-colors duration-300">{prod.descripcion}</p>
        </div>

        <div className="relative mb-6 mt-auto">
            <button 
                onClick={() => setShowSizes(!showSizes)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#030712] border border-slate-100 dark:border-slate-800/60 hover:border-[#bcd4dc]/50 transition-all text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
                {selectedTam ? (
                    <div className="flex items-center gap-3">
                        <img 
                            src={IMAGENES_TAMANOS[selectedTam.id] || "/icons/pote-16oz.png"} 
                            className={`w-6 h-6 object-contain ${ESCALAS_VISUALES[selectedTam.id] || ''} drop-shadow-md`} 
                            alt="size" 
                        />
                        <span className="text-sm font-bold">{selectedTam.nombre}</span>
                    </div>
                ) : (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest pl-2">Elige Tamaño</span>
                )}
                <span className={`text-[10px] font-black transition-transform ${showSizes ? 'rotate-180 text-[#bcd4dc]' : ''}`}>▼</span>
            </button>

            <AnimatePresence>
              {showSizes && (
                  <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-[calc(100%+8px)] left-0 w-full bg-white dark:bg-[#0B0F19] border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden z-30 transition-colors duration-300"
                  >
                      {tamanosDisponibles.map((t: any) => (
                          <button 
                              key={t.id}
                              onClick={() => { setSelectedTam(t); setShowSizes(false); }}
                              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#030712] transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                          >
                              <div className="flex items-center gap-4">
                                  <img src={IMAGENES_TAMANOS[t.id] || "/icons/pote-16oz.png"} className={`w-8 h-8 object-contain ${ESCALAS_VISUALES[t.id] || ''}`} alt={t.nombre} />
                                  <div className="text-left">
                                      <p className="text-sm font-bold text-slate-900 dark:text-white transition-colors">{t.nombre}</p>
                                      {t.capacidad && <p className="text-[10px] text-slate-500 font-bold">{t.capacidad} KG</p>}
                                  </div>
                              </div>
                              <span className="text-sm font-bold text-slate-900 dark:text-[#bcd4dc]">S/ {t.precio.toFixed(2)}</span>
                          </button>
                      ))}
                  </motion.div>
              )}
            </AnimatePresence>
        </div>

        <button 
            disabled={!selectedTam}
            onClick={() => addToCart(prod, selectedTam.id)}
            className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all uppercase tracking-widest relative overflow-hidden ${
                selectedTam 
                    ? "bg-[#bcd4dc] text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 shadow-lg shadow-[#bcd4dc]/30 dark:shadow-[#bcd4dc]/10 active:scale-95" 
                    : "bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
        >
            <ShoppingCart className="w-5 h-5 z-10" />
            <div className="relative z-10 flex items-center overflow-hidden h-full">
              {selectedTam ? (
                <>
                  <span className="mr-1">S/</span>
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={selectedTam.precio}
                      initial={{ y: 20, opacity: 0, filter: "blur(4px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="inline-block tabular-nums"
                    >
                      {selectedTam.precio.toFixed(2)}
                    </motion.span>
                  </AnimatePresence>
                </>
              ) : (
                'AÑADIR'
              )}
            </div>
        </button>
      </CardContent>
    </Card>
  );
}