"use client";

import { useState, useMemo } from "react";
import { 
  Search, Pencil, Trash2, LayoutGrid, List, Plus, Minus, 
  PackagePlus, IceCream2, ChevronDown, ChevronUp, ImageIcon, Tag,
  Package, Globe, ArrowLeftRight, X 
} from "lucide-react";
import { Badge } from "@/components/ui/badge"; 
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface InventarioListaProps {
  insumos: any[];
  productosTienda?: any[]; // 🔥 NUEVO: Recibe el catálogo para sacar los precios 🔥
  cargando: boolean;
  onEdit: (insumo: any) => void;
  onDelete: (id: string) => void;
  onStockChange: (id: string, delta: number) => void;
  onTransform: (insumo: any) => void; 
  onDesignar?: (insumo: any) => void;
  titulo?: string;
  subtitulo?: string;
}

type CampoOrden = "nombre" | "categoria" | "costo" | "stock" | "total";

// Regla Matemática Exacta (Corta a 2 decimales, no redondea)
const formatExactTwoDecimals = (val: any) => {
  const num = Number(val) || 0;
  return (Math.trunc(num * 100) / 100).toFixed(2);
};

// 🔥 FUNCIÓN PARA CARGAR LA IMAGEN DEL POTE SEGÚN EL TAMAÑO 🔥
const getPoteIcon = (nombreTamano: string) => {
  const nombre = nombreTamano.toLowerCase();
  if (nombre.includes("8")) return "/icons/pote-8oz.png";
  if (nombre.includes("16")) return "/icons/pote-16oz.png";
  if (nombre.includes("32") || nombre.includes("litro") || nombre.includes("25")) return "/icons/pote-32oz.png";
  return "/icons/pote-16oz.png"; // Fallback por defecto
};

