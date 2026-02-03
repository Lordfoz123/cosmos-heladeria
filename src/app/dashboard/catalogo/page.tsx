"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard, { Product } from "@/components/ProductCard";
import AddProductForm from "@/components/AddProductForm";
import StyledModal from "@/components/StyledModal";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, updateDoc, doc, Timestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { PackagePlus, MoreVertical, Eye, Trash2, Boxes, Save } from "lucide-react";

type ProductStatus = "draft" | "published";

type ProductoMeta = Product & {
  inCatalog?: boolean;
  status?: ProductStatus;

  createdAt?: any; // fecha real de creación del producto (inventario)
  updatedAt?: any;

  // ✅ nuevo: fecha cuando se agregó al catálogo (no reemplaza createdAt)
  catalogAddedAt?: any;

  publishedAt?: any;
  publishedBy?: { uid?: string; name?: string } | null;

  stockPorTamano?: Record<string, number>;
  stockTotal?: number;
  stockUpdatedAt?: any;
};

function getStatus(p: ProductoMeta): ProductStatus {
  return (p.status as ProductStatus) ?? "draft";
}

function getTamanos(p: ProductoMeta): string[] {
  const anyP: any = p;
  const recetas = anyP.recetasPorTamano || anyP.recetasPorTamaño || {};
  return Object.keys(recetas);
}

