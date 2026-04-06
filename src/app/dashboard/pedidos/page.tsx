"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/firebaseConfig";
import { 
  collection, onSnapshot, query, orderBy, 
  doc, updateDoc, deleteDoc
} from "firebase/firestore";
import toast from "react-hot-toast";
import { 
  Truck, Search, Trash2, MessageSquare, MapPin, 
  Package, Clock, CheckCircle2, X, CheckCircle,
  LayoutGrid, AlignJustify, ChevronRight, Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS = [
  { id: 'yape', label: "Yape", icon: "/brand/payments/yape.png" },
  { id: 'plin', label: "Plin", icon: "/brand/payments/plin.png" },
  { id: 'tarjeta', label: "Tarjeta", icon: "/brand/payments/tarjeta.png" },
];

const getPoteIcon = (nombreTamano: string) => {
  if (!nombreTamano) return "/icons/pote-16oz.png";
  const nombre = nombreTamano.toLowerCase();
  if (nombre.includes("8")) return "/icons/pote-8oz.png";
  if (nombre.includes("16")) return "/icons/pote-16oz.png";
  if (nombre.includes("32") || nombre.includes("litro") || nombre.includes("25")) return "/icons/pote-32oz.png";
  return "/icons/pote-16oz.png"; 
};

export default function PedidosPage() {
  const [mounted, setMounted] = useState(false);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [pedidoParaDespachar, setPedidoParaDespachar] = useState<any | null>(null);
  const [pedidoSeleccionadoDetalle, setPedidoSeleccionadoDetalle] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filterBySearch = (lista: any[]) => 
    lista.filter(p => {
      const nombre = (p.cliente || p.nombreCliente || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      return nombre.includes(busqueda.toLowerCase()) || id.includes(busqueda.toLowerCase());
    });

  const pedidosActivos = filterBySearch(pedidos.filter(p => p.estado !== "Enviado"));
  const pedidosEntregados = filterBySearch(pedidos.filter(p => p.estado === "Enviado"));

  const handleConfirmarDespacho = async (id: string, metodo: string) => {
    try {
      await updateDoc(doc(db, "pedidos", id), { 
        estado: "Enviado",
        metodoPago: metodo 
      });
      toast.success(`Misión despachada con ${metodo}`);
      setPedidoParaDespachar(null);
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este pedido?")) return;
    try {
      await deleteDoc(doc(db, "pedidos", id));
      toast.success("Pedido eliminado");
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const abrirWhatsApp = (tel: string) => {
    const num = tel.replace(/\D/g, "");
    window.open(`https://wa.me/${num.startsWith("51") ? num : "51" + num}`, "_blank");
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 font-sans relative transition-colors duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-border/40 pb-8">
        <div>
          {/* 🔥 CORRECCIÓN DEL TÍTULO ADAPTABLE AL MODO OSCURO 🔥 */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Logística de Despacho</span>
          </div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Gestión de Pedidos</h1>
          <p className="text-lg text-muted-foreground mt-1 max-w-2xl font-medium">
            Control de entregas y confirmación de métodos de pago.
          </p>
        </div>

        {/* 🔥 CORRECCIÓN DE LOS BOTONES DE VISTA GRID/LIST 🔥 */}
        <div className="flex bg-card p-1 rounded-xl border border-border shadow-sm gap-1">
            <button 
              onClick={() => setViewMode("grid")} 
              className={cn(
                "p-2 rounded-lg transition-all", 
                viewMode === "grid" ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")} 
              className={cn(
                "p-2 rounded-lg transition-all", 
                viewMode === "list" ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
        </div>
      </div>

      <Tabs defaultValue="pendientes" className="w-full">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <TabsList className="bg-muted/40 p-1 rounded-xl h-auto flex flex-wrap gap-1 border-none">
            <TabsTrigger value="pendientes" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-6 py-2.5 gap-2 text-sm font-medium transition-all tracking-tight">
              <Clock className="w-4 h-4" /> Pendientes
            </TabsTrigger>
            <TabsTrigger value="entregados" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-6 py-2.5 gap-2 text-sm font-medium transition-all tracking-tight">
              <CheckCircle2 className="w-4 h-4" /> Entregados
            </TabsTrigger>
          </TabsList>

          {/* 🔥 BUSCADOR MEJORADO PARA MODO OSCURO 🔥 */}
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
            <input 
              placeholder="Buscar cliente o ID..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-border/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm text-foreground font-medium"
            />
          </div>
        </div>

        <TabsContent value="pendientes" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
          <RenderPedidos mode={viewMode} pedidos={pedidosActivos} onDespachar={setPedidoParaDespachar} onDelete={handleDelete} onWA={abrirWhatsApp} onVerDetalle={setPedidoSeleccionadoDetalle} />
        </TabsContent>

        <TabsContent value="entregados" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
          <RenderPedidos mode={viewMode} pedidos={pedidosEntregados} onDespachar={setPedidoParaDespachar} onDelete={handleDelete} onWA={abrirWhatsApp} onVerDetalle={setPedidoSeleccionadoDetalle} />
        </TabsContent>
      </Tabs>

      {/* MODAL PARA DESPACHAR */}
      <ModalDespacho 
        pedido={pedidoParaDespachar} 
        onClose={() => setPedidoParaDespachar(null)} 
        onConfirm={handleConfirmarDespacho} 
        mounted={mounted}
      />

      {/* MODAL PARA VER DETALLES DEL PEDIDO (PORTAL) */}
      {mounted && createPortal(
        <AnimatePresence>
          {pedidoSeleccionadoDetalle && (
            <motion.div
              key="modal-detalle-pedido"
              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPedidoSeleccionadoDetalle(null)}
            >
              <motion.div
                className="bg-background rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-border"
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-card border-b border-border px-6 py-5 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute -right-4 -top-4 opacity-5"><Package className="w-28 h-28 text-foreground" /></div>
                    <div>
                        <h3 className="text-foreground font-black text-lg uppercase tracking-tight relative z-10 pr-6 leading-tight">
                          Detalle del Pedido
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-1 relative z-10">
                          {pedidoSeleccionadoDetalle.cliente || pedidoSeleccionadoDetalle.nombreCliente}
                        </p>
                    </div>
                    <button onClick={() => setPedidoSeleccionadoDetalle(null)} className="text-muted-foreground hover:text-foreground transition-colors relative z-10 bg-muted/50 p-2 rounded-full border border-border hover:bg-muted">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-3 bg-muted/20 flex-1 overflow-y-auto custom-scrollbar">
                    {(!pedidoSeleccionadoDetalle.items || pedidoSeleccionadoDetalle.items.length === 0) && (!pedidoSeleccionadoDetalle.productos || pedidoSeleccionadoDetalle.productos.length === 0) ? (
                        <div className="text-center py-6 text-muted-foreground font-bold text-xs uppercase tracking-widest italic">
                            El pedido no tiene items registrados.
                        </div>
                    ) : (
                        (pedidoSeleccionadoDetalle.items || pedidoSeleccionadoDetalle.productos).map((item: any, idx: number) => (
                            <div key={idx} className="bg-background border border-border rounded-2xl p-3 flex items-center justify-between shadow-sm hover:border-primary/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center p-1.5 border border-border shrink-0">
                                        <img src={item.imagen || getPoteIcon(item.tamano || item.nombre)} alt="Pote" className="w-full h-full object-contain drop-shadow-sm" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-black text-foreground text-xs uppercase tracking-tight line-clamp-1">{item.nombre || item.producto}</span>
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{item.tamano || "Unidad"}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl font-black text-sm tabular-nums shadow-sm whitespace-nowrap">
                                      x {item.cantidad}
                                  </div>
                                  {item.precio && (
                                      <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                                  )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="p-5 bg-card border-t border-border shrink-0 flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total:</span>
                    <span className="text-xl font-black text-emerald-500">S/ {Number(pedidoSeleccionadoDetalle.total || 0).toFixed(2)}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// NUEVO COMPONENTE: TARJETA GRID PROFESIONAL CON ACORDEÓN (ADAPTADO MODO OSCURO)
function PedidoGridCard({ pedido, onDespachar, onDelete, onWA, onVerDetalle }: any) {
  const [expanded, setExpanded] = useState(false);
  const infoMetodo = PAYMENT_OPTIONS.find(opt => opt.id === pedido.metodoPago);
  const isEntregado = pedido.estado === "Enviado";

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col overflow-hidden h-full">
      
      {/* SECCIÓN SUPERIOR: DATOS VITALES */}
      <div className="p-6 md:p-8 space-y-5 flex-1">
         
         <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-muted-foreground bg-muted px-3 py-1.5 rounded-lg tracking-widest border border-border shadow-sm">
              #{pedido.id.slice(-5).toUpperCase()}
            </span>
            <Badge className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border shadow-none tracking-widest ${isEntregado ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
              {isEntregado ? "Entregado" : "Pendiente"}
            </Badge>
         </div>

         <div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none mb-2 break-words" title={pedido.cliente || pedido.nombreCliente}>
              {pedido.cliente || pedido.nombreCliente}
            </h3>
            <button onClick={() => onWA(pedido.telefono)} className="text-emerald-500 text-xs font-bold flex items-center gap-1.5 hover:underline w-fit">
              <MessageSquare className="w-3.5 h-3.5"/> {pedido.telefono}
            </button>
         </div>

         <div className="flex items-start gap-2 bg-muted/30 p-3 rounded-xl border border-border">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-foreground/80 uppercase tracking-tight leading-snug break-words">
              {pedido.direccion}
            </p>
         </div>

         <div className="flex justify-between items-end pt-2">
            <div>
               <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Total a cobrar</p>
               <p className="text-3xl font-black text-emerald-500 leading-none tabular-nums tracking-tighter">S/ {pedido.total?.toFixed(2)}</p>
            </div>
            {pedido.metodoPago && (
               <div className="flex flex-col items-end">
                 <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Pago</p>
                 <img src={infoMetodo?.icon} className="h-7 object-contain" alt={pedido.metodoPago} title={infoMetodo?.label} />
               </div>
            )}
         </div>
      </div>

      {/* ACCIÓN PRINCIPAL (Si está pendiente) */}
      {!isEntregado && (
         <div className="px-6 md:px-8 pb-6 shrink-0">
           <button 
             onClick={() => onDespachar(pedido)} 
             className="w-full py-3.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2 hover:scale-[1.02] transition-transform shadow-md active:scale-95"
           >
             <Truck className="w-4 h-4"/> Despachar Misión
           </button>
         </div>
      )}

      {/* SECCIÓN INFERIOR: ACORDEÓN DE DETALLES */}
      <div className="bg-muted/20 border-t border-border flex flex-col shrink-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-6 md:px-8 py-4 flex justify-between items-center text-[11px] font-black text-muted-foreground uppercase tracking-widest hover:bg-muted/50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span>{pedido.items?.length || 0} Productos en orden</span>
          </div>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300", expanded && "rotate-90")} />
        </button>

        <AnimatePresence>
          {expanded && (
             <motion.div
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: "auto", opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               transition={{ duration: 0.2 }}
               className="overflow-hidden"
             >
               <div className="px-6 md:px-8 pb-6 space-y-3">
                 
                 {/* Lista de Items */}
                 <div className="space-y-2">
                   {pedido.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-background p-2.5 rounded-xl border border-border shadow-sm hover:border-primary/30 transition-colors">
                         <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-lg bg-muted/50 shrink-0 flex items-center justify-center p-1 border border-border">
                               <img src={item.imagen || getPoteIcon(item.tamano)} className="w-full h-full object-contain" alt="" />
                            </div>
                            <div className="truncate">
                               <p className="text-xs font-black text-foreground uppercase truncate leading-tight" title={item.nombre || item.producto}>
                                 {item.nombre || item.producto}
                               </p>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5 tracking-widest">
                                 {item.tamano} <span className="text-blue-600 dark:text-blue-400 font-black ml-1">x{item.cantidad}</span>
                               </p>
                            </div>
                         </div>
                         <span className="text-sm font-black text-foreground shrink-0 ml-3 tabular-nums">
                           S/ {((item.precio || 0) * item.cantidad).toFixed(2)}
                         </span>
                      </div>
                   ))}
                 </div>
                 
                 {/* Footer del Acordeón: Eliminar y Ver Modal */}
                 <div className="pt-3 border-t border-border flex justify-between items-center">
                    <button 
                      onClick={() => onDelete(pedido.id)} 
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Eliminar Pedido"
                    >
                       <Trash2 className="w-4 h-4"/>
                    </button>
                    
                    <button 
                      onClick={() => onVerDetalle(pedido)} 
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg flex items-center gap-1 transition-colors"
                    >
                       Ampliar Resumen <Eye className="w-3.5 h-3.5"/>
                    </button>
                 </div>

               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Función principal de renderizado (Lista Clásica o Nuevo Grid)
function RenderPedidos({ mode, pedidos, onDespachar, onDelete, onWA, onVerDetalle }: any) {
  if (pedidos.length === 0) return (
    <div className="py-24 flex flex-col items-center justify-center text-center opacity-60 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border">
        <Truck className="w-12 h-12 mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold text-foreground">Sin misiones</h3>
    </div>
  );

  if (mode === "list") {
    return (
      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold uppercase text-muted-foreground bg-muted/30">
                <th className="px-6 py-5">Orden</th>
                <th className="px-6 py-5">Cliente</th>
                <th className="px-6 py-5 text-center">Helado</th>
                <th className="px-6 py-5">Pago</th>
                <th className="px-6 py-5">Dirección</th>
                <th className="px-6 py-5 text-center">Fecha</th>
                <th className="px-6 py-5 text-right">Total</th>
                <th className="px-6 py-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {pedidos.map((pedido: any) => {
                const infoMetodo = PAYMENT_OPTIONS.find(opt => opt.id === pedido.metodoPago);
                return (
                  <tr key={pedido.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-5">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
                          #{pedido.id.slice(-5).toUpperCase()}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-foreground uppercase tracking-tight truncate max-w-[150px]">
                          {pedido.cliente || pedido.nombreCliente}
                        </span>
                        <button onClick={() => onWA(pedido.telefono)} className="text-[10px] font-bold text-emerald-500 hover:underline flex items-center gap-1 mt-0.5">
                          <MessageSquare className="w-3 h-3" /> {pedido.telefono}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex -space-x-3 justify-center">
                          {pedido.items?.slice(0, 3).map((item: any, i: number) => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-background overflow-hidden shadow-sm bg-muted ring-1 ring-border">
                               <img src={item.imagen || getPoteIcon(item.tamano)} className="w-full h-full object-cover" alt="" title={`${item.nombre} x${item.cantidad}`} />
                            </div>
                          ))}
                          {pedido.items?.length > 3 && (
                            <div className="w-10 h-10 rounded-full border-2 border-background bg-foreground flex items-center justify-center shadow-sm ring-1 ring-border">
                               <span className="text-[9px] font-bold text-background">+{pedido.items.length - 3}</span>
                            </div>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-5">
                        {pedido.metodoPago ? (
                          <div className="flex items-center gap-3 bg-background border border-border px-3 py-2 rounded-xl w-fit shadow-sm">
                            <img src={infoMetodo?.icon} className="w-6 h-6 object-contain" alt="" />
                            <span className="text-[11px] font-black uppercase text-foreground tracking-wider">{pedido.metodoPago}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase italic">Pendiente</span>
                        )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-1 max-w-[180px]">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2 uppercase font-bold">
                          {pedido.direccion}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center">
                         <span className="text-[11px] font-black text-muted-foreground uppercase tracking-tighter">
                            {pedido.fecha ? format(pedido.fecha.toDate(), "dd MMM", { locale: es }) : "-"}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-lg font-black text-emerald-500 tabular-nums tracking-tighter">
                        S/ {pedido.total?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 pr-2">
                        <button 
                          onClick={() => onVerDetalle(pedido)}
                          className="p-2.5 bg-background border border-border text-muted-foreground rounded-xl hover:bg-foreground hover:text-background transition-all shadow-sm"
                          title="Ver detalle de items"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {pedido.estado !== "Enviado" ? (
                          <button 
                            onClick={() => onDespachar(pedido)} 
                            className="p-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl hover:scale-105 transition-transform shadow-sm active:scale-95"
                            title="Despachar Misión"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20" title="Completado">
                             <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                        <button onClick={() => onDelete(pedido.id)} className="p-2.5 bg-background border border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-all shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 🔥 AJUSTE GRID: Se reduce la cantidad de columnas para que las tarjetas sean más anchas 🔥
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {pedidos.map((pedido: any) => (
         <PedidoGridCard 
            key={pedido.id} 
            pedido={pedido} 
            onDespachar={onDespachar} 
            onDelete={onDelete} 
            onWA={onWA} 
            onVerDetalle={onVerDetalle} 
         />
      ))}
    </div>
  );
}

// MODAL DESPACHO ADAPTADO AL DARK MODE
function ModalDespacho({ pedido, onClose, onConfirm, mounted }: any) {
  const [metodo, setMetodo] = useState<string | null>(null);
  if (!pedido || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans text-foreground">
      <div className="bg-background w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-border flex justify-between items-center bg-card">
          <h3 className="text-xl font-extrabold text-foreground uppercase tracking-tight">Confirmar Despacho</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Medio de Pago:</p>
          <div className="grid grid-cols-3 gap-3 w-full">
            {PAYMENT_OPTIONS.map((opt) => (
              <button key={opt.id} onClick={() => setMetodo(opt.id)} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${metodo === opt.id ? "border-blue-500 bg-blue-500/10 scale-105" : "border-border hover:bg-muted/50"}`}>
                <div className="relative w-12 h-12"><img src={opt.icon} alt={opt.label} className="w-full h-full object-contain" /></div>
                <span className="text-[10px] font-bold uppercase text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 bg-card flex gap-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-4 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors">Cancelar</button>
          <button disabled={!metodo} onClick={() => metodo && onConfirm(pedido.id, metodo)} className="flex-1 py-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold uppercase rounded-xl shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:scale-100">
            <CheckCircle className="w-4 h-4" /> Despachar
          </button>
        </div>
      </div>
    </div>,
    document.body 
  );
}