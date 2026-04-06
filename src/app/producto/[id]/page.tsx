"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useCarrito } from "@/components/CarritoContext";

import { 
  ArrowLeft, 
  ShoppingCart, 
  Leaf, 
  WheatOff, 
  Loader2,
  CheckCircle2,
  Sparkles,
  Heart,
  MilkOff,
  Cuboid,
  UtensilsCrossed
} from "lucide-react";

import HeaderCosmos from "@/components/HeaderCosmos";
import CartSlider from "@/components/CartSlider";

// 🔥 CONFIGURACIÓN DE ETIQUETAS Y SUS ÍCONOS 🔥
const TAG_CONFIG: Record<string, { icon: any, text: string }> = {
  "Sin Azúcar": { icon: Cuboid, text: "Sin Azúcar" },
  "Sin Lácteos": { icon: MilkOff, text: "Sin Lácteos" },
  "Sin Gluten": { icon: WheatOff, text: "Sin Gluten" },
  "Sin Soya": { icon: Leaf, text: "Sin Soya" },
};

// COMPONENTE DE INSIGNIAS DINÁMICO (Soporta Dark/Light Mode)
const AtributoBadge = ({ icon: Icon, text }: { icon: any, text: string }) => (
  <div className="flex flex-col items-center gap-3 w-24">
    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-inner group-hover:scale-110 transition-transform">
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest leading-tight">
      {text}
    </span>
  </div>
);

// 🔥 FUNCIÓN INTELIGENTE PARA ASIGNAR EL ICONO DEL POTE 🔥
const getIconoPote = (nombreTamano: string) => {
  const nombreLower = nombreTamano.toLowerCase();
  if (nombreLower.includes("8")) return "/icons/pote-8oz.png";
  if (nombreLower.includes("32") || nombreLower.includes("litro")) return "/icons/pote-32oz.png";
  return "/icons/pote-16oz.png";
};

