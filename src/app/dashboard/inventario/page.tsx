"use client";

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/firebaseConfig";
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, 
  doc, Timestamp, writeBatch, getDocs 
} from "firebase/firestore";
import toast from "react-hot-toast";
import { 
  Package, History, Boxes, IceCream2, Refrigerator, Plus, FlaskConical, 
  AlertTriangle, Layers, TrendingUp, Download 
} from "lucide-react";
import * as XLSX from "xlsx"; 

import InventarioLista from "@/components/inventario/InventarioLista";
import InventarioKardex from "@/components/inventario/InventarioKardex";
import WizardInsumoModal from "@/components/inventario/WizardInsumoModal";
import ModalTransformar from "@/components/inventario/ModalTransformar"; 
import { ModalProducto } from "@/components/catalogo/ModalProducto"; 
import ModalDesignar from "@/components/inventario/ModalDesignar";

// Importamos el tipo, pero usaremos un bypass donde sea necesario
import { Insumo } from "@/types/inventario";

export default function InventarioPage() {
  // ✨ TRUCO APLICADO AQUÍ: Usamos any[] para que TS no bloquee las propiedades extra
  const [insumos, setInsumos] = useState<any[]>([]);
  const [productosTienda, setProductosTienda] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false); 
  const [modalProductoOpen, setModalProductoOpen] = useState(false); 
  
  const [editData, setEditData] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [transformOpen, setTransformOpen] = useState(false);
  const [baseSeleccionada, setBaseSeleccionada] = useState<any | null>(null);

  const [designarOpen, setDesignarOpen] = useState(false);
  const [productoParaDesignar, setProductoParaDesignar] = useState<any | null>(null);

  useEffect(() => {
    const unsubInsumos = onSnapshot(collection(db, "insumos"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInsumos(data || []);
    });

    const unsubTienda = onSnapshot(collection(db, "productos_tienda"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductosTienda(data || []);
      setLoading(false);
    });

    return () => { unsubInsumos(); unsubTienda(); };
  }, []);

  // ✨ TRUCO APLICADO AQUÍ: items como any[] para poder leer tamanos, stocksDestino, etc.
  const prepararDatos = (items: any[]) => {
    return items.map((item: any) => {
      let totalGlobal = 0;
      let detalleFisicoTexto = "";
      let detalleVirtualTexto = "";
      let totalValue = 0;

     if (item.tipo === "Producto Final") {
          const stockFisico = item.stocksDestino?.fisica || [];
          const stockVirtual = item.stocksDestino?.virtual || [];

          stockFisico.forEach((t: any) => {
              const cant = Number(t.stock) || 0;
              totalGlobal += cant;
              totalValue += cant * (Number(t.precio) || 0);
              if (cant > 0) detalleFisicoTexto += `[${t.nombre}: ${cant}] `;
          });

          stockVirtual.forEach((t: any) => {
              const cant = Number(t.stock) || 0;
              totalGlobal += cant;
              totalValue += cant * (Number(t.precio) || 0);
              if (cant > 0) detalleVirtualTexto += `[${t.nombre}: ${cant}] `;
          });

          if (totalGlobal === 0 && item.tamanos && !item.stocksDestino) {
              item.tamanos.forEach((t: any) => {
                  const cant = Number(t.stock) || 0;
                  totalGlobal += cant;
                  totalValue += cant * (Number(t.precio) || 0);
                  if (cant > 0) detalleFisicoTexto += `[${t.nombre}: ${cant}] `;
              });
          }
      } else {
          totalGlobal = Number(item.stock || 0);
          totalValue = totalGlobal * Number(item.costo || 0);
      }

      return {
        "ITEM / PRODUCTO": String(item.nombre || "").toUpperCase(),
        "CATEGORÍA": String(item.tipo || "").toUpperCase(),
        "STOCK TOTAL": Number(totalGlobal.toFixed(2)),
        "DETALLE (ALMACÉN FÍSICO)": detalleFisicoTexto.trim() || "-",
        "DETALLE (TIENDA VIRTUAL)": detalleVirtualTexto.trim() || "-",
        "U.M.": String(item.unidad || (item.tipo === "Producto Final" ? "uds" : "Kg")).toUpperCase(),
        "COSTO REF.": item.tipo === "Producto Final" ? "-" : Number(Number(item.costo || 0).toFixed(2)),
        "VALOR TOTAL (S/)": Number(totalValue.toFixed(2)),
        "ACTUALIZADO": item.updatedAt ? new Date(item.updatedAt.seconds * 1000).toLocaleString() : "N/A"
      };
    });
  };

  const exportarExcel = () => {
    if (insumos.length === 0) return toast.error("No hay datos para exportar");
    try {
        const workbook = XLSX.utils.book_new();
        const categorias = [
          { name: "INSUMOS", filter: "Materia Prima" },
          { name: "PREPARADOS", filter: "Intermedio" },
          { name: "BASES", filter: "Base" },
          { name: "POTES_FINAL", filter: "Producto Final" }
        ];

        const fechaGeneracion = new Date().toLocaleString();

        categorias.forEach(cat => {
          const filtrados = insumos.filter(i => i.tipo === cat.filter);
          if (filtrados.length > 0) {
            
            const worksheet = XLSX.utils.aoa_to_sheet([
                [`📊 COSMOS - REPORTE DE INVENTARIO: ${cat.name}`],
                [`📅 Generado el: ${fechaGeneracion}`],
                [`📝 Este documento recalcula el "Valor Total" si modificas manualmente la columna de Stock.`],
                [] 
            ]);

            worksheet["!merges"] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, 
                { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, 
                { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }  
            ];

            const dataPreparada = prepararDatos(filtrados);
            XLSX.utils.sheet_add_json(worksheet, dataPreparada, { origin: "A5" });

            if (cat.filter !== "Producto Final") {
                for (let i = 0; i < dataPreparada.length; i++) {
                    const excelRow = i + 6; 
                    const rowIndex = i + 5; 
                    
                    const cellRef = XLSX.utils.encode_cell({ c: 7, r: rowIndex }); 

                    if (worksheet[cellRef]) {
                        worksheet[cellRef].f = `C${excelRow}*G${excelRow}`;
                    }
                }
            }

            worksheet["!cols"] = [ { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 20 } ];
            
            XLSX.utils.book_append_sheet(workbook, worksheet, cat.name);
          }
        });

        const fechaStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Inventario_Cosmos_${fechaStr}.xlsx`);
        toast.success("Excel generado (Formato Reporte + Fórmulas)");
    } catch (error) { toast.error("Error al exportar"); console.error(error); }
  };

  const materiasPrimas = useMemo(() => insumos.filter((i: any) => (i.tipo || "").trim() === 'Materia Prima'), [insumos]);
  const intermedios = useMemo(() => insumos.filter((i: any) => (i.tipo || "").trim() === 'Intermedio'), [insumos]);
  const basesGranel = useMemo(() => insumos.filter((i: any) => (i.tipo || "").trim() === 'Base'), [insumos]);
  const productosFinales = useMemo(() => insumos.filter((i: any) => (i.tipo || "").trim().toLowerCase() === 'producto final'), [insumos]);
  
  const productosInventarioVinculados = useMemo(() => {
    if (!baseSeleccionada) return [];
    return productosFinales.filter((p: any) => p.baseVinculadaId === baseSeleccionada.id);
  }, [productosFinales, baseSeleccionada]);

  const porClasificarYAlertas = useMemo(() => {
    const _porClasificar = insumos.filter((i: any) => {
        const t = (i.tipo || "").toLowerCase().trim();
        const conocidos = ['materia prima', 'intermedio', 'base', 'producto final'];
        return !conocidos.includes(t);
    });

    const _alertasBajoStock = materiasPrimas.filter((i: any) => {
        const umbral = i.umbralAlerta !== undefined ? Number(i.umbralAlerta) : 5;
        return Number(i.stock) <= umbral;
    });

    return { 
        porClasificar: _porClasificar, 
        alertasStock: _alertasBajoStock 
    };
  }, [insumos, materiasPrimas]);

  const handleOpenTransform = (base: any) => {
    setBaseSeleccionada(base);
    setTransformOpen(true);
  };

  const handleOpenDesignar = (producto: any) => {
    setProductoParaDesignar(producto);
    setDesignarOpen(true);
  };

  const handleSave = async (formData: any) => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        stock: Number(formData.stock || 0), 
        costo: Number(formData.costo || 0),
        updatedAt: Timestamp.now(),
      };

      if (editData?.id) {
        await updateDoc(doc(db, "insumos", editData.id), payload);
        toast.success("Item actualizado");
      } else {
           await addDoc(collection(db, "insumos"), { ...payload, createdAt: Timestamp.now() });
           toast.success("Registrado");
      }
      setModalOpen(false);
    } catch (error) { toast.error("Error"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const itemTarget = insumos.find((i: any) => i.id === id);
    if (!itemTarget) return;

    let mensajeAlerta = `¿Seguro que deseas eliminar "${itemTarget.nombre}" del inventario?`;
    
    if (itemTarget.tipo === "Producto Final" && itemTarget.catalogoId) {
        mensajeAlerta = `⚠️ ATENCIÓN:\n\nVas a eliminar "${itemTarget.nombre}".\nAl ser un Pote Final, esta acción también lo borrará permanentemente del CATÁLOGO ONLINE.\n\n¿Estás completamente seguro?`;
    }

    if (!confirm(mensajeAlerta)) return;

    try {
      await deleteDoc(doc(db, "insumos", id));
      if (itemTarget.catalogoId) {
          await deleteDoc(doc(db, "productos_tienda", itemTarget.catalogoId));
          toast.success("Eliminado del inventario y de la tienda online");
      } else {
          toast.success("Insumo eliminado del inventario");
      }
    } catch (e) { toast.error("Error al eliminar"); console.error(e); }
  };

  const handleStockChange = async (id: string, delta: number) => {
    const item = insumos.find((i: any) => i.id === id);
    if (!item) return;
    try { await updateDoc(doc(db, "insumos", id), { stock: Math.max(0, Number(item.stock) + delta) }); } catch (error) { toast.error("Error"); }
  };

  const handleEditClick = (item: any) => {
      setEditData(item);
      const tipoNormalizado = (item.tipo || "").trim().toLowerCase();
      if (tipoNormalizado === "producto final") {
          setModalProductoOpen(true);
      } else {
          setModalOpen(true);
      }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 animate-in fade-in duration-700 font-sans">
      
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/40 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <Boxes className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">Control de Existencias</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Inventario General
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl font-medium">
              Gestiona tu stock de materias primas, mezclas y productos terminados.
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
             {porClasificarYAlertas.porClasificar.length > 0 && (
                <button className="h-11 px-5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-amber-500/20 transition-all tracking-tight">
                  <AlertTriangle className="w-4 h-4" /> Normalizar ({porClasificarYAlertas.porClasificar.length})
                </button>
             )}
            
            <button 
              onClick={exportarExcel}
              className="h-11 px-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-emerald-500/20 transition-all tracking-tight shadow-sm"
            >
              <Download className="w-4 h-4" /> Exportar Excel
            </button>

            <button 
                onClick={() => { setEditData(null); setModalOpen(true); }} 
                className="h-11 px-8 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-[1.02] transition-all tracking-tight"
            >
                <Plus className="w-4 h-4" /> Nuevo Item
            </button>
          </div>
        </div>

        <Tabs defaultValue="todo" className="w-full">
          <div className="flex flex-col xl:flex-row items-center justify-between mb-8 gap-4 bg-card/50 backdrop-blur-sm p-2 rounded-2xl border border-border/40 shadow-sm">
            <TabsList className="bg-muted/40 p-1 rounded-xl h-auto flex flex-wrap gap-1 border-none">
              {[
                { val: "todo", lab: "Todo", ico: Layers },
                { val: "insumos", lab: "Insumos", ico: Package },
                { val: "intermedios", lab: "Preparados", ico: FlaskConical },
                { val: "bases", lab: "Bases (Kg)", ico: Refrigerator },
                { val: "productos", lab: "Potes", ico: IceCream2 },
                { val: "kardex", lab: "Historial", ico: History },
              ].map(tab => (
                <TabsTrigger 
                  key={tab.val} 
                  value={tab.val} 
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-6 py-2.5 gap-2 text-sm font-medium transition-all tracking-tight"
                >
                   <tab.ico className="w-4 h-4" /> {tab.lab}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="hidden xl:flex items-center gap-4 pr-4">
               {porClasificarYAlertas.alertasStock.length > 0 ? (
                   <>
                       <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                       <span className="text-[11px] font-bold uppercase text-amber-600 tracking-tight">Estado Almacén: <b className="font-black">Riesgo ({porClasificarYAlertas.alertasStock.length} items bajos)</b></span>
                   </>
               ) : (
                   <>
                       <TrendingUp className="w-4 h-4 text-emerald-500" />
                       <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-tight">Estado Almacén: <b className="text-foreground">Óptimo</b></span>
                   </>
               )}
            </div>
          </div>

          <div className="min-h-[500px]">
              <TabsContent value="todo" className="mt-0 outline-none">
                <InventarioLista insumos={insumos} productosTienda={productosTienda} cargando={loading} onEdit={handleEditClick} onDelete={handleDelete} onStockChange={handleStockChange} onTransform={handleOpenTransform} onDesignar={handleOpenDesignar} />
              </TabsContent>
              <TabsContent value="insumos" className="mt-0 outline-none">
                <InventarioLista insumos={materiasPrimas} productosTienda={productosTienda} cargando={loading} titulo="Materias Primas" onEdit={handleEditClick} onDelete={handleDelete} onStockChange={handleStockChange} onTransform={handleOpenTransform} />
              </TabsContent>
              <TabsContent value="intermedios" className="mt-0 outline-none">
                <InventarioLista insumos={intermedios} productosTienda={productosTienda} cargando={loading} titulo="Insumos Preparados" onEdit={handleEditClick} onDelete={handleDelete} onStockChange={handleStockChange} onTransform={handleOpenTransform} />
              </TabsContent>
              <TabsContent value="bases" className="mt-0 outline-none">
                <InventarioLista insumos={basesGranel} productosTienda={productosTienda} cargando={loading} titulo="Bases de Helado" subtitulo="Stock en Kilogramos" onEdit={handleEditClick} onDelete={handleDelete} onStockChange={handleStockChange} onTransform={handleOpenTransform} />
              </TabsContent>
              <TabsContent value="productos" className="mt-0 outline-none">
                <InventarioLista insumos={productosFinales} productosTienda={productosTienda} cargando={loading} titulo="Potes de Tienda" subtitulo="Catálogo Maestro" onEdit={handleEditClick} onDelete={handleDelete} onStockChange={handleStockChange} onTransform={handleOpenTransform} onDesignar={handleOpenDesignar} />
              </TabsContent>
              <TabsContent value="kardex" className="mt-0 outline-none">
                <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm"><InventarioKardex /></div>
              </TabsContent>
          </div>
        </Tabs>
      </div>

      <WizardInsumoModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        editId={editData?.id || null} 
        initial={editData} 
        onSave={handleSave} 
        saving={saving} 
        insumos={insumos} 
      />

      <ModalProducto 
        open={modalProductoOpen} 
        onClose={() => { setModalProductoOpen(false); setEditData(null); }}
        initial={editData}
        onSuccess={() => {
            setModalProductoOpen(false);
            setEditData(null);
        }}
      />
      
      <ModalTransformar 
        open={transformOpen} 
        onClose={() => setTransformOpen(false)} 
        baseItem={baseSeleccionada} 
        productosCatalogo={productosInventarioVinculados} 
      />

      <ModalDesignar 
        open={designarOpen} 
        onClose={() => setDesignarOpen(false)} 
        producto={productoParaDesignar}
      />
    </div>
  );
}