"use client";

import { useState, useEffect } from "react";
import { 
  Search, Layers, ChefHat, FlaskConical, ScrollText, 
  Edit2, PackageCheck, AlertCircle 
} from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { ModalFinal } from "@/components/recetas/ModalFinal"; 
import type { RecetaProduccionDoc } from "@/types/produccion";
import { Badge } from "@/components/ui/badge";

export default function RecetasPage() {
  const [recetas, setRecetas] = useState<Array<{ id: string; data: RecetaProduccionDoc }>>([]);
  const [loading, setLoading] = useState(true);
  
  // FILTROS
  const [busqueda, setBusqueda] = useState("");
  // Homogeneizado: Usamos los mismos identificadores que en la lógica de inventario
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "Base" | "Intermedio">("todos");

  // MODAL
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReceta, setEditingReceta] = useState<{ id: string; data: RecetaProduccionDoc } | null>(null);
  // Tipo para el modal ("subreceta" mapea a Intermedio, "final" mapea a Base)
  const [tipoRecetaModal, setTipoRecetaModal] = useState<"subreceta" | "final">("final");

  // CARGAR DATOS
  useEffect(() => {
    const q = query(collection(db, "recetas_produccion"), orderBy("nombre", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setRecetas(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        data: doc.data() as RecetaProduccionDoc 
      })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // =====================================================================
  //  LÓGICA DE FILTRADO HOMOGÉNEA
  // =====================================================================
  const recetasFiltradas = recetas.filter(item => {
    const r = item.data;
    const matchesSearch = r.nombre.toLowerCase().includes(busqueda.toLowerCase());
    
    // Normalización de tipos para el filtro
    let tipoNormalizado = r.tipo === 'final' ? 'Base' : r.tipo === 'subreceta' ? 'Intermedio' : r.tipo;
    
    const matchesType = filtroTipo === "todos" ? true : tipoNormalizado === filtroTipo;
    
    return matchesSearch && matchesType;
  });

  const handleOpenNew = (tipo: "subreceta" | "final") => {
    setEditingReceta(null);
    setTipoRecetaModal(tipo);
    setModalOpen(true);
  };

  const handleEdit = (receta: { id: string; data: RecetaProduccionDoc }) => {
    setEditingReceta(receta);
    setTipoRecetaModal(receta.data.tipo);
    setModalOpen(true);
  };

  const getFotoUrl = (receta: RecetaProduccionDoc) => {
    if (receta.imagen) return receta.imagen;
    return receta.tipo === 'final' 
      ? "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=800&q=80" 
      : "https://images.unsplash.com/photo-1615486511484-92e172cc416d?auto=format&fit=crop&w=800&q=80"; 
  };

  // Estilos de Badge dinámicos para modo oscuro
  const getBadgeStyle = (tipo: string) => {
    if (tipo === 'final' || tipo === 'Base') return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
    if (tipo === 'subreceta' || tipo === 'Intermedio') return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/40 pb-8">
          <div className="space-y-2">
            {/* 🔥 CORRECCIÓN DEL TÍTULO AZUL 🔥 */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <ChefHat className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">Arquitectura de Productos</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Recetario Maestro
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Diseña tus fórmulas de producción. Clasifica entre <b>Bases</b> (helado final) e <b>Intermedios</b> (insumos preparados).
            </p>
          </div>
          
          <div className="flex gap-3 shrink-0">
            {/* 🔥 CORRECCIÓN DEL BOTÓN INTERMEDIO 🔥 */}
            <button 
              onClick={() => handleOpenNew("subreceta")}
              className="h-11 px-6 rounded-xl font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              <FlaskConical className="w-4 h-4 shrink-0" /> Nuevo Intermedio
            </button>
            {/* 🔥 CORRECCIÓN DEL BOTÓN BASE 🔥 */}
            <button 
              onClick={() => handleOpenNew("final")}
              className="h-11 px-6 rounded-xl font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:scale-[1.02] transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              <ScrollText className="w-4 h-4 shrink-0" /> Nueva Base
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS & BUSCADOR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/50 backdrop-blur-sm p-2 rounded-2xl border border-border/40 shadow-sm">
          <div className="flex p-1 bg-muted/40 rounded-xl w-full md:w-auto overflow-x-auto gap-1">
            {[
              { id: "todos", label: "Todo", icon: Layers },
              { id: "Intermedio", label: "Intermedios", icon: FlaskConical },
              { id: "Base", label: "Bases", icon: ScrollText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = filtroTipo === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFiltroTipo(tab.id as any)}
                  className={`
                    flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                    ${isActive 
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"}
                  `}
                >
                  {/* Iconos coloreados si están activos */}
                  <Icon className={`w-4 h-4 ${isActive ? (tab.id === 'Base' ? 'text-pink-500' : tab.id === 'Intermedio' ? 'text-purple-500' : 'text-blue-500') : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
            <input 
              placeholder="Buscar por nombre o ingrediente..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-border/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* GRID DE RECETAS */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground animate-pulse flex flex-col items-center gap-3">
          <ChefHat className="w-10 h-10 animate-bounce opacity-20" />
          Cargando recetario maestro...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {recetasFiltradas.length > 0 ? (
            recetasFiltradas.map((receta) => {
              const tipoActual = receta.data.tipo === 'final' ? 'Base' : 'Intermedio';
              const esBase = tipoActual === 'Base';
              
              return (
                <div 
                  key={receta.id} 
                  className="group bg-card rounded-2xl border border-border/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full"
                >
                  {/* IMAGEN Y BOTONES */}
                  <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                    <img 
                      src={getFotoUrl(receta.data)} 
                      alt={receta.data.nombre}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    {/* Badge Flotante Superior */}
                    <div className="absolute top-3 left-3">
                      <Badge className={`backdrop-blur-md px-2.5 py-1 ${getBadgeStyle(tipoActual)}`}>
                        {esBase ? <ScrollText className="w-3 h-3 mr-1.5"/> : <FlaskConical className="w-3 h-3 mr-1.5"/>}
                        {tipoActual}
                      </Badge>
                    </div>

                    {/* Botón de Edición (Hover) */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleEdit(receta); }} 
                         className="bg-background text-foreground h-10 w-10 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  {/* CUERPO DE LA TARJETA */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg leading-tight text-foreground line-clamp-2">
                        {receta.data.nombre}
                      </h3>
                      
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground font-medium bg-muted/40 p-2 rounded-lg border border-border/50">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Destino: <strong className="text-foreground">{receta.data.outputNombre}</strong></span>
                      </div>
                    </div>

                    {/* METADATOS INFERIORES */}
                    <div className="mt-auto pt-4 border-t border-dashed border-border/50 grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block">Insumos</span>
                        <span className="font-bold text-foreground text-sm">{receta.data.ingredientes.length} <span className="text-[10px] text-muted-foreground font-normal">items</span></span>
                      </div>
                      
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block">Rendimiento</span>
                        <span className="font-black text-foreground text-sm tracking-tighter">
                          {receta.data.batchBaseKg} <span className="text-[10px] font-bold text-muted-foreground">KG</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
              <div className="bg-muted p-6 rounded-full mb-4">
                <Search className="w-10 h-10 text-muted-foreground stroke-1" />
              </div>
              <h3 className="text-xl font-bold text-foreground">No hay recetas que coincidan</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajusta los filtros o intenta con una nueva búsqueda.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL FINAL */}
      <ModalFinal 
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tipo={tipoRecetaModal}
        initial={editingReceta}
      />
    </div>
  );
}