"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";

type ProductoDoc = {
  id: string;
  nombre: string;
  precio: number;
  imagen?: string;
  recetasPorTamaño?: any;

  inCatalog?: boolean;
  status?: "draft" | "published";
};

type Props = {
  producto?: any | null; // compat
  onAdd?: (producto: any) => void; // compat
};

function money(n: number) {
  return Number(n || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function canAddToCatalog(p: ProductoDoc) {
  const missing: string[] = [];
  if (!p.nombre || p.nombre.trim().length === 0) missing.push("nombre");
  if (!p.imagen || String(p.imagen).trim().length === 0) missing.push("imagen");
  if (!p.precio || Number(p.precio) <= 0) missing.push("precio");
  if (!p.recetasPorTamaño || Object.keys(p.recetasPorTamaño).length === 0)
    missing.push("receta");
  return { ok: missing.length === 0, missing };
}

function ProductoRowCard({
  p,
  selected,
  onToggle,
  onAddToCatalog,
}: {
  p: ProductoDoc;
  selected: boolean;
  onToggle: () => void;
  onAddToCatalog: () => void;
}) {
  const check = canAddToCatalog(p);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggle();
      }}
      className={[
        "w-full text-left rounded-2xl border overflow-hidden transition cursor-pointer",
        "bg-card text-card-foreground border-border/60 shadow-sm hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        selected ? "ring-2 ring-ring/35 border-ring/30" : "",
      ].join(" ")}
      title="Seleccionar"
    >
      <div className="flex gap-3 p-3">
        {/* Imagen 4:3 izquierda */}
        <div className="w-28 sm:w-32 shrink-0">
          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border/60">
            {p.imagen ? (
              <img
                src={p.imagen}
                alt={p.nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                Sin imagen
              </div>
            )}
          </div>
        </div>

        {/* Texto derecha */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-extrabold text-foreground truncate">
                {p.nombre}
              </div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                S/ {money(p.precio)}
              </div>
            </div>

            <span
              className={[
                "shrink-0 px-2 py-1 rounded-full text-[11px] font-extrabold border shadow-sm",
                p.inCatalog
                  ? "bg-primary text-primary-foreground border-primary/30"
                  : "bg-muted text-foreground border-border/60",
              ].join(" ")}
            >
              {p.inCatalog ? "En catálogo" : "Registrado"}
            </span>
          </div>

          {!check.ok && (
            <div className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
              Incompleto: {check.missing.join(", ")}
            </div>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();

                if (p.inCatalog) return;

                if (!check.ok) {
                  toast.error(
                    `No se puede agregar. Falta: ${check.missing.join(", ")}.`
                  );
                  return;
                }

                onAddToCatalog();
              }}
              disabled={p.inCatalog || !check.ok}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-2 rounded-xl text-xs transition disabled:opacity-60"
              title={
                p.inCatalog
                  ? "Ya está en catálogo"
                  : !check.ok
                    ? `Falta: ${check.missing.join(", ")}`
                    : "Agregar al catálogo"
              }
            >
              {p.inCatalog ? "Ya en catálogo" : "Agregar al catálogo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddProductForm(_props: Props) {
  const [productos, setProductos] = useState<ProductoDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "productos"), (snap) => {
      setProductos(
        snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            nombre: data.nombre ?? "—",
            precio: Number(data.precio) || 0,
            imagen: data.imagen,
            recetasPorTamaño: data.recetasPorTamaño,
            inCatalog: !!data.inCatalog,
            status: (data.status ?? "draft") as "draft" | "published",
          } as ProductoDoc;
        })
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();

    return productos
      .filter((p) => !p.inCatalog)
      .filter((p) => (q ? p.nombre.toLowerCase().includes(q) : true))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [productos, search]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  function toggleSelect(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function clearSelection() {
    setSelected({});
  }

  async function setInCatalog(id: string, inCatalog: boolean) {
    try {
      const now = Timestamp.now();
      await updateDoc(doc(db, "productos", id), {
        inCatalog,
        status: inCatalog ? "draft" : "draft",
        updatedAt: now,
      });
      toast.success(
        inCatalog ? "Agregado al catálogo (borrador)." : "Quitado del catálogo."
      );
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar el catálogo.");
    }
  }

  async function bulkAddToCatalog(ids: string[]) {
    if (ids.length === 0) {
      toast.error("Selecciona uno o más productos.");
      return;
    }

    const invalid = ids
      .map((id) => productos.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({ p: p!, check: canAddToCatalog(p!) }))
      .filter((x) => !x.check.ok);

    if (invalid.length > 0) {
      toast.error(
        `No se puede agregar: ${invalid[0].p.nombre}. Falta: ${invalid[0].check.missing.join(
          ", "
        )}.`
      );
      return;
    }

    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();

      ids.forEach((id) => {
        batch.update(doc(db, "productos", id), {
          inCatalog: true,
          status: "draft",
          updatedAt: now,
        });
      });

      await batch.commit();
      toast.success("Agregado(s) al catálogo (borrador).");
      clearSelection();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo agregar al catálogo.");
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full md:flex-1 border border-border bg-background text-foreground px-4 py-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring transition placeholder:text-muted-foreground"
        />

        <button
          type="button"
          onClick={() => bulkAddToCatalog(selectedIds)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold px-4 py-2 rounded-2xl shadow-sm transition disabled:opacity-60"
          disabled={selectedIds.length === 0}
          title={selectedIds.length === 0 ? "Selecciona productos" : "Agregar seleccionados al catálogo"}
        >
          Agregar ({selectedIds.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-10">
          Cargando productos...
        </div>
      ) : list.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No hay productos disponibles para agregar (o ya están todos en el catálogo).
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((p) => (
            <ProductoRowCard
              key={p.id}
              p={p}
              selected={!!selected[p.id]}
              onToggle={() => toggleSelect(p.id)}
              onAddToCatalog={() => setInCatalog(p.id, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}