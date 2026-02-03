"use client";

import React, { useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWishlist } from "@/components/WishlistContext";

// NUEVO tipo para insumos
export type Insumo = {
  nombre: string;
  cantidad: number; // Por cada helado terminado
  costo: number; // Costo por unidad de insumo
  stock: number; // Stock disponible de ese insumo
};

// Extiende Product para incluir insumos/receta
export type Product = {
  id: number | string;
  nombre: string;
  descripcion: string;

  // legacy (compat)
  precio?: number;

  // ✅ precios por tamaño (nuevo)
  preciosPorTamaño?: Record<string, number>;
  // ✅ compat si en algún lado guardaste sin ñ
  preciosPorTamano?: Record<string, number>;

  imagen: string; // URL o base64 dataURL
  sabores: string[];

  /**
   * Stock legado (si algún lugar lo usa).
   * Para stock por tamaño usaremos `stockPorTamaño` + `stockTotal`.
   */
  stock?: number;

  // ✅ Stock por tamaño (nuevo)
  stockPorTamaño?: Record<string, number>;
  // ✅ compat si en algún lado guardaste sin ñ
  stockPorTamano?: Record<string, number>;

  stockTotal?: number;

  // ✅ NUEVO: para el checkout (badge "Oferta")
  oferta?: boolean;

  // legado
  insumos?: Insumo[];

  // usado en tu sistema actual
  recetasPorTamaño?: any;

  // estados
  status?: "draft" | "published";
  inCatalog?: boolean;
};

type ProductCardProps = {
  producto: Product;

  /** Acción principal (en catálogo será Publicar/Ocultar). */
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean };

  /** Acción secundaria (ej. vista previa). */
  secondaryAction?: { label: string; onClick: () => void };

  /**
   * Mostrar badge de stock en la tarjeta.
   * Por defecto: true
   */
  showStockBadge?: boolean;

  /**
   * Mostrar detalle de precios por tamaño dentro de la tarjeta.
   * Por defecto: true
   */
  showPriceDetails?: boolean;

  /**
   * ✅ NUEVO: mostrar botón de wishlist (corazón).
   * En Tienda: true (default)
   * En Admin/Catálogo: pásalo como false
   */
  showWishlist?: boolean;
};