export default function InventarioLista({
  insumos = [], productosTienda = [], cargando, onEdit, onDelete, onStockChange, onTransform, onDesignar, titulo, subtitulo
}: InventarioListaProps) {
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"lista" | "grid">("grid");
  
  const [orden, setOrden] = useState<{ campo: CampoOrden, direccion: "asc" | "desc" }>({
      campo: "nombre",
      direccion: "asc"
  });

  const [tiendaFilaLista, setTiendaFilaLista] = useState<Record<string, "fisica" | "virtual">>({});

  // 🔥 ESTADO DEL MODAL (POP-UP) 🔥
  const [modalDetalle, setModalDetalle] = useState<{
    isOpen: boolean;
    titulo: string;
    total: number;
    tamanos: {nombre: string, cantidad: number}[];
  }>({ isOpen: false, titulo: "", total: 0, tamanos: [] });

  const handleSort = (campo: CampoOrden) => {
      if (orden.campo === campo) {
          setOrden({ campo, direccion: orden.direccion === "asc" ? "desc" : "asc" });
      } else {
          const esTexto = campo === "nombre" || campo === "categoria";
          setOrden({ campo, direccion: esTexto ? "asc" : "desc" });
      }
  };

  const listaProcesada = useMemo(() => {
    const query = busqueda.toLowerCase().trim();
    const mapaUnificado = new Map();

    insumos.forEach(item => {
      const nombreNorm = (item.nombre || "").toLowerCase().trim();
      const tipo = (item.tipo || 'Sin Tipo').trim();
      const clave = `${tipo}_${nombreNorm}`;

      if (tipo === "Producto Final") {
        const destino = item.ultimoDestino === 'virtual' ? 'virtual' : 'fisica';

        // 🔥 LÓGICA DE CRUCE CON CATÁLOGO PARA EXTRAER EL PRECIO REAL 🔥
        const tamanosConPrecioCruzado = (item.tamanos || []).map((t: any) => {
            let precioReal = Number(t.precio) || 0;
            
            // Si es un item virtual, buscamos su precio de venta en el catálogo
            if (destino === 'virtual' && item.catalogoId) {
                const productoEnCatálogo = productosTienda.find(pt => pt.id === item.catalogoId);
                if (productoEnCatálogo && productoEnCatálogo.tamanos) {
                    const tamanoMatch = productoEnCatálogo.tamanos.find((tc: any) => tc.nombre === t.nombre);
                    if (tamanoMatch && Number(tamanoMatch.precio) > 0) {
                        precioReal = Number(tamanoMatch.precio);
                    }
                }
            }
            return { ...t, precio: precioReal };
        });

        if (!mapaUnificado.has(clave)) {
          mapaUnificado.set(clave, { 
            ...item,
            stocksDestino: {
              fisica: destino === 'fisica' ? tamanosConPrecioCruzado : [],
              virtual: destino === 'virtual' ? tamanosConPrecioCruzado : []
            }
          });
        } else {
          const existente = mapaUnificado.get(clave);

          if (!existente.stocksDestino[destino] || existente.stocksDestino[destino].length === 0) {
            existente.stocksDestino[destino] = tamanosConPrecioCruzado;
          } else {
            existente.stocksDestino[destino] = existente.stocksDestino[destino].map((t: any) => {
              const match = tamanosConPrecioCruzado.find((nt:any) => nt.id === t.id);
              return match ? { ...t, stock: (Number(t.stock) || 0) + (Number(match.stock) || 0), precio: match.precio || t.precio } : t;
            });
          }
        }
      } else {
        mapaUnificado.set(item.id, item);
      }
    });

    let filtrados = Array.from(mapaUnificado.values()).filter(i => 
      (i.nombre || "").toLowerCase().includes(query)
    );

    return filtrados.sort((a, b) => {
      let valorA, valorB;
      const esMateriaPrimaA = (a.tipo || "").trim() === "Materia Prima";
      const esMateriaPrimaB = (b.tipo || "").trim() === "Materia Prima";

      switch (orden.campo) {
        case "nombre":
            valorA = (a.nombre || "").toLowerCase();
            valorB = (b.nombre || "").toLowerCase();
            return orden.direccion === "asc" ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
            
        case "categoria":
            valorA = (a.tipo || "").toLowerCase();
            valorB = (b.tipo || "").toLowerCase();
            return orden.direccion === "asc" ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);

        case "costo":
            valorA = esMateriaPrimaA ? (Number(a.costo) || 0) : 0;
            valorB = esMateriaPrimaB ? (Number(b.costo) || 0) : 0;
            return orden.direccion === "asc" ? valorA - valorB : valorB - valorA;

        case "stock":
            valorA = a.tipo === "Producto Final" 
               ? (a.stocksDestino?.fisica?.reduce((acc: any, t: any) => acc + (Number(t.stock) || 0), 0) || 0) + (a.stocksDestino?.virtual?.reduce((acc: any, t: any) => acc + (Number(t.stock) || 0), 0) || 0)
               : (Number(a.stock) || 0);
            valorB = b.tipo === "Producto Final" 
               ? (b.stocksDestino?.fisica?.reduce((acc: any, t: any) => acc + (Number(t.stock) || 0), 0) || 0) + (b.stocksDestino?.virtual?.reduce((acc: any, t: any) => acc + (Number(t.stock) || 0), 0) || 0)
               : (Number(b.stock) || 0);
            return orden.direccion === "asc" ? valorA - valorB : valorB - valorA;

        case "total":
        default:
            valorA = a.tipo === "Producto Final" 
                ? (a.stocksDestino?.fisica?.reduce((acc: any, t: any) => acc + ((Number(t.stock) || 0) * (Number(t.precio) || 0)), 0) || 0) 
                : (esMateriaPrimaA ? ((Number(a.stock) || 0) * (Number(a.costo) || 0)) : 0);
            valorB = b.tipo === "Producto Final" 
                ? (b.stocksDestino?.fisica?.reduce((acc: any, t: any) => acc + ((Number(t.stock) || 0) * (Number(t.precio) || 0)), 0) || 0) 
                : (esMateriaPrimaB ? ((Number(b.stock) || 0) * (Number(b.costo) || 0)) : 0);
            return orden.direccion === "asc" ? valorA - valorB : valorB - valorA;
      }
    });
  }, [insumos, productosTienda, busqueda, orden]);

  const getBadgeStyle = (tipo: string) => {
    const t = (tipo || "").toLowerCase().trim();
    if (t === 'base' || t === 'final' || t === 'producto final') return "bg-pink-50 text-pink-700 border-pink-200";
    if (t === 'intermedio' || t === 'subreceta') return "bg-purple-50 text-purple-700 border-purple-200";
    if (t === 'materia prima') return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-zinc-100 text-zinc-600 border-zinc-200";
  };

  const mostrarTotalGlobal = useMemo(() => {
      return listaProcesada.some(item => item.tipo === 'Producto Final');
  }, [listaProcesada]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/50 backdrop-blur-sm p-2 rounded-2xl border border-border/40 shadow-sm">
        <div className="flex items-center gap-4 pl-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 uppercase tracking-tight">
                {titulo || "Inventario"}
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full tracking-tighter">
                    {listaProcesada.length} items
                </span>
            </h2>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-background border border-border/50 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all uppercase tracking-tighter" />
          </div>

          <div className="flex p-1 bg-muted/40 rounded-lg border border-border/50">
            <button onClick={() => setVista("lista")} className={`p-1.5 rounded-md ${vista === 'lista' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setVista("grid")} className={`p-1.5 rounded-md ${vista === 'grid' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="py-20 text-center text-muted-foreground animate-pulse text-xs font-bold uppercase tracking-widest">Sincronizando...</div>
      ) : (
        <>
          {vista === "lista" ? (
             <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm animate-in fade-in duration-500">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/20 border-b border-border/50 font-sans">
                            <TableHead onClick={() => handleSort("nombre")} className={cn("font-bold text-[10px] uppercase pl-6 py-4 tracking-widest cursor-pointer hover:bg-muted/50 transition-colors group select-none", orden.campo === "nombre" ? "text-slate-900" : "text-slate-500")}>
                                <div className="flex items-center gap-1.5">Producto<span className={cn("transition-opacity", orden.campo === "nombre" ? "opacity-100 text-blue-500" : "opacity-0 group-hover:opacity-40")}>{orden.campo === "nombre" && orden.direccion === "desc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span></div>
                            </TableHead>
                            <TableHead onClick={() => handleSort("categoria")} className={cn("font-bold text-[10px] uppercase text-center tracking-widest cursor-pointer hover:bg-muted/50 transition-colors group select-none", orden.campo === "categoria" ? "text-slate-900" : "text-slate-500")}>
                                <div className="flex items-center justify-center gap-1.5">Categoría<span className={cn("transition-opacity", orden.campo === "categoria" ? "opacity-100 text-purple-500" : "opacity-0 group-hover:opacity-40")}>{orden.campo === "categoria" && orden.direccion === "desc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span></div>
                            </TableHead>
                            <TableHead onClick={() => handleSort("stock")} className={cn("font-bold text-[10px] uppercase text-right tracking-widest cursor-pointer hover:bg-muted/50 transition-colors group select-none min-w-[200px]", orden.campo === "stock" ? "text-slate-900" : "text-slate-500")}>
                                <div className="flex items-center justify-end gap-1.5"><span className={cn("transition-opacity", orden.campo === "stock" ? "opacity-100 text-emerald-500" : "opacity-0 group-hover:opacity-40")}>{orden.campo === "stock" && orden.direccion === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>Existencias (Detalle)</div>
                            </TableHead>
                            
                            {mostrarTotalGlobal && (
                                <TableHead className="font-bold text-[10px] uppercase text-center tracking-widest text-slate-500">Total Global</TableHead>
                            )}

                            <TableHead onClick={() => handleSort("costo")} className={cn("font-bold text-[10px] uppercase text-right tracking-widest cursor-pointer hover:bg-muted/50 transition-colors group select-none", orden.campo === "costo" ? "text-slate-900" : "text-slate-500")}>
                                <div className="flex items-center justify-end gap-1.5"><span className={cn("transition-opacity", orden.campo === "costo" ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-40")}>{orden.campo === "costo" && orden.direccion === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>Costo/U</div>
                            </TableHead>
                            <TableHead onClick={() => handleSort("total")} className={cn("font-bold text-[10px] uppercase text-right tracking-widest cursor-pointer hover:bg-muted/50 transition-colors group select-none", orden.campo === "total" ? "text-slate-900" : "text-slate-500")}>
                                <div className="flex items-center justify-end gap-1.5"><span className={cn("transition-opacity", orden.campo === "total" ? "opacity-100 text-blue-600" : "opacity-0 group-hover:opacity-40")}>{orden.campo === "total" && orden.direccion === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>Valor Total</div>
                            </TableHead>
                            <TableHead className="font-bold text-[10px] uppercase text-right pr-6 tracking-widest text-slate-500">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {listaProcesada.map(item => {
                            const isPote = item.tipo === 'Producto Final';
                            const isMateriaPrima = (item.tipo || "").trim() === 'Materia Prima';
                            const isBase = item.tipo === 'Base';
                            
                            const currentDest = tiendaFilaLista[item.id] || "fisica";
                            const stocksLista = isPote ? item.stocksDestino[currentDest] : [];

                            let totalUnidades = 0;
                            const crudosMap = new Map<string, number>();

                            if (isPote) {
                                (item.stocksDestino.fisica || []).forEach((t:any) => {
                                    totalUnidades += (Number(t.stock) || 0);
                                    if(Number(t.stock) > 0) crudosMap.set(t.nombre, (crudosMap.get(t.nombre) || 0) + Number(t.stock));
                                });
                                (item.stocksDestino.virtual || []).forEach((t:any) => {
                                    totalUnidades += (Number(t.stock) || 0);
                                    if(Number(t.stock) > 0) crudosMap.set(t.nombre, (crudosMap.get(t.nombre) || 0) + Number(t.stock));
                                });
                            }

                            const tamanosCrudosArray = Array.from(crudosMap.entries()).map(([nombre, cantidad]) => ({nombre, cantidad}));

                            const valorTotal = isPote 
                                ? stocksLista.reduce((acc: number, t: any) => acc + ((Number(t.stock) || 0) * (Number(t.precio) || 0)), 0)
                                : (Number(item.stock) || 0) * (Number(item.costo) || 0);

                            return (
                                <TableRow key={item.id} className="hover:bg-muted/10 group border-b border-border/30 last:border-0 transition-colors">
                                    <TableCell className="pl-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden border border-border/40 shrink-0 flex items-center justify-center shadow-sm">
                                                {item.imagen ? <img src={item.imagen} className="h-full w-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/30" />}
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="font-bold uppercase text-[11px] tracking-tight text-foreground">{item.nombre}</span>
                                              {isPote && (
                                                <div className={cn(
                                                  "flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter mt-0.5",
                                                  currentDest === 'virtual' ? "text-blue-500" : "text-emerald-500"
                                                )}>
                                                  {currentDest === 'virtual' ? <Globe className="w-2 h-2" /> : <Package className="w-2 h-2" />}
                                                  {currentDest === 'virtual' ? 'Vista Virtual' : 'Stock General'}
                                                </div>
                                              )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    
                                    <TableCell className="text-center">
                                        <Badge className={`border-0 text-[9px] font-black uppercase px-2 py-0.5 shadow-none ${getBadgeStyle(item.tipo)}`}>{item.tipo}</Badge>
                                    </TableCell>
                                    
                                    <TableCell className="text-right">
                                        {isPote ? (
                                            <div className="flex justify-end gap-1.5 animate-in fade-in duration-300 flex-wrap">
                                              {(stocksLista || []).map((t: any) => (
                                                <div key={t.id} className={cn(
                                                  "border px-2 py-1 rounded-lg text-[9px] font-black shadow-none flex gap-1 items-center",
                                                  currentDest === 'fisica' ? "bg-emerald-50/30 border-emerald-100/50 text-emerald-700" : "bg-blue-50/30 border-blue-100/50 text-blue-700"
                                                )}>
                                                  <span className="opacity-60 uppercase">{t.nombre}:</span>
                                                  <span className={t.stock > 0 ? "font-black" : "opacity-30"}>{formatExactTwoDecimals(t.stock)}</span>
                                                </div>
                                              ))}
                                              {stocksLista.length === 0 && <span className="text-[9px] font-bold text-muted-foreground/30 uppercase italic">Sin stock</span>}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-sm text-foreground">{formatExactTwoDecimals(item.stock)}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{item.unit || item.unidad || 'kg'}</span>
                                            </div>
                                        )}
                                    </TableCell>

                                    {/* 🔥 BOTÓN DEL MODAL EN VISTA LISTA 🔥 */}
                                    {mostrarTotalGlobal && (
                                        <TableCell className="text-center">
                                            {isPote ? (
                                                 <button 
                                                    onClick={() => setModalDetalle({ isOpen: true, titulo: item.nombre, total: totalUnidades, tamanos: tamanosCrudosArray })}
                                                    className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-transform"
                                                 >
                                                     <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Potes:</span>
                                                     <span className="font-black text-[13px] tabular-nums leading-none">{totalUnidades}</span>
                                                 </button>
                                            ) : (
                                                 <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                                            )}
                                        </TableCell>
                                    )}

                                    <TableCell className="text-right">
                                       {isMateriaPrima ? (
                                           <span className="text-[11px] font-mono font-bold text-slate-500">S/ {formatExactTwoDecimals(item.costo)}</span>
                                       ) : (
                                           <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                                       )}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {isMateriaPrima || isPote ? (
                                            <span className={cn(
                                                "text-[12px] font-mono font-black",
                                                isPote ? "text-blue-600" : "text-emerald-600"
                                            )}>
                                                S/ {formatExactTwoDecimals(valorTotal)}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">—</span>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isPote && (
                                              <div className="flex bg-muted/60 p-0.5 rounded-xl border border-border/40 mr-2 shadow-inner">
                                                <button 
                                                  onClick={() => setTiendaFilaLista(prev => ({...prev, [item.id]: 'fisica'}))}
                                                  className={cn("p-1.5 rounded-lg transition-all", currentDest === 'fisica' ? "bg-white text-emerald-600 shadow-sm" : "text-muted-foreground/40 hover:text-muted-foreground")}
                                                  title="Ver Stock General"
                                                >
                                                  <Package className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                  onClick={() => setTiendaFilaLista(prev => ({...prev, [item.id]: 'virtual'}))}
                                                  className={cn("p-1.5 rounded-lg transition-all", currentDest === 'virtual' ? "bg-white text-blue-600 shadow-sm" : "text-muted-foreground/40 hover:text-muted-foreground")}
                                                  title="Ver Tienda Virtual"
                                                >
                                                  <Globe className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            )}
                                            
                                            {isPote && onDesignar && (
                                               <button onClick={() => onDesignar(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm bg-white border border-blue-100 mr-1" title="Mover Stock a Tienda Virtual">
                                                   <ArrowLeftRight className="w-4 h-4" />
                                               </button>
                                            )}

                                            {isBase && (
                                               <button onClick={() => onTransform(item)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors shadow-sm bg-white border border-amber-100" title="Transformar"><PackagePlus className="w-4 h-4" /></button>
                                            )}
                                            
                                            {!isPote && (
                                              <div className="flex items-center bg-muted/30 rounded-lg border border-border/30 mr-1">
                                                  <button onClick={() => onStockChange(item.id, -1)} className="w-7 h-7 flex items-center justify-center hover:text-red-600 transition-colors"><Minus className="w-3 h-3"/></button>
                                                  <button onClick={() => onStockChange(item.id, 1)} className="w-7 h-7 flex items-center justify-center hover:text-emerald-600 transition-colors"><Plus className="w-3 h-3"/></button>
                                              </div>
                                            )}
                                            <button onClick={() => onEdit(item)} className="p-2 hover:bg-muted rounded-lg transition-colors text-slate-400"><Pencil className="w-4 h-4"/></button>
                                            <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listaProcesada.map((item) => (
                <GridCard 
                  key={item.id} 
                  item={item} 
                  onEdit={onEdit} 
                  onDelete={onDelete} 
                  onTransform={onTransform}
                  onDesignar={onDesignar} 
                  onStockChange={onStockChange}
                  getBadgeStyle={getBadgeStyle}
                  onOpenDetalle={(titulo: string, total: number, tamanos: any) => setModalDetalle({ isOpen: true, titulo, total, tamanos })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ========================================================================================= */}
      {/* 🔥 MODAL (POP-UP) FLOTANTE PROFESIONAL PARA DETALLE DE POTES 🔥 */}
      {/* ========================================================================================= */}
      <AnimatePresence>
        {modalDetalle.isOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalDetalle(prev => ({ ...prev, isOpen: false }))}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-slate-900 px-6 py-5 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10"><Package className="w-28 h-28 text-white" /></div>
                  <div>
                      <h3 className="text-white font-black text-lg uppercase tracking-tight relative z-10 pr-6 leading-tight">{modalDetalle.titulo}</h3>
                      <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-1 relative z-10">Total Físico + Virtual: {modalDetalle.total} uds</p>
                  </div>
                  <button onClick={() => setModalDetalle(prev => ({ ...prev, isOpen: false }))} className="text-slate-400 hover:text-white transition-colors relative z-10 bg-slate-800 p-2 rounded-full border border-slate-700 hover:bg-slate-700">
                      <X className="w-4 h-4" />
                  </button>
              </div>

              <div className="p-6 space-y-3 bg-slate-50">
                  {modalDetalle.tamanos.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest italic">
                          Sin existencias registradas
                      </div>
                  ) : (
                      modalDetalle.tamanos.map((t, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center p-1.5 border border-slate-100">
                                      <img src={getPoteIcon(t.nombre)} alt={t.nombre} className="w-full h-full object-contain drop-shadow-sm" />
                                  </div>
                                  <span className="font-black text-slate-700 text-sm uppercase tracking-tight">{t.nombre}</span>
                              </div>
                              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-black text-lg tabular-nums shadow-sm">
                                  {t.cantidad}
                              </div>
                          </div>
                      ))
                  )}
              </div>

              <div className="p-4 bg-white border-t border-slate-100 text-center">
                  <button 
                      onClick={() => setModalDetalle(prev => ({ ...prev, isOpen: false }))} 
                      className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors w-full py-2"
                  >
                      Cerrar detalle
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function GridCard({ item, onEdit, onDelete, onTransform, onDesignar, onStockChange, getBadgeStyle, onOpenDetalle }: any) {
  const isPote = item.tipo === 'Producto Final';
  const isMateriaPrima = (item.tipo || "").trim() === 'Materia Prima';
  const isBase = item.tipo === 'Base';
  
  const [tabDestino, setTabDestino] = useState<'fisica' | 'virtual'>('fisica');
  const stockAMostrar = isPote ? item.stocksDestino[tabDestino] : [];

  let totalGlobal = 0;
  const crudosMap = new Map<string, number>();

  if (isPote) {
      (item.stocksDestino.fisica || []).forEach((t:any) => {
          totalGlobal += (Number(t.stock) || 0);
          if(Number(t.stock) > 0) crudosMap.set(t.nombre, (crudosMap.get(t.nombre) || 0) + Number(t.stock));
      });
      (item.stocksDestino.virtual || []).forEach((t:any) => {
          totalGlobal += (Number(t.stock) || 0);
          if(Number(t.stock) > 0) crudosMap.set(t.nombre, (crudosMap.get(t.nombre) || 0) + Number(t.stock));
      });
  }

  const tamanosCrudosArray = Array.from(crudosMap.entries()).map(([nombre, cantidad]) => ({nombre, cantidad}));

  const valorTotal = isPote 
      ? stockAMostrar.reduce((acc: number, t: any) => acc + ((Number(t.stock) || 0) * (Number(t.precio) || 0)), 0)
      : (Number(item.stock) || 0) * (Number(item.costo) || 0);

  return (
    // 🔥 Restaurado el "overflow-hidden" en el contenedor padre para que nunca se deforme 🔥
    <div className="group bg-card rounded-2xl border border-border/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full relative">
      
      {/* 🔥 Aspect ratio original intacto para que se vea como en tu primera foto 🔥 */}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden shrink-0">
        {item.imagen ? <img src={item.imagen} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground/20"><IceCream2 className="w-12 h-12" /></div>}
        
        <div className="absolute top-3 left-3 flex gap-2 z-20">
          <Badge className={cn("border-0 shadow-sm text-[9px] font-black px-2 py-1 uppercase", getBadgeStyle(item.tipo))}>{item.tipo}</Badge>
        </div>

        {/* 🔥 BOTÓN DEL MODAL EN VISTA GRID (Z-40 para estar sobre el overlay negro) 🔥 */}
        {isPote && (
            <button 
               onClick={(e) => { e.stopPropagation(); onOpenDetalle(item.nombre, totalGlobal, tamanosCrudosArray); }}
               className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-slate-700/50 hover:scale-105 active:scale-95 transition-transform z-40"
            >
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-300">Potes:</span>
                <span className="font-black text-sm tabular-nums leading-none">{totalGlobal}</span>
            </button>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-30 pointer-events-none group-hover:pointer-events-auto">
           {isPote && onDesignar && (
               <button onClick={() => onDesignar(item)} className="bg-blue-500 text-white h-10 w-10 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all border-2 border-white/20" title="Asignar a Tienda Virtual"><ArrowLeftRight className="w-4 h-4" /></button>
           )}
           <button onClick={() => onEdit(item)} className="bg-white text-slate-900 h-10 w-10 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all"><Pencil className="w-4 h-4" /></button>
           <button onClick={() => onDelete(item.id)} className="bg-red-500 text-white h-10 w-10 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all border-2 border-white/20"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-[13px] leading-tight text-foreground line-clamp-1 uppercase tracking-tight font-sans pr-2">{item.nombre}</h3>
          
          {isMateriaPrima && (
              <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-slate-500 font-mono font-bold text-[10px]">
                    <Tag className="w-3 h-3" /> S/ {formatExactTwoDecimals(item.costo)}
                  </div>
                  <div className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm border border-emerald-100">
                    Total: S/ {formatExactTwoDecimals(valorTotal)}
                  </div>
              </div>
          )}
        </div>

        {isPote ? (
          <div className="mt-auto space-y-3">
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/40">
              <button onClick={() => setTabDestino('fisica')} className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all", tabDestino === 'fisica' ? "bg-white text-emerald-600 shadow-sm" : "text-muted-foreground hover:text-foreground")}><Package className="w-3 h-3" /> Stock</button>
              <button onClick={() => setTabDestino('virtual')} className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all", tabDestino === 'virtual' ? "bg-white text-blue-600 shadow-sm" : "text-muted-foreground hover:text-foreground")}><Globe className="w-3 h-3" /> T. Virtual</button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 animate-in fade-in zoom-in-95 duration-200 min-h-[44px]">
               {stockAMostrar.length > 0 ? stockAMostrar.map((tam: any) => (
                 <div key={tam.id} className="text-center bg-muted/30 py-1.5 rounded-xl border border-border/5 relative">
                   <span className="text-[8px] uppercase font-bold text-muted-foreground block mb-0.5 tracking-tighter">{tam.nombre}</span>
                   <span className={cn("font-black text-xs font-sans", Number(tam.stock) > 0 ? "text-foreground" : "text-muted-foreground/30")}>{formatExactTwoDecimals(tam.stock)}</span>
                 </div>
               )) : <div className="col-span-3 py-2 text-center text-[9px] font-bold text-muted-foreground uppercase opacity-50 italic">Sin stock en esta vista</div>}
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">Valor en Stock ({tabDestino})</span>
                <span className="text-[11px] font-black text-blue-600 font-mono">S/ {formatExactTwoDecimals(valorTotal)}</span>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-4 border-t border-dashed border-border/50 flex items-end justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest block font-sans">Existencia</span>
              <span className="font-black text-foreground text-xl tracking-tighter tabular-nums font-sans">{formatExactTwoDecimals(item.stock)}<span className="text-[10px] ml-1 font-bold text-muted-foreground uppercase">{item.unit || item.unidad || 'kg'}</span></span>
            </div>
            {isBase && <button onClick={() => onTransform(item)} className="h-8 px-3 bg-[#111827] text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md hover:bg-black transition-all active:scale-95"><PackagePlus className="w-3.5 h-3.5" /> Transformar</button>}
          </div>
        )}
      </div>
    </div>
  );
}