export default function ProductoPage() {
  const params = useParams();
  const router = useRouter();
  
  const carritoApi = useCarrito();
  const carrito = carritoApi?.carrito || [];
  const showCart = carritoApi?.showCart || false;
  const setShowCart = carritoApi?.setShowCart || (() => {});
  const updateCantidad = carritoApi?.updateCantidad || (() => {});
  const removeFromCart = carritoApi?.removeFromCart || (() => {});
  const total = carritoApi?.total || 0;
  const finalizarCompra = carritoApi?.finalizarCompra || (() => {});
  const addToCart = carritoApi?.addToCart || (() => {});
  
  const wishlist = carritoApi?.wishlist || [];
  const addToWishlist = carritoApi?.addToWishlist || (() => {});
  const removeFromWishlist = carritoApi?.removeFromWishlist || (() => {});

  const [producto, setProducto] = useState<any>(null);
  const [tamanosDisponibles, setTamanosDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tam, setTam] = useState<string | null>(null);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    async function fetchProducto() {
      setLoading(true);

      if (!params.id) {
        setProducto(null);
        setLoading(false);
        return;
      }

      try {
        const idString = String(params.id);
        
        let docSnap = await getDoc(doc(db, "productos_tienda", idString));
        
        if (!docSnap.exists()) {
          docSnap = await getDoc(doc(db, "productos", idString));
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProducto({ id: docSnap.id, ...data });
          
          let parsedTamanos: any[] = [];
          
          if (data.tamanos && Array.isArray(data.tamanos)) {
            parsedTamanos = data.tamanos.map(t => ({
               key: t.nombre,
               label: t.nombre,
               precio: t.precio
            }));
          } else if (data.recetasPorTamaño) {
            parsedTamanos = Object.entries(data.recetasPorTamaño).map(([key, value]: any) => ({
              key,
              label: value.label || key,
              precio: value.precio ?? data.precio ?? 0,
            }));
          }

          setTamanosDisponibles(parsedTamanos);

          if (parsedTamanos.length > 0) {
            setTam(parsedTamanos[0].key);
          }

        } else {
          setProducto(null);
        }
      } catch (error) {
        console.error("Error al buscar el producto:", error);
        setProducto(null);
      }

      setLoading(false);
    }

    fetchProducto();
  }, [params.id]);

  function handleAgregar() {
    if (!tam || !producto) return;

    const tamanoSeleccionado = tamanosDisponibles.find(t => t.key === tam);
    const precioFinal = tamanoSeleccionado ? tamanoSeleccionado.precio : (producto.precio || 0);

    const productoParaCarrito = {
      ...producto,
      precio: precioFinal
    };

    addToCart(productoParaCarrito, tam);
    setShowCart(true); 
    
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1400);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex flex-col items-center justify-center text-slate-500 font-sans transition-colors duration-300">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#bcd4dc]" />
        <p className="font-bold uppercase tracking-widest text-sm">Sintetizando Sabor...</p>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex flex-col text-slate-900 dark:text-white font-sans transition-colors duration-300">
        <HeaderCosmos />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-4xl md:text-6xl font-black mb-4">Misión Fallida</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">El sabor que buscas se perdió en un agujero negro o fue abducido.</p>
            <button 
                onClick={() => router.push("/")} 
                className="px-8 py-4 bg-[#bcd4dc] hover:bg-slate-900 transition-colors text-slate-900 hover:text-white font-black uppercase tracking-widest rounded-2xl shadow-xl"
            >
                Volver a la Base
            </button>
        </main>
      </div>
    );
  }

  const precioActual = tam 
    ? tamanosDisponibles.find(t => t.key === tam)?.precio 
    : (tamanosDisponibles.length > 0 ? tamanosDisponibles[0].precio : producto.precio);

  const isWishlisted = wishlist.some((w:any) => w.id === producto.id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-200 font-sans selection:bg-[#bcd4dc]/30 pb-32 overflow-x-hidden transition-colors duration-300">
      <HeaderCosmos />

      <main className="max-w-[1200px] mx-auto px-6 pt-10">
        
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#bcd4dc] transition-colors font-bold text-xs uppercase tracking-widest mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </button>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          
          {/* 🔥 COLUMNA IZQUIERDA: IMAGEN PRINCIPAL + INGREDIENTES 🔥 */}
          <div className="sticky top-28 flex flex-col gap-6">
            
            {/* Contenedor de la foto */}
            <div className="relative aspect-square w-full bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex items-center justify-center overflow-hidden group shadow-xl dark:shadow-none transition-colors duration-300">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 dark:from-slate-800/10 to-[#bcd4dc]/10 dark:to-[#bcd4dc]/5 opacity-50" />
              
              <AnimatePresence mode="wait">
                <motion.img 
                  key={producto.imagen}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  src={producto.imagen || "/icons/pote-16oz.png"} 
                  alt={producto.nombre} 
                  className="w-full h-full object-cover object-[50%_30%] relative z-10" 
                />
              </AnimatePresence>

              <div className="absolute top-6 left-6 z-20">
                  <span className="bg-white/80 dark:bg-[#bcd4dc]/20 border border-slate-200 dark:border-[#bcd4dc]/30 text-slate-900 dark:text-[#bcd4dc] backdrop-blur-md text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3" /> Cosmos
                  </span>
              </div>
            </div>

            {/* 🔥 NUEVA SECCIÓN DE INGREDIENTES DEBAJO DE LA FOTO 🔥 */}
            {producto.ingredientes && producto.ingredientes.trim() !== "" && (
              <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm dark:shadow-none transition-colors duration-300">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#bcd4dc]" /> Ingredientes de la misión
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {producto.ingredientes}
                </p>
              </div>
            )}
          </div>


          {/* COLUMNA DERECHA: INFO Y COMPRA */}
          <div className="flex flex-col pt-4">
            
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.1] transition-colors">
                {producto.nombre}
              </h1>
              
              <div className="flex items-center gap-4 mt-2">
                <span className="text-3xl font-bold text-[#8ebccb] dark:text-[#bcd4dc] transition-colors">
                  S/ {precioActual?.toFixed(2) || "0.00"}
                </span>
                <span className="bg-[#bcd4dc]/20 dark:bg-[#bcd4dc]/10 text-slate-800 dark:text-[#bcd4dc] border border-[#bcd4dc]/30 dark:border-[#bcd4dc]/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
                  <CheckCircle2 className="w-3 h-3" /> En Stock
                </span>
              </div>
            </div>

            {Array.isArray(producto.sabores) && producto.sabores.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {producto.sabores.map((sabor: string, idx: number) => (
                  <span
                    key={idx}
                    className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors"
                  >
                    {sabor}
                  </span>
                ))}
              </div>
            )}

            <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg leading-relaxed mb-10 font-medium transition-colors">
              {producto.descripcion}
            </p>

            {/* SECCIÓN DE TAMAÑOS CON ICONOS DE POTES 🔥 */}
            {tamanosDisponibles.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tamaño de la misión</h3>
                    {tam && (
                        <button onClick={() => setTam(null)} className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-[#bcd4dc] transition-colors uppercase font-bold tracking-widest">
                            Limpiar selección
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {tamanosDisponibles.map((t) => {
                    const isSelected = tam === t.key;
                    const iconPath = getIconoPote(t.label);
                    
                    return (
                      <button
                        key={t.key}
                        onClick={() => setTam(t.key)}
                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center gap-2 relative overflow-hidden ${
                          isSelected 
                            ? 'border-[#bcd4dc] bg-[#bcd4dc]/10 shadow-[0_0_15px_rgba(188,212,220,0.15)] scale-[1.02]' 
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-[#bcd4dc]/50 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm'
                        }`}
                      >
                        {/* Indicador de selección */}
                        {isSelected && (
                           <div className="absolute top-3 right-3 w-4 h-4 bg-[#bcd4dc] rounded-full flex items-center justify-center shadow-lg shadow-[#bcd4dc]/50">
                             <CheckCircle2 className="w-3 h-3 text-[#030712]" />
                           </div>
                        )}
                        
                        {/* Icono del Pote */}
                        <div className="h-16 w-full flex items-center justify-center mb-1">
                           <img 
                             src={iconPath} 
                             alt={t.label} 
                             className={`h-full object-contain transition-opacity ${isSelected ? 'opacity-100 drop-shadow-[0_0_10px_rgba(188,212,220,0.4)]' : 'opacity-60 grayscale-[50%]'}`} 
                           />
                        </div>

                        {/* Textos */}
                        <span className={`font-bold text-sm ${isSelected ? 'text-slate-900 dark:text-[#bcd4dc]' : 'text-slate-700 dark:text-slate-300'} transition-colors`}>
                            {t.label}
                        </span>
                        <span className={`text-xs font-black ${isSelected ? 'text-[#8ebccb] dark:text-[#bcd4dc]' : 'text-slate-500'} transition-colors`}>
                            S/ {t.precio.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-12 border-t border-slate-200 dark:border-slate-800/60 pt-10 transition-colors">
              <button
                className={`flex-1 h-16 flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg ${
                  tam && producto
                    ? "bg-[#bcd4dc] text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 shadow-[#bcd4dc]/20 active:scale-[0.98]"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                }`}
                onClick={handleAgregar}
                disabled={!tam || !producto}
                type="button"
              >
                <AnimatePresence mode="wait">
                    {agregado ? (
                    <motion.div key="agregado" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Misión Agregada
                    </motion.div>
                    ) : (
                    <motion.div key="agregar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" /> Agregar al carrito
                    </motion.div>
                    )}
                </AnimatePresence>
              </button>

              <button 
                onClick={() => isWishlisted ? removeFromWishlist(producto.id) : addToWishlist(producto)}
                className={`w-16 h-16 shrink-0 rounded-2xl border flex items-center justify-center transition-all shadow-sm ${
                  isWishlisted 
                    ? 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 text-pink-500' 
                    : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* 🔥 IDENTIDAD COSMOS DINÁMICA (Lee las etiquetas de Firebase) 🔥 */}
            {producto.etiquetas && producto.etiquetas.length > 0 && (
                <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 group shadow-xl dark:shadow-none transition-colors duration-300">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 text-center sm:text-left">Características del producto</h3>
                <div className="flex flex-wrap justify-center sm:justify-start gap-6 sm:gap-10">
                    {producto.etiquetas.map((etiquetaId: string) => {
                        const config = TAG_CONFIG[etiquetaId];
                        if (!config) return null;
                        return (
                            <AtributoBadge 
                                key={etiquetaId} 
                                icon={config.icon} 
                                text={config.text} 
                            />
                        );
                    })}
                </div>
                </div>
            )}

          </div>
        </div>
      </main>

      <CartSlider 
        show={showCart} 
        cart={carrito} 
        onClose={() => setShowCart(false)} 
        updateCantidad={updateCantidad} 
        removeFromCart={removeFromCart} 
        total={total} 
        finalizarCompra={finalizarCompra} 
      />
    </div>
  );
}