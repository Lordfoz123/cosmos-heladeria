"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Leaf, Heart, Globe2, Sparkles, Star, Target, Eye } from "lucide-react";
import HeaderCosmos from "@/components/HeaderCosmos";

// 🔥 RUTAS DE TUS FOTOS LOCALES 🔥
// (Asegúrate de guardar fotos con estos nombres en la carpeta public/ de tu proyecto)
const FOTOS_NOSOTROS = [
  "/nosotros1.webp", 
  "/nosotros2.webp"
];

// Fallback por si aún no has subido las fotos (fotos de Unsplash provisionales)
const FALLBACK_IMAGES = [
  "/BA4A0774.jpg",
  "/BA4A0774.jpg"
];

export default function NosotrosPage() {
  const [stars, setStars] = useState<{ id: number; top: number; left: number; size: number; duration: number; delay: number; xMove: number; yMove: number; }[]>([]);
  const [imgErrors, setImgErrors] = useState([false, false]);

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

      {/* ========================================================= */}
      {/* 1. HERO Y TEXTOS (Todo centrado)                          */}
      {/* ========================================================= */}
      <section className="relative w-full pt-20 lg:pt-32 pb-20 px-6 overflow-hidden">
        {/* Resplandor circular estilo Cosmos */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-[#bcd4dc]/15 blur-[120px] rounded-full pointer-events-none opacity-40 dark:opacity-100" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-[#bcd4dc]/10 backdrop-blur-md border border-[#bcd4dc]/50 px-4 py-1.5 rounded-full text-slate-800 dark:text-[#bcd4dc] text-[11px] font-bold uppercase tracking-widest shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-[#bcd4dc]" /> Pioneros en Arequipa
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.05] transition-colors duration-300"
          >
            Nuestra <br />
            <span className="text-[#8ebccb] dark:text-[#bcd4dc] drop-shadow-md">
              Identidad
            </span>
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed mx-auto font-medium text-justify md:text-center transition-colors duration-300"
          >
            <p>
              Cosmos es la primera marca de helados 100% basados en plantas en Arequipa, creada para responder a una nueva generación de consumidores que busca opciones más saludables, sostenibles y deliciosas.
            </p>
            <p>
              Somos una marca innovadora que nace con el propósito de que todas las personas puedan disfrutar de un helado. Creamos helados veganos artesanales, elaborados con ingredientes naturales, libres de lácteos, sin azúcar y amigables con el planeta, sin sacrificar la experiencia tradicional de un helado.
            </p>
            <p>
              También uno de los propósitos es que nuestros sabores sean innovadores con una textura cremosa que compita directamente con el helado tradicional pero con valores agregados.
            </p>
            <p>
              El mercado plant-based está creciendo rápidamente, y en Arequipa aún existe una gran oportunidad sin explotar. Nuestro modelo de negocio combina producción artesanal, creatividad, identidad de marca fuerte y alto potencial de escalabilidad.
            </p>
            
            {/* CAJA DE COMILLAS */}
            <div className="p-8 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-none mt-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#bcd4dc]" />
                <p className="text-slate-900 dark:text-white text-base md:text-lg leading-relaxed font-bold italic text-center px-4">
                  "No solo vendemos helados sino creamos una experiencia consciente de consumo que conecta sabor, salud y sostenibilidad."
                </p>
            </div>
          </motion.div>
        </div>

        {/* ========================================================= */}
        {/* MOSAICO DE FOTOS (Abajo del texto de las comillas)        */}
        {/* ========================================================= */}
        <div className="relative z-10 w-full max-w-5xl mx-auto h-[500px] sm:h-[600px] md:h-[700px] mt-24">
            
            {/* Foto 1 (Arriba Izquierda) */}
            <motion.div 
                initial={{ opacity: 0, rotate: -6, x: -50 }} whileInView={{ opacity: 1, rotate: -3, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, type: "spring" }}
                className="absolute top-0 left-0 md:left-10 w-2/3 md:w-3/5 aspect-[4/3] rounded-[2.5rem] overflow-hidden border-[6px] border-slate-50 dark:border-[#030712] shadow-2xl z-10 group"
            >
                <img 
                    src={imgErrors[0] ? FALLBACK_IMAGES[0] : FOTOS_NOSOTROS[0]} 
                    onError={() => setImgErrors(prev => [true, prev[1]])}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    alt="Cosmos Heladería" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>

            {/* Foto 2 (Abajo Derecha) */}
            <motion.div 
                initial={{ opacity: 0, rotate: 6, x: 50 }} whileInView={{ opacity: 1, rotate: 3, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, type: "spring", delay: 0.2 }}
                className="absolute bottom-0 right-0 md:right-10 w-2/3 md:w-3/5 aspect-[4/3] rounded-[2.5rem] overflow-hidden border-[6px] border-slate-50 dark:border-[#030712] shadow-2xl z-20 group"
            >
                <img 
                    src={imgErrors[1] ? FALLBACK_IMAGES[1] : FOTOS_NOSOTROS[1]} 
                    onError={() => setImgErrors(prev => [prev[0], true])}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    alt="Producción Cosmos" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. MISIÓN Y VISIÓN                                        */}
      {/* ========================================================= */}
      <section className="relative z-20 max-w-[1400px] mx-auto px-6 py-20 border-t border-slate-200 dark:border-white/5">
        <div className="grid md:grid-cols-2 gap-8">
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-12 lg:p-16 rounded-[3rem] relative overflow-hidden group shadow-lg dark:shadow-none"
            >
                <div className="absolute -top-10 -right-10 text-slate-200 dark:text-white/5 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <Target className="w-64 h-64" />
                </div>
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-[#bcd4dc]/20 rounded-2xl flex items-center justify-center text-slate-800 dark:text-[#bcd4dc] mb-8 border border-[#bcd4dc]/30">
                        <Target className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight transition-colors">Nuestra Misión</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-6 font-medium transition-colors">
                        Brindar experiencias deliciosas y conscientes a través de helados veganos de alta calidad, elaborados con ingredientes naturales y sostenibles, promoviendo un estilo de vida saludable y respetuoso con el medio ambiente.
                    </p>
                    <p className="text-slate-800 dark:text-[#bcd4dc]/90 text-lg leading-relaxed font-bold transition-colors">
                        A través del tiempo buscamos fortalecer nuestra presencia comercial y posicionarnos como líderes en el segmento vegano a nivel regional y nacional.
                    </p>
                </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-12 lg:p-16 rounded-[3rem] relative overflow-hidden group shadow-lg dark:shadow-none"
            >
                <div className="absolute -top-10 -right-10 text-slate-200 dark:text-white/5 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                    <Eye className="w-64 h-64" />
                </div>
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-[#bcd4dc]/20 rounded-2xl flex items-center justify-center text-slate-800 dark:text-[#bcd4dc] mb-8 border border-[#bcd4dc]/30">
                        <Eye className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight transition-colors">Nuestra Visión</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-6 font-medium transition-colors">
                        Ser la marca líder de helados veganos en Arequipa y expandirnos a nivel nacional, ser reconocidos por nuestra innovación, calidad y compromiso con el bienestar de las personas y el planeta.
                    </p>
                    <p className="text-slate-800 dark:text-[#bcd4dc]/90 text-lg leading-relaxed font-bold transition-colors">
                        Ser vistos como una alternativa al helado del día a día donde nuestros sabores resalten sobre la competencia, con una textura cremosa inigualable.
                    </p>
                </div>
            </motion.div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. VALORES                                                */}
      {/* ========================================================= */}
      <section className="relative z-20 max-w-[1400px] mx-auto px-6 py-32 border-t border-slate-200 dark:border-white/5 mt-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight mb-4 transition-colors">
            Nuestros <span className="text-[#8ebccb] dark:text-[#bcd4dc] drop-shadow-md">Valores</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium transition-colors">
            Los pilares que sostienen cada decisión, cada receta y cada paso que damos hacia el futuro.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-10 rounded-[3rem] shadow-xl dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform border border-amber-100 dark:border-amber-500/20">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Innovación</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-10 rounded-[3rem] shadow-xl dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform border border-blue-100 dark:border-blue-500/20">
              <Star className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Calidad</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-10 rounded-[3rem] shadow-xl dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform border border-emerald-100 dark:border-emerald-500/20">
              <Leaf className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Sostenibilidad</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }}
            className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-10 rounded-[3rem] shadow-xl dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 bg-pink-50 dark:bg-pink-500/10 rounded-full flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform border border-pink-100 dark:border-pink-500/20">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Bienestar</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.5 }}
            className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 p-10 rounded-[3rem] shadow-xl dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all flex flex-col items-center text-center group"
          >
            <div className="w-20 h-20 bg-teal-50 dark:bg-teal-500/10 rounded-full flex items-center justify-center text-teal-500 mb-6 group-hover:scale-110 transition-transform border border-teal-100 dark:border-teal-500/20">
              <Globe2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Resp. Ambiental</h3>
          </motion.div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. CTA FINAL ACTUALIZADO                                  */}
      {/* ========================================================= */}
      <section className="relative z-20 max-w-[1200px] mx-auto px-6 pb-40">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="bg-slate-100 dark:bg-gradient-to-br dark:from-slate-900 dark:to-[#030712] border border-slate-200 dark:border-slate-800 rounded-[3rem] p-16 md:p-24 text-center shadow-2xl relative overflow-hidden transition-colors duration-300"
        >
          {/* Noise effect para textura */}
          <div className="absolute inset-0 opacity-20 dark:opacity-10 mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }} />
          
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight relative z-10 transition-colors">
            Únete al <span className="text-[#8ebccb] dark:text-[#bcd4dc] drop-shadow-md">cambio</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-lg md:text-xl mb-12 max-w-2xl mx-auto relative z-10 font-medium transition-colors">
            Descubre por qué Cosmos es la heladería de la que todos hablan. Explora nuestro catálogo y vive la experiencia.
          </p>
          <div className="relative z-10">
            <Link href="/tienda">
                <button className="inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-[#bcd4dc] text-slate-900 font-black uppercase tracking-widest text-sm hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors shadow-xl shadow-[#bcd4dc]/20 active:scale-95 gap-3">
                    Explorar Sabores <ArrowRight className="w-5 h-5" />
                </button>
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}