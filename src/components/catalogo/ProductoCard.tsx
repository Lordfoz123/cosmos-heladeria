"use client";

import { Edit, Trash2, Link as LinkIcon, Box, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  producto: any;
  onEdit: (prod: any) => void;
  onDelete: (id: string) => void;
};

const IMAGENES_TAMANOS: Record<string, string> = {
    '8oz':  '/icons/pote-8oz.png',
    '16oz': '/icons/pote-16oz.png',
    '32oz': '/icons/pote-32oz.png'
};

const ESCALAS_VISUALES: Record<string, string> = {
    '8oz':  'scale-[0.65]',
    '16oz': 'scale-[0.85]',
    '32oz': 'scale-[1.1]'
};

export function ProductoCard({ producto, onEdit, onDelete }: Props) {
  const tamanos = producto.tamanos || [];
  
  const stockTotal = tamanos.reduce((acc: number, tam: any) => acc + (Number(tam.stock) || 0), 0);

  return (
    <div className="group bg-card rounded-[2rem] border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full font-sans text-foreground isolate z-0 transform-gpu">
      
      <div className="h-56 w-full relative bg-muted shrink-0">
        {producto.imagen ? (
            <img 
                src={producto.imagen} 
                alt={producto.nombre} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50">
                <Box className="w-12 h-12 opacity-20"/>
            </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex justify-between items-end z-10">
            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase backdrop-blur-md border flex items-center gap-1.5 ${producto.activo ? 'bg-white/10 text-white border-white/20' : 'bg-black/60 text-gray-400 border-transparent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${producto.activo ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                {producto.activo ? "Visible" : "Oculto"}
            </div>
            
            <div className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500 text-white shadow-lg flex items-center gap-1 border border-emerald-400">
                <Package className="w-3 h-3"/>
                {stockTotal} <span className="text-[8px] opacity-80">und</span>
            </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col bg-card relative z-10">
        
        <div className="mb-5">
            {/* 🔥 CORRECCIÓN TEXTO PRINCIPAL 🔥 */}
            <h3 className="font-extrabold text-2xl text-foreground tracking-tight leading-tight uppercase mb-1">{producto.nombre}</h3>
            <p className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                {producto.descripcion || "Sin descripción configurada..."}
            </p>
        </div>

        <div className="space-y-3 mb-6">
            {tamanos.length > 0 ? (
                tamanos.map((tam: any) => {
                    const tienePrecio = Number(tam.precio) > 0;
                    const stockIndividual = Number(tam.stock) || 0;

                    return (
                        <div 
                            key={tam.id} 
                            className={cn(
                                "flex justify-between items-center p-3 rounded-[1.25rem] border transition-all",
                                tienePrecio 
                                    ? "bg-background border-border hover:bg-muted/50 hover:shadow-md" 
                                    : "bg-muted/20 border-transparent opacity-40"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                {/* 🔥 CORRECCIÓN FONDO DE IMAGEN 🔥 */}
                                <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-background rounded-xl border border-border shadow-sm">
                                    <img 
                                        src={IMAGENES_TAMANOS[tam.id]} 
                                        alt={tam.nombre}
                                        className={`w-full h-full object-contain ${ESCALAS_VISUALES[tam.id] || 'scale-100'}`}
                                    />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-black text-foreground uppercase tracking-tight">{tam.nombre}</span>
                                    {/* 🔥 CORRECCIÓN TEXTO DE STOCK 🔥 */}
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase", 
                                        stockIndividual > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                                    )}>
                                        Stock: {stockIndividual}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1 pr-1">
                                <span className="text-[9px] font-bold text-muted-foreground tracking-tighter">S/</span>
                                <span className="font-extrabold text-[18px] text-foreground tracking-tighter tabular-nums">
                                    {tienePrecio ? Number(tam.precio).toFixed(2) : '0.00'}
                                </span>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center py-6 bg-muted/20 rounded-2xl border border-dashed border-border text-[11px] text-muted-foreground font-medium italic">
                    Sin formatos configurados
                </div>
            )}
        </div>

        <div className="mt-auto flex justify-between items-center pt-4 border-t border-border">
            {/* 🔥 CORRECCIÓN ETIQUETA LINK 🔥 */}
            <div className="flex items-center gap-1.5 max-w-[60%] text-muted-foreground bg-muted px-3 py-1.5 rounded-xl border border-border" title={producto.insumoNombre}>
                <LinkIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] font-bold text-muted-foreground truncate uppercase tracking-tighter">
                    {producto.insumoNombre || "Ficha no vinculada"}
                </span>
            </div>

            <div className="flex gap-2">
                {/* 🔥 CORRECCIÓN BOTONES ACCIÓN 🔥 */}
                <button 
                    onClick={() => onEdit(producto)}
                    className="p-2.5 bg-background hover:bg-foreground hover:text-background text-muted-foreground rounded-xl transition-all duration-300 active:scale-90 border border-border"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => onDelete(producto.id)}
                    className="p-2.5 bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive rounded-xl transition-all duration-300 active:scale-90 border border-destructive/20"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}