function getStockPorTamano(p: ProductoMeta, tam: string) {
  const m =
    p.stockPorTamano ||
    (p as any).stockPorTamaño || // legacy (si existiera)
    {};
  const v = (m as any)?.[tam];
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getStockTotal(p: ProductoMeta): number {
  const anyP: any = p;

  if (typeof anyP.stockTotal === "number" && Number.isFinite(anyP.stockTotal)) {
    return Number(anyP.stockTotal);
  }

  const map: Record<string, any> | undefined = anyP.stockPorTamano || anyP.stockPorTamaño;

  if (map && typeof map === "object") {
    return Object.values(map).reduce((acc: number, v: any) => {
      const n = Number(v);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  if (typeof anyP.stock === "number" && Number.isFinite(anyP.stock)) return Number(anyP.stock);

  return 0;
}

function validateForPublish(p: ProductoMeta) {
  const missing: string[] = [];
  const anyP: any = p;

  if (!p.nombre || String(p.nombre).trim().length === 0) missing.push("nombre");

  // ✅ primero sin ñ (nuevo estándar), luego legacy con ñ
  const preciosPorTamano =
    (anyP.preciosPorTamano as Record<string, number> | undefined) ??
    (anyP.preciosPorTamaño as Record<string, number> | undefined);

  const precioLegacyOk = anyP.precio != null && Number(anyP.precio) > 0;

  const preciosOk =
    preciosPorTamano &&
    Object.keys(preciosPorTamano).length > 0 &&
    Object.entries(preciosPorTamano).every(([, v]) => Number(v) > 0);

  if (!preciosOk && !precioLegacyOk) missing.push("precios");

  if (!anyP.imagen || String(anyP.imagen).trim().length === 0) missing.push("imagen");

  const recetas = anyP.recetasPorTamano || anyP.recetasPorTamaño || {};
  if (!recetas || Object.keys(recetas).length === 0) missing.push("tamanos/receta");

  const stockTotal = getStockTotal(p);
  if (stockTotal <= 0) missing.push("stock");

  return { ok: missing.length === 0, missing };
}

function StatusStockChips({ producto }: { producto: ProductoMeta }) {
  const status = getStatus(producto);
  const stockTotal = getStockTotal(producto);

  return (
    <div className="flex items-center gap-2">
      {status === "published" ? (
        <span className="px-3 py-1 rounded-full text-xs font-extrabold border bg-emerald-600 text-white border-emerald-700 shadow-sm">
          Publicado
        </span>
      ) : (
        <span className="px-3 py-1 rounded-full text-xs font-extrabold border bg-muted text-foreground border-border shadow-sm">
          Borrador
        </span>
      )}

      {stockTotal > 0 ? (
        <span className="px-3 py-1 rounded-full text-xs font-extrabold border bg-card/90 text-foreground border-border shadow-sm backdrop-blur">
          Stock: {stockTotal}
        </span>
      ) : (
        <span className="px-3 py-1 rounded-full text-xs font-extrabold border bg-destructive text-destructive-foreground border-destructive shadow-sm">
          Agotado
        </span>
      )}
    </div>
  );
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<ProductoMeta[]>([]);

  const [modalOpen, setModalOpen] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ProductoMeta | null>(null);

  const [tab, setTab] = useState<"todos" | "published" | "draft" | "agotados">("todos");

  const [busqueda, setBusqueda] = useState("");
  const [filtroSabor, setFiltroSabor] = useState("");

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const [stockOpen, setStockOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<ProductoMeta | null>(null);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [savingStock, setSavingStock] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "productos"), (snapshot) => {
      setProductos(
        snapshot.docs.map((d) => ({
          ...(d.data() as ProductoMeta),
          id: d.id,
        }))
      );
    });
    return () => unsub();
  }, []);

  // ✅ Cerrar menú al click afuera o con Escape
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuOpenFor) return;
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpenFor(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpenFor(null);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenFor]);

  const saboresDisponibles = useMemo(() => {
    const enCatalogo = productos.filter((p) => !!(p as any).inCatalog);
    return Array.from(new Set(enCatalogo.flatMap((p: any) => p.sabores || [])));
  }, [productos]);

  const agotadosCount = useMemo(() => {
    const base = productos.filter((p) => !!(p as any).inCatalog);
    return base.filter((p) => getStockTotal(p) <= 0).length;
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    return productos
      .filter((p) => !!(p as any).inCatalog)
      .filter((p) => {
        const coincideNombre = (p.nombre ?? "").toLowerCase().includes(q);
        const coincideSabor = !filtroSabor || ((p as any).sabores || []).includes(filtroSabor);

        const s = getStatus(p);
        const stockTotal = getStockTotal(p);

        const coincideTab =
          tab === "todos" ||
          (tab === "published" && s === "published") ||
          (tab === "draft" && s === "draft") ||
          (tab === "agotados" && stockTotal <= 0);

        return coincideNombre && coincideSabor && coincideTab;
      })
      .sort((a, b) => {
        if (tab === "todos") {
          const sa = getStatus(a);
          const sb = getStatus(b);
          if (sa !== sb) return sa === "published" ? -1 : 1;
        }
        return (a.nombre ?? "").localeCompare(b.nombre ?? "");
      });
  }, [productos, busqueda, filtroSabor, tab]);

  async function handleAddProduct(producto: Product) {
    const id = String((producto as any).id ?? "");
    if (!id) {
      toast.error("No se pudo agregar: falta id del producto.");
      return;
    }

    try {
      const ref = doc(db, "productos", id);
      const now = Timestamp.now();

      await updateDoc(ref, {
        inCatalog: true,
        status: "draft",

        // ✅ NO sobrescribir createdAt
        catalogAddedAt: now,

        updatedAt: now,
      });

      toast.success("Producto agregado al catálogo (borrador).");
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo agregar al catálogo.");
    }
  }

  function openPreview(producto: ProductoMeta) {
    setPreviewProduct(producto);
    setPreviewOpen(true);
  }

  function openStock(producto: ProductoMeta) {
    const tamanos = getTamanos(producto);
    if (tamanos.length === 0) {
      toast.error("Este producto no tiene tamaños (recetas vacías).");
      return;
    }

    const draft: Record<string, string> = {};
    for (const t of tamanos) {
      draft[t] = String(getStockPorTamano(producto, t));
    }

    setStockProduct(producto);
    setStockDraft(draft);
    setStockOpen(true);
  }

  async function saveStock() {
    if (!stockProduct) return;

    const tamanos = getTamanos(stockProduct);
    if (tamanos.length === 0) {
      toast.error("Este producto no tiene tamaños.");
      return;
    }

    const next: Record<string, number> = {};
    for (const t of tamanos) {
      const raw = (stockDraft[t] ?? "").trim();
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        toast.error(`Stock inválido en "${t}". Debe ser número ≥ 0.`);
        return;
      }
      next[t] = Math.floor(n);
    }

    const total = Object.values(next).reduce((a, b) => a + b, 0);

    try {
      setSavingStock(true);

      const ref = doc(db, "productos", stockProduct.id as string);
      const now = Timestamp.now();

      // ✅ Normalizamos al nombre "Tamano" (sin ñ) para evitar duplicados
      await updateDoc(ref, {
        stockPorTamano: next,
        stockTotal: total,
        stockUpdatedAt: now,
        updatedAt: now,
      });

      toast.success("Stock actualizado.");
      setStockOpen(false);
      setStockProduct(null);
      setStockDraft({});
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar el stock.");
    } finally {
      setSavingStock(false);
    }
  }

  async function handleTogglePublish(producto: ProductoMeta) {
    if (!(producto as any).inCatalog) {
      toast.error("Este producto aún no está en el catálogo.");
      return;
    }

    const status = getStatus(producto);

    if (status === "draft") {
      const { ok, missing } = validateForPublish(producto);
      if (!ok) {
        toast.error(`No se puede publicar. Falta: ${missing.join(", ")}.`);
        return;
      }
    }

    try {
      const ref = doc(db, "productos", producto.id as string);
      const now = Timestamp.now();

      if (status === "draft") {
        await updateDoc(ref, {
          status: "published",
          publishedAt: now,
          publishedBy: { name: "admin" }, // TODO: reemplazar con Auth real si ya lo tienes
          updatedAt: now,
        });
        toast.success("Publicado en la tienda.");
      } else {
        await updateDoc(ref, {
          status: "draft",
          updatedAt: now,
        });
        toast.success("Quitado de la tienda (borrador).");
      }
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cambiar el estado.");
    }
  }

  async function handleRemoveFromCatalog(id: string) {
    const producto = productos.find((p) => String(p.id) === String(id));
    if (!producto) return;

    if (!window.confirm(`¿Quitar “${producto.nombre}” del catálogo?`)) return;

    try {
      const now = Timestamp.now();

      await updateDoc(doc(db, "productos", String(id)), {
        inCatalog: false,
        status: "draft",
        updatedAt: now,
      });

      toast.success("Quitado del catálogo. El producto sigue en Inventario.");
      setMenuOpenFor(null);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo quitar del catálogo.");
    }
  }

  const tabBase = "px-5 py-2 rounded-full font-bold transition border border-transparent relative";
  const tabActive = "bg-card text-foreground shadow-sm border-border";
  const tabInactive = "text-muted-foreground hover:text-foreground";

  return (
    <main className="flex-1 p-8 bg-background text-foreground min-h-screen">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
        <div>
          <div className="flex gap-2 items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-none">
              Catálogo
            </h2>
            <span className="bg-muted text-foreground border border-border rounded-full px-3 py-0.5 font-semibold text-sm">
              {productosFiltrados.length}
            </span>
          </div>
          <div className="text-muted-foreground text-sm mt-1">
            Aquí agregas productos del inventario al catálogo y publicas/ocultas.
          </div>
        </div>

        <button
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-full shadow-sm transition-all flex items-center gap-2"
          onClick={() => setModalOpen(true)}
          type="button"
        >
          <PackagePlus size={18} /> Agregar producto
        </button>
      </div>

      <div className="inline-flex rounded-full bg-muted p-1 mb-5 border border-border">
        <button
          onClick={() => setTab("todos")}
          className={`${tabBase} ${tab === "todos" ? tabActive : tabInactive}`}
          type="button"
        >
          Todos
        </button>

        <button
          onClick={() => setTab("published")}
          className={`${tabBase} ${tab === "published" ? tabActive : tabInactive}`}
          type="button"
        >
          Publicados
        </button>

        <button
          onClick={() => setTab("draft")}
          className={`${tabBase} ${tab === "draft" ? tabActive : tabInactive}`}
          type="button"
        >
          Borradores
        </button>

        <button
          onClick={() => setTab("agotados")}
          className={`${tabBase} ${tab === "agotados" ? tabActive : tabInactive}`}
          type="button"
        >
          Agotados
          {agotadosCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-extrabold rounded-full bg-destructive text-destructive-foreground">
              {agotadosCount > 99 ? "99+" : agotadosCount}
            </span>
          )}
        </button>
      </div>

      <div className="mb-6 flex flex-row gap-3 flex-wrap">
        <input
          className="flex-1 border border-border px-3 py-2 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition placeholder:text-muted-foreground"
          type="text"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="border border-border px-3 py-2 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
          value={filtroSabor}
          onChange={(e) => setFiltroSabor(e.target.value)}
        >
          <option value="">Todos los sabores</option>
          {saboresDisponibles.map((sabor) => (
            <option key={sabor} value={sabor}>
              {sabor}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {productosFiltrados.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">
            No hay productos para este filtro.
          </div>
        ) : (
          productosFiltrados.map((producto) => {
            const status = getStatus(producto);
            const id = String(producto.id);
            const primaryLabel = status === "published" ? "Ocultar" : "Publicar";

            return (
              <div key={id} className="relative">
                <div className="absolute left-3 top-3 z-10">
                  <StatusStockChips producto={producto} />
                </div>

                <div
                  className="absolute right-3 top-3 z-20"
                  ref={menuOpenFor === id ? menuRef : undefined}
                >
                  <button
                    type="button"
                    onClick={() => setMenuOpenFor((curr) => (curr === id ? null : id))}
                    className="bg-card border border-border text-foreground rounded-full p-2 shadow-sm hover:bg-muted transition"
                    aria-label="Más opciones"
                    title="Más opciones"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {menuOpenFor === id && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-sm font-semibold hover:bg-muted flex items-center gap-2"
                        onClick={() => {
                          setMenuOpenFor(null);
                          openPreview(producto);
                        }}
                      >
                        <Eye size={16} /> Vista previa
                      </button>

                      <button
                        type="button"
                        className="w-full px-3 py-2 text-sm font-semibold hover:bg-muted flex items-center gap-2"
                        onClick={() => {
                          setMenuOpenFor(null);
                          openStock(producto);
                        }}
                      >
                        <Boxes size={16} /> Stock
                      </button>

                      <button
                        type="button"
                        className="w-full px-3 py-2 text-sm font-semibold text-destructive hover:bg-muted flex items-center gap-2"
                        onClick={() => handleRemoveFromCatalog(id)}
                      >
                        <Trash2 size={16} /> Quitar del catálogo
                      </button>
                    </div>
                  )}
                </div>

                <ProductCard
                  producto={producto as any}
                  showStockBadge={false}
                  showPriceDetails={true}
                  showWishlist={false} // ✅ CLAVE: oculta el corazón en Admin/Catálogo
                  secondaryAction={{
                    label: "Vista previa",
                    onClick: () => openPreview(producto),
                  }}
                  primaryAction={{
                    label: primaryLabel,
                    onClick: () => handleTogglePublish(producto),
                    disabled: false,
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      <StyledModal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex flex-col items-center mb-4">
          <div className="bg-muted rounded-lg p-2 flex items-center justify-center mb-2">
            <PackagePlus className="text-primary w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center leading-none">
            Agregar producto al catálogo
          </h2>
          <div className="text-muted-foreground text-sm text-center mt-1">
            Selecciona productos del inventario para agregarlos al catálogo (borrador).
          </div>
        </div>

        <AddProductForm onAdd={handleAddProduct} />
      </StyledModal>

      <StyledModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewProduct(null);
        }}
      >
        <div className="flex flex-col items-center mb-4">
          <div className="bg-muted rounded-lg p-2 flex items-center justify-center mb-2">
            <Eye className="text-primary w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center leading-none">
            Vista previa
          </h2>
          <div className="text-muted-foreground text-sm text-center mt-1">
            Así se vería en la tienda.
          </div>
        </div>

        {previewProduct ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border p-3 bg-card">
              <ProductCard
                producto={previewProduct as any}
                showPriceDetails
                showWishlist={false} // ✅ también oculto en la vista previa de admin
              />
            </div>

            <div className="flex gap-2 justify-center">
              <button
                className="bg-card border border-border text-foreground px-4 py-2 rounded-xl font-bold hover:bg-muted"
                onClick={() => {
                  setPreviewOpen(false);
                  setPreviewProduct(null);
                }}
                type="button"
              >
                Cerrar
              </button>

              <button
                className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold hover:bg-primary/90"
                onClick={() => previewProduct && handleTogglePublish(previewProduct)}
                type="button"
              >
                {getStatus(previewProduct) === "published" ? "Ocultar" : "Publicar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">Sin producto</div>
        )}
      </StyledModal>

      <StyledModal
        open={stockOpen}
        onClose={() => {
          if (savingStock) return;
          setStockOpen(false);
          setStockProduct(null);
          setStockDraft({});
        }}
      >
        <div className="mb-3">
          <h2 className="text-xl font-bold text-foreground leading-none">Stock por tamaño</h2>
          <div className="text-sm text-muted-foreground mt-1">
            {stockProduct?.nombre ?? "Producto"}
          </div>
        </div>

        {stockProduct ? (
          <div className="space-y-3">
            {getTamanos(stockProduct).map((t) => (
              <div key={t} className="flex items-center justify-between gap-3">
                <div className="font-semibold text-foreground">{t}</div>
                <input
                  className="w-32 border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  inputMode="numeric"
                  value={stockDraft[t] ?? ""}
                  onChange={(e) => setStockDraft((prev) => ({ ...prev, [t]: e.target.value }))}
                  placeholder="0"
                />
              </div>
            ))}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl font-bold border border-border bg-card hover:bg-muted transition"
                onClick={() => {
                  if (savingStock) return;
                  setStockOpen(false);
                  setStockProduct(null);
                  setStockDraft({});
                }}
                disabled={savingStock}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="px-4 py-2 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition inline-flex items-center gap-2"
                onClick={saveStock}
                disabled={savingStock}
              >
                <Save className="h-4 w-4" />
                {savingStock ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">Sin producto</div>
        )}
      </StyledModal>
    </main>
  );
}