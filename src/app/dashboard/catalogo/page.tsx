"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Store } from "lucide-react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

// 🔥 Solo importamos el modal de edición comercial
import ModalEditarCatalogo from "@/components/catalogo/ModalEditarCatalogo"; 
import { ProductoCard } from "@/components/catalogo/ProductoCard"; 
import toast from "react-hot-toast";

export default function CatalogoPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Solo necesitamos el estado para editar
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "productos_tienda"), (snap) => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubInsumos = onSnapshot(collection(db, "insumos"), (snap) => {
      setInsumos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
        unsubProd();
        unsubInsumos();
    };
  }, []);

  const productosSincronizados = useMemo(() => {
    return productos.map(p => {
      const stockData = insumos.find(i => 
        i.tipo === "Producto Final" && 
        i.nombre?.toLowerCase().trim() === p.nombre?.toLowerCase().trim() &&
        i.ultimoDestino === "virtual" 
      );

      return {
        ...p,
        tamanos: p.tamanos?.map((tCat: any) => {
          const tInv = stockData?.tamanos?.find((ti: any) => ti.id === tCat.id);
          return { 
            ...tCat, 
            stock: tInv?.stock || 0 
          };
        }) || []
      };
    });
  }, [productos, insumos]);

  const filtered = productosSincronizados.filter(p => 
    (p.nombre || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Borrar este producto del catálogo?")) return;
    try {
      await deleteDoc(doc(db, "productos_tienda", id));
      toast.success("Producto eliminado");
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 font-sans transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          {/* 🔥 CORRECCIÓN DEL TÍTULO ADAPTABLE AL MODO OSCURO 🔥 */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">E-Commerce</span>
          </div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Catálogo de Venta</h1>
          <p className="text-lg text-muted-foreground mt-1 max-w-2xl font-medium">
            Gestiona los precios, descripciones y visibilidad de los productos en tu tienda virtual.
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto items-center">
            {/* 🔥 BUSCADOR MEJORADO PARA MODO OSCURO 🔥 */}
            <div className="relative flex-1 md:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                <input 
                    placeholder="Buscar producto..." 
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border hover:border-border/80 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm text-foreground"
                />
            </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => <div key={i} className="h-96 bg-muted/40 rounded-[2rem] animate-pulse border border-border/50" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filtered.map((item) => (
                <ProductoCard 
                    key={item.id}
                    producto={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            ))}
            
            {filtered.length === 0 && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-60">
                    <div className="bg-muted p-5 rounded-full mb-4">
                        <Store className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">No hay productos visibles</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Crea nuevos potes desde la sección de Inventario.</p>
                </div>
            )}
        </div>
      )}

      {/* MODAL: Exclusivo para editar la info comercial del Catálogo */}
      <ModalEditarCatalogo
        open={editModalOpen}
        onClose={() => {
            setEditModalOpen(false);
            setEditingProduct(null);
        }}
        producto={editingProduct}
      />
    </div>
  );
}