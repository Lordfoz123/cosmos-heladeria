"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MapPin, Instagram, Facebook, BookOpen, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ShopFooter() {
  // Estado para controlar qué modal está abierto (null = ninguno)
  const [modalAbierto, setModalAbierto] = useState<"terminos" | "privacidad" | null>(null);

  return (
    <>
      <footer className="w-full bg-[#0B0F19] text-slate-400 pt-16 pb-8 border-t border-slate-800/60 font-sans relative z-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left">
          
          {/* COLUMNA 1: LOGO Y LIBRO DE RECLAMACIONES */}
          <div className="flex flex-col items-center md:items-start gap-4">
            {/* LOGO COSMOS */}
            <div className="flex items-center gap-2 mb-2">
                <Link href="/">
                  <img
                    src="/brand/logo-cosmos-dark.png" 
                    alt="Cosmos Heladería"
                    className="h-8 w-auto object-contain transition-opacity duration-300 hover:opacity-80"
                  />
                </Link>
            </div>
            
            {/* BOTÓN LIBRO DE RECLAMACIONES */}
            <Link href="/libro-reclamaciones" className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-[#bcd4dc]/50 hover:bg-[#bcd4dc]/10 text-slate-300 transition-all text-xs font-bold uppercase tracking-widest group mt-2">
              <BookOpen className="w-4 h-4 text-[#bcd4dc] group-hover:scale-110 transition-transform" />
              Libro de Reclamaciones
            </Link>
          </div>

          {/* COLUMNA 2: ATENCIÓN AL CLIENTE */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <h4 className="text-white font-bold tracking-wide text-xs mb-1 uppercase tracking-widest">Atención al cliente</h4>
            <a href="mailto:infinitasposibilidadescosmos@gmail.com" className="hover:text-[#bcd4dc] transition-colors flex items-center gap-3 text-sm font-medium group">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-[#bcd4dc] group-hover:text-slate-900 transition-colors">
                  <Mail className="w-4 h-4 text-white group-hover:text-slate-900" />
              </div>
              <span className="break-all text-left">infinitasposibilidades<br/>cosmos@gmail.com</span>
            </a>
            <div className="flex items-center gap-3 text-sm font-medium group cursor-default">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center transition-colors">
                  <MapPin className="w-4 h-4 text-white" />
              </div>
              Arequipa, Perú
            </div>
          </div>

          {/* COLUMNA 3: REDES SOCIALES */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <h4 className="text-white font-bold tracking-wide text-xs mb-1 uppercase tracking-widest">Síguenos</h4>
            <div className="flex gap-3">
              <a href="https://www.instagram.com/cosmos.helados/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-[#bcd4dc] hover:text-slate-900 transition-all hover:scale-110 shadow-sm text-white">
                  <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61552713584524" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-[#bcd4dc] hover:text-slate-900 transition-all hover:scale-110 shadow-sm text-white">
                  <Facebook className="w-4 h-4" />
              </a>
              {/* 🔥 ICONO DE TIKTOK 🔥 */}
              <a href="https://www.tiktok.com/@cosmos.helados" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-[#bcd4dc] hover:text-slate-900 transition-all hover:scale-110 shadow-sm text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="icon icon-tabler icons-tabler-filled icon-tabler-brand-tiktok"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M16.083 2h-4.083a1 1 0 0 0 -1 1v11.5a1.5 1.5 0 1 1 -2.519 -1.1l.12 -.1a1 1 0 0 0 .399 -.8v-4.326a1 1 0 0 0 -1.23 -.974a7.5 7.5 0 0 0 1.73 14.8l.243 -.005a7.5 7.5 0 0 0 7.257 -7.495v-2.7l.311 .153c1.122 .53 2.333 .868 3.59 .993a1 1 0 0 0 1.099 -.996v-4.033a1 1 0 0 0 -.834 -.986a5.005 5.005 0 0 1 -4.097 -4.096a1 1 0 0 0 -.986 -.835z" /></svg>
              </a>
            </div>
          </div>
        </div>
        
        {/* SECCIÓN INFERIOR: LEGALES Y COPYRIGHT */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800/60 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-medium opacity-80">
          <p>&copy; {new Date().getFullYear()} Cosmos - Infinitas Posibilidades. Todos los derechos reservados.</p>
          <div className="flex flex-wrap justify-center gap-6">
              {/* Transformamos los Links en botones que abren modales */}
              <button onClick={() => setModalAbierto("terminos")} className="hover:text-[#bcd4dc] transition-colors cursor-pointer">
                Términos y Condiciones
              </button>
              <button onClick={() => setModalAbierto("privacidad")} className="hover:text-[#bcd4dc] transition-colors cursor-pointer">
                Políticas de Privacidad
              </button>
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* 🔥 MODALES DE LEGALES (Términos y Privacidad) 🔥          */}
      {/* ========================================================= */}
      <AnimatePresence>
        {modalAbierto && (
          <motion.div 
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalAbierto(null)} // Cierra al hacer clic afuera
          >
            <motion.div 
              className="bg-white dark:bg-[#0B0F19] w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col relative"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer clic adentro
            >
              
              {/* HEADER DEL MODAL */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {modalAbierto === "terminos" ? "Términos y Condiciones" : "Políticas de Privacidad"}
                </h3>
                <button 
                  onClick={() => setModalAbierto(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CONTENIDO DEL MODAL (SCROLLABLE) */}
              <div className="p-6 overflow-y-auto text-slate-600 dark:text-slate-300 font-medium text-sm space-y-6 leading-relaxed">
                
                {modalAbierto === "terminos" && (
                  <>
                    <p>Bienvenido a <strong>Cosmos - Infinitas Posibilidades</strong>. Al acceder y utilizar nuestro sitio web y nuestros servicios de compra, aceptas cumplir con los siguientes términos y condiciones.</p>
                    
                    <p className="italic text-xs border-l-2 border-[#bcd4dc] pl-3 py-1 bg-slate-50 dark:bg-slate-800/40">
                      Infinitas posibilidades Sac podrá modificar, adicionar, eliminar y/o actualizar los Términos y Condiciones en cualquier momento, por cualquier razón y/o sin previo aviso, los cuales tendrán validez desde el momento de su publicación.
                    </p>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">1. Uso del sitio web</h4>
                      <p>El contenido de las páginas de este sitio web es para su información y uso general. El uso no autorizado de este sitio web puede dar lugar a una reclamación por daños y perjuicios y/o constituir un delito.</p>
                    </div>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">2. Pedidos y Disponibilidad</h4>
                      <p>Todos los pedidos realizados a través de nuestra plataforma están sujetos a disponibilidad de inventario. Nos reservamos el derecho de rechazar cualquier pedido o de limitar las cantidades adquiridas. En caso de no poder procesar su pedido, se le notificará a la brevedad y se realizará el reembolso correspondiente si aplicara.</p>
                    </div>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">3. Precios y Pagos</h4>
                      <p>Los precios de nuestros helados y productos están en moneda local (Soles) y pueden variar sin previo aviso. El pago debe realizarse en su totalidad en el momento de efectuar la compra a través de las pasarelas de pago proporcionadas.</p>
                    </div>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">4. Tiempos de envío a domicilio</h4>
                      <p>Confirmado el proceso de compra, las reglas de entrega se sujetan a lo establecido en la sección “Envíos” del menú del sitio web.</p>
                      <p className="mt-2 text-rose-500 dark:text-rose-400 font-bold">Infinitas posibilidades sac no incurrirá en responsabilidad si por caso de fuerza mayor y/o desastres naturales no se pudiera entregar el producto en la fecha acordada con el CLIENTE o dentro de los tiempos de entrega indicados.</p>
                    </div>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">5. Propiedad Intelectual</h4>
                      <p>El logotipo de Cosmos, diseños, imágenes de productos y textos son propiedad exclusiva de Cosmos - Infinitas Posibilidades. Queda prohibida su reproducción o uso comercial sin autorización expresa.</p>
                    </div>
                  </>
                )}

                {modalAbierto === "privacidad" && (
                  <>
                    <p>En <strong>Cosmos - Infinitas Posibilidades</strong> respetamos su privacidad y estamos comprometidos a proteger su información personal. Esta política explica cómo recopilamos, usamos y resguardamos sus datos.</p>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">1. Recopilación de información</h4>
                      <p>Podemos recopilar información de identificación personal, como su nombre, dirección de correo electrónico, número de teléfono y dirección de entrega, exclusivamente cuando usted nos la proporciona voluntariamente al realizar un pedido o registrarse en nuestro sitio.</p>
                    </div>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">2. Uso de la información</h4>
                      <p>Utilizamos la información recopilada para procesar y entregar sus pedidos, enviarle actualizaciones sobre el estado de sus compras y mejorar nuestro servicio al cliente.</p>
                    </div>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">3. Protección de sus datos</h4>
                      <p>Implementamos medidas de seguridad para mantener la confidencialidad de su información personal. No vendemos, intercambiamos ni transferimos a terceros su información de identificación personal sin su consentimiento, excepto a agencias de mensajería estrictamente necesarias para realizar la entrega de su pedido.</p>
                    </div>

                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-2 uppercase tracking-widest text-[11px]">4. Cookies</h4>
                      <p>Nuestro sitio puede utilizar "cookies" para mejorar su experiencia de usuario. Su navegador web coloca cookies en su disco duro con fines de registro y, a veces, para rastrear información sobre usted.</p>
                    </div>
                  </>
                )}

              </div>

              {/* FOOTER DEL MODAL */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 shrink-0">
                <button 
                  onClick={() => setModalAbierto(null)}
                  className="w-full py-4 bg-[#bcd4dc] text-slate-900 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-md active:scale-95"
                >
                  Entendido
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}