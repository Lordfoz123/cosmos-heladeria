"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Sparkles, 
  Store, 
  UtensilsCrossed, 
  ShoppingCart, 
  Leaf, 
  Plane,
  Navigation
} from "lucide-react";
import HeaderCosmos from "@/components/HeaderCosmos";

// 🔥 BASE DE DATOS DE PUNTOS DE VENTA CORREGIDA 🔥
const PUNTOS_DE_VENTA = [
  {
    id: 1,
    nombre: "Supermercado Franco",
    direccion: "Av. Emmel 117, Yanahuara",
    ciudad: "Arequipa",
    tipo: "Supermercado",
    icon: ShoppingCart
  },
  {
    id: 2,
    nombre: "Satiba Therapy Food",
    direccion: "Calle Cerrito San Vicente 109 B, Yanahuara",
    ciudad: "Arequipa",
    tipo: "Restaurante",
    icon: UtensilsCrossed
  },
  {
    id: 3,
    nombre: "Satiba Therapy Food",
    direccion: "Calle Alvarez Thomas 221, Centro Histórico",
    ciudad: "Arequipa",
    tipo: "Restaurante",
    icon: UtensilsCrossed
  },
  {
    id: 4,
    nombre: "Especerías El Cafetal",
    direccion: "Calle San Juan de Dios 222",
    ciudad: "Arequipa",
    tipo: "Especería",
    icon: Store
  },
  {
    id: 5,
    nombre: "Tienda Doorganic",
    direccion: "Av. Ejército 706A, Yanahuara",
    ciudad: "Arequipa",
    tipo: "Tienda Saludable",
    icon: Leaf
  },
  {
    id: 6,
    nombre: "Restaurante Omphalos",
    direccion: "Calle Puente Bolognesi 116",
    ciudad: "Arequipa",
    tipo: "Restaurante Vegano",
    icon: UtensilsCrossed
  },
  {
    id: 7,
    nombre: "Bambúes Energy Core",
    direccion: "Av. Victor Andrés Belaunde B19, Yanahuara",
    ciudad: "Arequipa",
    tipo: "Tienda Orgánica",
    icon: Leaf
  },
 
  {
    id: 9,
    nombre: "Tienda Doorganic",
    direccion: "Av. El Sol 920",
    ciudad: "Cusco",
    tipo: "Tienda Saludable",
    icon: Leaf
  },
  {
    id: 10,
    nombre: "Harina de Otro Costal",
    direccion: "Sedes en Aeropuertos",
    ciudad: "Aeropuertos",
    tipo: "Restaurante",
    icon: Plane
  }
];

export default function EncuentranosPage() {
  const [stars, setStars] = useState<{ id: number; top: number; left: number; size: number; duration: number; delay: number; xMove: number; yMove: number; }[]>([]);

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

  // Agrupamos las locaciones por ciudad para mostrar el contenido ordenado
  const arequipa = PUNTOS_DE_VENTA.filter(p => p.ciudad === "Arequipa");
  const cusco = PUNTOS_DE_VENTA.filter(p => p.ciudad === "Cusco");
  const aeropuertos = PUNTOS_DE_VENTA.filter(p => p.ciudad === "Aeropuertos");

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-200 overflow-x-hidden font-sans selection:bg-[#bcd4dc]/30 transition-colors duration-300 pb-32">
      
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

      {/* ========================================================= */}
      {/* HERO SECTION                                              */}
      {/* ========================================================= */}
      <section className="relative w-full pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-[#bcd4dc]/15 blur-[120px] rounded-full pointer-events-none opacity-40 dark:opacity-100" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-[#bcd4dc]/10 backdrop-blur-md border border-[#bcd4dc]/50 px-4 py-1.5 rounded-full text-slate-800 dark:text-[#bcd4dc] text-[10px] font-bold uppercase tracking-widest shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-[#bcd4dc]" /> Red de Abastecimiento
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.05] transition-colors duration-300"
          >
            Encuentra <br />
            <span className="text-[#8ebccb] dark:text-[#bcd4dc] drop-shadow-md">
              Cosmos
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium transition-colors"
          >
            Nuestros sabores han aterrizado en los mejores puntos de la ciudad. Encuentra tu helado favorito más cerca de ti.
          </motion.p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* GRID DE LOCACIONES                                        */}
      {/* ========================================================= */}
      <section className="relative z-20 max-w-[1200px] mx-auto px-6 py-12">
        
        {/* 🔥 SECCIÓN: AREQUIPA 🔥 */}
        <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-[#bcd4dc] shadow-sm">
                    <Navigation className="w-5 h-5" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Arequipa</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {arequipa.map((punto, idx) => (
                    <LocationCard key={punto.id} punto={punto} delay={idx * 0.1} />
                ))}
            </div>
        </div>

        {/* 🔥 SECCIÓN: CUSCO 🔥 */}
        <div className="mb-16 pt-8 border-t border-slate-200 dark:border-slate-800/60 transition-colors">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-amber-500 shadow-sm">
                    <Navigation className="w-5 h-5" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Cusco</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cusco.map((punto, idx) => (
                    <LocationCard key={punto.id} punto={punto} delay={idx * 0.1} />
                ))}
            </div>
        </div>

        {/* 🔥 SECCIÓN: AEROPUERTOS 🔥 */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/60 transition-colors">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-indigo-400 shadow-sm">
                    <Plane className="w-5 h-5" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Aeropuertos</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aeropuertos.map((punto, idx) => (
                    <LocationCard key={punto.id} punto={punto} delay={idx * 0.1} />
                ))}
            </div>
        </div>

      </section>

    </div>
  );
}

// =========================================================
// SUB-COMPONENTE: TARJETA DE LOCACIÓN
// =========================================================
function LocationCard({ punto, delay }: { punto: any, delay: number }) {
  const Icon = punto.icon;
  
  return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true }} 
        transition={{ duration: 0.5, delay }}
        className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800/60 p-6 rounded-[2rem] shadow-xl hover:shadow-2xl dark:shadow-none hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
    >
        <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 shrink-0 bg-slate-50 dark:bg-[#bcd4dc]/10 rounded-xl flex items-center justify-center text-slate-900 dark:text-[#bcd4dc] border border-slate-100 dark:border-[#bcd4dc]/20 transition-colors">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                    {punto.tipo}
                </span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight group-hover:text-[#bcd4dc] transition-colors">
                    {punto.nombre}
                </h3>
            </div>
        </div>
        
        <div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800/60 flex items-start gap-3 transition-colors">
            <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                {punto.direccion}
            </p>
        </div>
    </motion.div>
  );
}