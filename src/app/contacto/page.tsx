"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Mail, 
  MapPin, 
  MessageCircle, 
  Send, 
  Sparkles, 
  Loader2,
  CheckCircle2
} from "lucide-react";
import HeaderCosmos from "@/components/HeaderCosmos";

export default function ContactoPage() {
  const [stars, setStars] = useState<{ id: number; top: number; left: number; size: number; duration: number; delay: number; xMove: number; yMove: number; }[]>([]);
  
  // ESTADOS PARA CAPTURAR LOS DATOS DEL FORMULARIO
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    asunto: "duda",
    mensaje: ""
  });

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const WHATSAPP_NUMBER = "51907414295";
  const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20Cosmos%2C%20quisiera%20hacer%20una%20consulta%20sobre%20sus%20helados%20%E2%9C%A8`;

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 🔥 LÓGICA REDIRIGIDA A WHATSAPP 🔥
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);

    // Mapeamos el value del select a un texto más amigable
    const asuntosText: Record<string, string> = {
      "duda": "Tengo una duda sobre un producto",
      "evento": "Quiero helados para un evento / catering",
      "negocio": "Quiero vender Cosmos en mi negocio",
      "otro": "Otro motivo"
    };

    const textoMotivo = asuntosText[formData.asunto] || "Consulta general";

    // Armamos el mensaje final
    const mensajeFinal = `Hola Cosmos ✨, soy *${formData.nombre}*.\n\n*Motivo:* ${textoMotivo}\n*Correo:* ${formData.email}\n\n*Mensaje:*\n${formData.mensaje}`;
    
    // Lo codificamos para que los espacios y saltos de línea funcionen en la URL
    const urlCodificada = encodeURIComponent(mensajeFinal);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${urlCodificada}`;

    // Hacemos una animación rápida de 800ms para que se sienta fluido y luego abrimos WhatsApp
    setTimeout(() => {
      setEnviando(false);
      setEnviado(true);
      
      // Abrimos WhatsApp en una nueva pestaña
      window.open(whatsappUrl, '_blank');

      // Limpiamos el formulario después de enviarlo
      setTimeout(() => {
        setEnviado(false);
        setFormData({ nombre: "", email: "", asunto: "duda", mensaje: "" }); 
      }, 3000); 
    }, 800);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-200 overflow-x-hidden font-sans selection:bg-[#bcd4dc]/30 transition-colors duration-300">
      
      {/* FONDO ESPACIAL */}
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
        <HeaderCosmos logoHref="/" />
      </div>

      {/* ========================================================= */}
      {/* 1. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="relative w-full pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-[#bcd4dc]/15 blur-[120px] rounded-full pointer-events-none opacity-40 dark:opacity-100" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-[#bcd4dc]/10 backdrop-blur-md border border-[#bcd4dc]/50 px-4 py-1.5 rounded-full text-slate-800 dark:text-[#bcd4dc] text-[10px] font-bold uppercase tracking-widest shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-[#bcd4dc]" /> Transmisión entrante
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-none transition-colors duration-300"
          >
            Ponte en <br />
            <span className="text-[#8ebccb] dark:text-[#bcd4dc] drop-shadow-md">
              Contacto
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium transition-colors"
          >
            ¿Tienes dudas, un pedido especial para un evento o simplemente quieres saludar? La tripulación de Cosmos está lista para escucharte.
          </motion.p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. GRID DE CONTACTO (TARJETAS + FORMULARIO)               */}
      {/* ========================================================= */}
      <section className="relative z-20 max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* COLUMNA IZQUIERDA: INFORMACIÓN DIRECTA */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            {/* Tarjeta de WhatsApp */}
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="group block">
              <div className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800/60 p-8 rounded-[2rem] shadow-xl hover:shadow-2xl dark:shadow-none transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#bcd4dc]/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-[#bcd4dc]/20 transition-colors" />
                
                <div className="w-14 h-14 bg-slate-50 dark:bg-[#bcd4dc]/10 rounded-2xl flex items-center justify-center text-slate-900 dark:text-[#bcd4dc] mb-6 border border-[#bcd4dc]/20 transition-colors">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">WhatsApp</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-6 transition-colors">Respuestas rápidas para antojos urgentes.</p>
                <div className="flex items-center gap-2 text-slate-900 dark:text-[#bcd4dc] font-bold text-sm tracking-widest uppercase transition-colors">
                  Escribir ahora <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>

            {/* Tarjeta de Email & Ubicación */}
            <div className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800/60 p-8 rounded-[2rem] shadow-xl dark:shadow-none flex flex-col gap-8 transition-colors duration-300">
                
                {/* Email */}
                <div className="flex items-start gap-4 group">
                    <div className="w-12 h-12 shrink-0 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 mt-1 transition-colors">
                        <Mail className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-1 transition-colors">Correo Electrónico</h4>
                        <a href="mailto:infinitasposibilidadescosmos@gmail.com" className="text-slate-500 dark:text-slate-400 hover:text-[#bcd4dc] dark:hover:text-[#bcd4dc] transition-colors font-medium break-all">infinitasposibilidades<br/>cosmos@gmail.com</a>
                    </div>
                </div>

                <div className="w-full h-px bg-slate-100 dark:bg-slate-800/60 transition-colors" />

                {/* Ubicación */}
                <div className="flex items-start gap-4 group">
                    <div className="w-12 h-12 shrink-0 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 mt-1 transition-colors">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-1 transition-colors">Base de Operaciones</h4>
                        <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Arequipa, Perú.<br/>Entregas a toda la ciudad blanca.</p>
                    </div>
                </div>

            </div>
          </motion.div>

          {/* COLUMNA DERECHA: FORMULARIO VINCULADO A WHATSAPP */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-7 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800/60 p-8 md:p-12 rounded-[3rem] shadow-2xl dark:shadow-none transition-colors duration-300"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">Envía un mensaje</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium transition-colors">Llenar este formulario es tan fácil como terminar uno de nuestros helados.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest pl-1 transition-colors">Nombre y Apellido</label>
                        <input 
                            type="text" 
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleInputChange}
                            required
                            placeholder="Ej. Juan Pérez" 
                            className="w-full bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-[#bcd4dc] focus:ring-1 focus:ring-[#bcd4dc] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest pl-1 transition-colors">Correo Electrónico</label>
                        <input 
                            type="email" 
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="tu@correo.com" 
                            className="w-full bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-[#bcd4dc] focus:ring-1 focus:ring-[#bcd4dc] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest pl-1 transition-colors">Asunto</label>
                    <select 
                        name="asunto"
                        value={formData.asunto}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-[#bcd4dc] focus:ring-1 focus:ring-[#bcd4dc] transition-all font-medium appearance-none"
                    >
                        <option value="duda">Tengo una duda sobre un producto</option>
                        <option value="evento">Quiero helados para un evento / catering</option>
                        <option value="negocio">Quiero vender Cosmos en mi negocio</option>
                        <option value="otro">Otro motivo</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest pl-1 transition-colors">Tu Mensaje</label>
                    <textarea 
                        name="mensaje"
                        value={formData.mensaje}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        placeholder="Escribe aquí los detalles..." 
                        className="w-full bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-[#bcd4dc] focus:ring-1 focus:ring-[#bcd4dc] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium resize-none"
                    ></textarea>
                </div>

                <button 
                    type="submit" 
                    disabled={enviando || enviado}
                    className={`w-full h-16 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all uppercase tracking-widest relative overflow-hidden ${
                        enviado 
                            ? "bg-[#bcd4dc] text-slate-900" 
                            : "bg-[#bcd4dc] text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 shadow-xl active:scale-95"
                    }`}
                >
                    <AnimatePresence mode="wait">
                        {enviando ? (
                            <motion.div key="enviando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" /> Conectando...
                            </motion.div>
                        ) : enviado ? (
                            <motion.div key="enviado" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> Abriendo WhatsApp
                            </motion.div>
                        ) : (
                            <motion.div key="enviar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <Send className="w-5 h-5" /> Enviar por WhatsApp
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>
            </form>
          </motion.div>

        </div>
      </section>

    </div>
  );
}