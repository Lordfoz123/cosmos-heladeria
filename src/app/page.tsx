"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Sparkles, 
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Heart,
  LogIn,
  X,
  Cuboid,
  MilkOff,
  WheatOff,
  Leaf
} from "lucide-react";

// Componentes del Sitio
import HeaderCosmos from "@/components/HeaderCosmos";
import CartSlider from "@/components/CartSlider"; 
import { useCarrito } from "@/components/CarritoContext"; 
import { useAuth } from "@/components/auth/AuthProvider"; 
import { useRouter } from "next/navigation"; 

// Firebase
import { collection, onSnapshot, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

// 🔥 CONFIGURACIÓN DE ETIQUETAS (ESTILO STICKER INVERTIDO BLANCO) 🔥
const TAG_CONFIG: Record<string, { bg: string, text: string }> = {
    "Sin Azúcar": { bg: "bg-[#29b6f6]", text: "Sin Azúcar" },
    "Sin Lácteos": { bg: "bg-[#8bc34a]", text: "Sin Lácteos" },
    "Sin Gluten": { bg: "bg-[#ffc107]", text: "Sin Gluten" },
    "Sin Soya": { bg: "bg-[#ec407a]", text: "Sin Soya" },
};

// 🔥 DATOS DEL SLIDER PRINCIPAL 🔥
const HERO_SLIDES = [
  {
    id: 1,
    title: "El futuro del helado es",
    titleHighlight: "Consciente",
    description: "Helados veganos artesanales, libres de lácteos y amigables con el planeta. La cremosidad que amas, sin sacrificar nada.",
    bgImage: "bg1.webp", 
    ctaText: "Visitar Tienda",
    ctaLink: "/tienda" 
  },
  {
    id: 2,
    title: "Placer puro",
    titleHighlight: "Sin Culpa",
    description: "Disfruta de nuestra línea zero azúcar. Ingredientes 100% naturales para un estilo de vida saludable y delicioso.",
    bgImage: "bg2.webp",
    ctaText: "Pedir Chocolate Zero",
    ctaLink: "/tienda"
  },
  {
    id: 3,
    title: "Reinventamos la",
    titleHighlight: "Tradición",
    description: "Una textura increíblemente cremosa que compite directamente con el helado tradicional, pero con puros valores agregados.",
    bgImage: "bg3.webp",
    ctaText: "Ver Catálogo Completo",
    ctaLink: "/tienda"
  }
];

export default function HomePage() {
  const router = useRouter();
  const authData = useAuth() || {}; 
  const user = authData.user;
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stars, setStars] = useState<{ id: number; top: number; left: number; size: number; duration: number; delay: number; xMove: number; yMove: number; }[]>([]);
  const [destacados, setDestacados] = useState<any[]>([]);
  const [loadingDestacados, setLoadingDestacados] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);

  const carritoApi = useCarrito();
  const carrito = carritoApi?.carrito || [];
  const showCart = carritoApi?.showCart || false;
  const setShowCart = carritoApi?.setShowCart || (() => {});
  const updateCantidad = carritoApi?.updateCantidad || (() => {});
  const removeFromCart = carritoApi?.removeFromCart || (() => {});
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
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Límite de 20 para ver todos los helados
    const q = query(collection(db, "productos_tienda"), where("activo", "==", true), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setDestacados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingDestacados(false);
    });
    return () => unsub();
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isDown && !isHovered && carouselRef.current) {
      interval = setInterval(() => {
        if (carouselRef.current) {
          carouselRef.current.scrollLeft += 1;
          if (carouselRef.current.scrollLeft >= (carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 5)) {
            carouselRef.current.scrollLeft = 0;
          }
        }
      }, 25);
    }
    return () => clearInterval(interval);
  }, [isDown, isHovered]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDown(true);
    isDragging.current = false; 
    if (!carouselRef.current) return;
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };
  const onMouseLeave = () => { setIsDown(false); setIsHovered(false); };
  const onMouseEnter = () => setIsHovered(true);
  const onMouseUp = () => setIsDown(false);
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDown || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    if (Math.abs(walk) > 5) isDragging.current = true; 
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const infiniteTrack = Array(15).fill(destacados).flat(); 

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    const WHATSAPP_NUMBER = "51907414295";
    const mensaje = `Hola Cosmos ✨, quiero unirme a la tripulación.\nMi correo es: ${newsletterEmail}`;
    const urlCodificada = encodeURIComponent(mensaje);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${urlCodificada}`;
    
    window.open(whatsappUrl, '_blank');
    setNewsletterEmail(""); 
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-200 overflow-x-hidden font-sans selection:bg-[#bcd4dc]/30 transition-colors duration-300">
      
      {/* FONDO ESPACIAL BASE */}
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
        <HeaderCosmos /> 
      </div>

      {/* 1. HERO SLIDER */}
      <section className="relative w-full min-h-[calc(100vh-80px)] flex flex-col justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 w-full h-full z-0">
          <AnimatePresence>
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.9, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 w-full h-full"
            >
              <img src={slide.bgImage} alt={slide.title} className="w-full h-full object-cover" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 pt-20 pb-32 flex items-center h-full">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentSlide} 
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} 
                transition={{ duration: 0.5, delay: 0.2 }} 
                className="space-y-6"
              >
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05]">
                  {slide.title} <br />
                  <span className="text-[#bcd4dc] drop-shadow-md">{slide.titleHighlight}</span>
                </h1>
                <p className="text-base md:text-xl text-slate-200 font-medium leading-relaxed max-w-lg">
                  {slide.description}
                </p>
                <div className="pt-6">
                  <Link href={slide.ctaLink}>
                    <button className="group flex items-center justify-center gap-3 bg-[#bcd4dc] text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all hover:bg-white shadow-xl shadow-[#bcd4dc]/30 active:scale-95">
                      {slide.ctaText} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute bottom-10 left-0 right-0 z-30 flex items-center justify-center gap-8 lg:justify-start lg:left-6 max-w-[1400px] mx-auto w-full px-6">
          <div className="flex gap-3">
            <button onClick={() => setCurrentSlide(prev => prev === 0 ? HERO_SLIDES.length - 1 : prev - 1)} className="w-12 h-12 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length)} className="w-12 h-12 rounded-full border border-white/20 bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-sm"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2">
            {HERO_SLIDES.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentSlide(idx)} className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? "w-8 bg-[#bcd4dc]" : "w-2 bg-white/40"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* 2. CARRUSEL INFINITO DINÁMICO DE PRODUCTOS */}
      <section className="relative z-20 w-full overflow-hidden pb-32 pt-20">
        <div className="max-w-[1400px] mx-auto px-6 mb-10 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 transition-colors duration-300">Descubre la Experiencia</h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium text-lg transition-colors duration-300">Sabores innovadores que protegen el bienestar y el planeta.</p>
        </div>

        {loadingDestacados ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#bcd4dc]" />
                <p className="mt-4 font-bold text-xs uppercase tracking-widest">Creando magia...</p>
            </div>
        ) : (
            <div className="relative max-w-[1500px] mx-auto group">
                <button onClick={() => scrollCarousel('left')} className="absolute left-2 md:-left-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-white/90 dark:bg-[#030712]/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-[#bcd4dc] hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 shadow-2xl hidden sm:flex">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                
                <button onClick={() => scrollCarousel('right')} className="absolute right-2 md:-right-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-white/90 dark:bg-[#030712]/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white hover:bg-[#bcd4dc] hover:text-slate-900 transition-all opacity-0 group-hover:opacity-100 shadow-2xl hidden sm:flex">
                    <ChevronRight className="w-6 h-6" />
                </button>

                <div 
                    ref={carouselRef} 
                    onMouseDown={onMouseDown} 
                    onMouseLeave={onMouseLeave} 
                    onMouseEnter={onMouseEnter} 
                    onMouseUp={onMouseUp} 
                    onMouseMove={onMouseMove} 
                    className="flex overflow-x-auto gap-6 px-6 pb-12 pt-4 hide-scrollbar cursor-grab active:cursor-grabbing" 
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <style jsx>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                    
                    {infiniteTrack.map((sabor, index) => {
                        const isWishlisted = wishlist.some((w:any) => w.id === sabor.id);
                        
                        return (
                            <motion.div 
                                key={`slider-${sabor.id}-${index}`} 
                                whileHover={{ y: -8 }} 
                                className="w-[280px] sm:w-[320px] shrink-0 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden flex flex-col transition-all hover:bg-slate-50 dark:hover:bg-slate-900 shadow-xl relative"
                            >
                                <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-[#030712] transition-colors duration-300">
                                    <motion.img 
                                        src={sabor.imagen || "/icons/pote-16oz.png"} 
                                        className="w-full h-full object-cover pointer-events-none" 
                                        alt={sabor.nombre} 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-50 pointer-events-none" />
                                    
                                    {/* Botón de favoritos arriba a la derecha */}
                                    <button 
                                        onClick={(e) => { 
                                            e.preventDefault(); 
                                            if (isDragging.current) return; 
                                            if (!user) { setLoginModalOpen(true); return; } 
                                            isWishlisted ? removeFromWishlist(sabor.id) : addToWishlist(sabor); 
                                        }} 
                                        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md flex items-center justify-center border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-black/60 transition-colors shadow-sm"
                                    >
                                        <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-pink-500 text-pink-500' : 'text-slate-400 dark:text-white'}`} />
                                    </button>

                                    {/* 🔥 STICKER BLANCO INVERTIDO: ABAJO A LA DERECHA 🔥 */}
                                    {sabor.etiquetas && sabor.etiquetas.includes("Sin Azúcar") && (
                                        <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
                                            {sabor.etiquetas
                                                .filter((etiquetaId: string) => etiquetaId === "Sin Azúcar")
                                                .map((etiquetaId: string) => {
                                                return (
                                                    <div key={etiquetaId} className="relative flex flex-col items-center justify-center w-[75px] h-[75px] rounded-full shadow-lg border-[3px] border-[#29b6f6] bg-white dark:bg-[#0B0F19]">
                                                        <div className="absolute inset-[3px] border border-dashed border-[#29b6f6]/60 rounded-full" />
                                                        <span className="text-[10px] font-black text-[#29b6f6] uppercase text-center leading-[1.1] px-1 z-10 break-words w-full">
                                                            Sin<br/>Azúcar
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-6 flex flex-col flex-1 relative z-10 bg-white dark:bg-[#030712] transition-colors duration-300">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1">
                                        {sabor.nombre}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 font-medium leading-relaxed">
                                        {sabor.descripcion}
                                    </p>
                                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                        <Link href={`/producto/${sabor.id}`} onClick={(e) => { if (isDragging.current) e.preventDefault(); }}>
                                            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold uppercase tracking-widest hover:bg-[#bcd4dc] dark:hover:bg-[#bcd4dc] hover:text-slate-900 dark:hover:text-slate-900 transition-colors shadow-sm">
                                                Ver en Tienda <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        )}
      </section>

      {/* 3. NEWSLETTER */}
      <div className="relative z-20 max-w-5xl mx-auto px-6 pb-32">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 md:p-16 text-center shadow-xl dark:shadow-2xl backdrop-blur-xl transition-colors duration-300">
          <Sparkles className="w-10 h-10 text-[#8ebccb] dark:text-[#bcd4dc] mx-auto mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight transition-colors duration-300">Únete a la tripulación</h2>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-xl mx-auto mb-8 font-medium transition-colors duration-300">Recibe transmisiones con sabores secretos, lanzamientos exclusivos y beneficios para nuestra comunidad Plant-Based.</p>
          <form className="max-w-md mx-auto relative flex items-center" onSubmit={handleNewsletterSubmit}>
            <input type="email" required value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)} placeholder="tu@correo.com" className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-4 px-6 focus:outline-none focus:border-[#bcd4dc] transition-all font-medium" />
            <button type="submit" className="absolute right-2 bg-[#bcd4dc] hover:bg-slate-900 dark:hover:bg-white text-slate-900 hover:text-white dark:hover:text-slate-900 rounded-xl p-2.5 font-bold transition-colors flex items-center justify-center active:scale-95">
                <Send className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      </div>

      <CartSlider show={showCart} cart={carrito} onClose={() => setShowCart(false)} updateCantidad={updateCantidad} removeFromCart={removeFromCart} total={total} finalizarCompra={finalizarCompra} />

      <AnimatePresence>
        {loginModalOpen && (
          <motion.div className="fixed inset-0 z-[99999] bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-colors duration-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLoginModalOpen(false)}>
            <motion.div className="bg-white dark:bg-[#0B0F19] w-full max-w-sm rounded-[2rem] shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 overflow-hidden text-center relative transition-colors duration-300" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setLoginModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              <div className="p-8 pt-12">
                <div className="w-20 h-20 bg-pink-50 dark:bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-pink-100 dark:border-pink-500/20"><Heart className="w-10 h-10 text-pink-500 fill-pink-500 animate-pulse" /></div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">¡Guarda tus favoritos!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">Crea una cuenta o inicia sesión para armar tu propia colección de sabores y pedirlos cuando quieras.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => router.push("/login?next=/")} className="w-full py-4 bg-[#bcd4dc] text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"><LogIn className="w-4 h-4" /> Entrar / Registrarse</button>
                  <button onClick={() => setLoginModalOpen(false)} className="w-full py-4 bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">Seguir explorando</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}