function computeStockTotal(producto: Product) {
  if (typeof producto.stockTotal === "number" && Number.isFinite(producto.stockTotal)) {
    return producto.stockTotal;
  }

  const stockMap =
    (producto.stockPorTamaño && typeof producto.stockPorTamaño === "object" ? producto.stockPorTamaño : null) ??
    (producto.stockPorTamano && typeof producto.stockPorTamano === "object" ? producto.stockPorTamano : null);

  if (stockMap) {
    return Object.values(stockMap).reduce((acc, v) => {
      const n = Number(v);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  if (typeof producto.stock === "number" && Number.isFinite(producto.stock)) {
    return producto.stock;
  }

  return 0;
}

function getPreciosMap(producto: Product): Record<string, number> | null {
  const m =
    (producto.preciosPorTamaño && typeof producto.preciosPorTamaño === "object" ? producto.preciosPorTamaño : null) ??
    (producto.preciosPorTamano && typeof producto.preciosPorTamano === "object" ? producto.preciosPorTamano : null);

  if (!m) return null;
  return m;
}

function formatMoneyPEN(n: number) {
  return `S/ ${Number(n || 0).toFixed(2)}`;
}

export default function ProductCard({
  producto,
  primaryAction,
  secondaryAction,
  showStockBadge = true,
  showPriceDetails = true,
  showWishlist = true,
}: ProductCardProps) {
  const [fallback, setFallback] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const wishlist = useWishlist();

  const inWishlist = wishlist.has(String(producto.id));

  const { costoTotalInsumos, maxFabricable } = useMemo(() => {
    const costoTotalInsumos = producto.insumos
      ? producto.insumos.reduce((acc, insu) => acc + insu.cantidad * insu.costo, 0)
      : 0;

    const maxFabricable =
      producto.insumos && producto.insumos.length > 0
        ? Math.min(
            ...producto.insumos.map((i) => (i.cantidad > 0 ? Math.floor(i.stock / i.cantidad) : Infinity))
          )
        : null;

    return { costoTotalInsumos, maxFabricable };
  }, [producto.insumos]);

  const stockTotal = useMemo(() => computeStockTotal(producto), [producto]);

  const { precioDesde, preciosOrdenados } = useMemo(() => {
    const map = getPreciosMap(producto);

    if (map) {
      const items = Object.entries(map)
        .map(([k, v]) => [k, Number(v)] as const)
        .filter(([, v]) => Number.isFinite(v) && v > 0)
        .sort((a, b) => a[1] - b[1]);

      const min = items.length ? items[0][1] : 0;
      return { precioDesde: min, preciosOrdenados: items };
    }

    const legacy = Number(producto.precio);
    return {
      precioDesde: Number.isFinite(legacy) && legacy > 0 ? legacy : 0,
      preciosOrdenados: [] as Array<readonly [string, number]>,
    };
  }, [producto]);

  return (
    <div className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border/60 overflow-hidden flex flex-col relative">
      {/* ✅ Corazón wishlist (solo si showWishlist = true) */}
      {showWishlist && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!user) {
              router.push(`/login?next=/tienda`);
              return;
            }

            wishlist.toggle({
              id: String(producto.id),
              nombre: producto.nombre,
              imagen: producto.imagen,
            });
          }}
          className={[
            "absolute top-3 right-3 z-20 rounded-full h-10 w-10 grid place-items-center border transition",
            inWishlist
              ? "bg-red-600 text-white border-red-700 hover:bg-red-700"
              : "bg-background/70 backdrop-blur border-border/60 text-muted-foreground hover:bg-muted",
          ].join(" ")}
          aria-label={inWishlist ? "Quitar de wishlist" : "Añadir a wishlist"}
          title={inWishlist ? "Quitar de wishlist" : "Añadir a wishlist"}
        >
          <Heart className={["h-5 w-5", inWishlist ? "fill-white" : ""].join(" ")} />
        </button>
      )}

      {/* ✅ Badge stock */}
      {showStockBadge && (
        <div className="absolute left-3 bottom-[calc(100%-0.75rem)] z-10 translate-y-full">
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
      )}

      {/* imagen */}
      {fallback ? (
        <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center text-muted-foreground text-3xl">
          🖼️
        </div>
      ) : (
        <img
          src={producto.imagen}
          alt={producto.nombre}
          className="aspect-[4/3] w-full object-cover bg-muted"
          loading="lazy"
          onError={() => setFallback(true)}
        />
      )}

      {/* body */}
      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-extrabold text-lg text-foreground leading-tight">{producto.nombre}</h3>

        <p className="text-muted-foreground text-sm line-clamp-2">{producto.descripcion}</p>

        <div className="flex flex-wrap gap-2">
          {producto.sabores?.map((sabor, idx) => (
            <span
              key={idx}
              className="bg-muted text-foreground border border-border/60 px-2 py-0.5 rounded-full text-xs font-semibold"
            >
              {sabor}
            </span>
          ))}
        </div>

        {/* ✅ Precios por tamaño */}
        {showPriceDetails && preciosOrdenados.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {preciosOrdenados.map(([tam, val]) => (
              <span
                key={tam}
                className="bg-muted/60 text-foreground border border-border/60 px-2 py-0.5 rounded-full text-xs font-bold"
                title={`Precio ${tam}`}
              >
                {tam}: {formatMoneyPEN(val)}
              </span>
            ))}
          </div>
        )}

        {/* resumen receta/costeo (si existe) */}
        {producto.insumos && (
          <div className="mt-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">Costo/helado:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ${costoTotalInsumos.toFixed(2)}
              </span>

              <span className="font-medium text-muted-foreground">Máx. fabricable:</span>
              <span className="font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/20">
                {maxFabricable ?? "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="px-4 pb-4 mt-auto">
        <div className="flex items-center justify-between gap-3">
          <span className="font-black text-foreground text-lg">
            {preciosOrdenados.length > 0 ? "Desde " : ""}
            {formatMoneyPEN(precioDesde)}
          </span>

          <div className="flex items-center gap-2">
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="bg-card border border-border text-foreground rounded-xl px-3 py-2 text-xs font-bold shadow-sm hover:bg-muted transition"
              >
                {secondaryAction.label}
              </button>
            )}

            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-4 py-2 text-xs font-extrabold shadow-sm transition disabled:opacity-60"
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}