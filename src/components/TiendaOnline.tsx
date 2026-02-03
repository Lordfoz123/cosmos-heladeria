"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Producto } from "@/types/inventario";
import { useCarrito } from "@/components/CarritoContext";
import CartSlider from "@/components/CartSlider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Heart } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

import HeaderCosmos from "@/components/HeaderCosmos";

const TAMAÑOS = [
  { key: "8oz", label: "8 oz", litros: 0.237 },
  { key: "16oz", label: "16 oz", litros: 0.473 },
  { key: "32oz", label: "32 oz", litros: 0.946 },
];

const SABORES = ["Todos", "Vainilla", "Chocolate", "Fresa", "Plátano"];

type WishlistItem = {
  id: string;
  nombre: string;
  imagen?: string;
};

function getProductImage(prod: Producto) {
  return prod.imagen || "";
}

function getPrecioPorTamano(prod: any, tam: string): number {
  const map = prod.preciosPorTamaño ?? prod.preciosPorTamano;
  const v = map?.[tam];
  if (Number.isFinite(Number(v)) && Number(v) > 0) return Number(v);

  const legacy = prod.precio;
  if (Number.isFinite(Number(legacy)) && Number(legacy) > 0) return Number(legacy);

  return 0;
}

function formatPEN(amount: number) {
  const n = Number(amount || 0);
  return `S/ ${n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStockTotal(prod: any): number {
  if (Number.isFinite(Number(prod.stockTotal))) return Number(prod.stockTotal);

  const map = prod.stockPorTamano ?? prod.stockPorTamaño ?? prod.stockPorTamano;
  if (map && typeof map === "object") {
    return Object.values(map).reduce((acc: number, v: any) => {
      const n = Number(v);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  return 0;
}

function JarIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 10a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 10h12l-1 10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function sizeForTamKey(key: string) {
  if (key === "8oz") return 16;
  if (key === "16oz") return 20;
  return 24;
}

export default function TiendaOnline() {
  const router = useRouter();
  const { user } = useAuth();

  // ✅ Wishlist data (temporal localStorage)
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  const [productos, setProductos] = useState<(Producto & { status?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const [saborActivo, setSabor] = useState<string>("Todos");
  const [soloOferta, setSoloOferta] = useState(false);
  const [soloMasVendidos, setSoloMasVendidos] = useState(false);

  const { carrito, addToCart, updateCantidad, removeFromCart, showCart, setShowCart, total, finalizarCompra } =
    useCarrito();

  // cargar wishlist por usuario
  useEffect(() => {
    if (!user) {
      setWishlist([]);
      return;
    }
    try {
      const key = `wishlist:${user.uid}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as WishlistItem[]) : [];
      setWishlist(Array.isArray(parsed) ? parsed : []);
    } catch {
      setWishlist([]);
    }
  }, [user?.uid]);

  function persistWishlist(next: WishlistItem[]) {
    if (!user) return;
    setWishlist(next);
    try {
      localStorage.setItem(`wishlist:${user.uid}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function isInWishlist(productId: string) {
    return wishlist.some((w) => w.id === productId);
  }

  function toggleWishlist(item: WishlistItem) {
    if (!user) {
      router.push(`/login?next=/tienda`);
      return;
    }

    const exists = wishlist.some((w) => w.id === item.id);
    if (exists) {
      persistWishlist(wishlist.filter((w) => w.id !== item.id));
    } else {
      persistWishlist([item, ...wishlist]);
    }
  }

  useEffect(() => {
    async function fetchProductos() {
      setLoading(true);
      const q = query(collection(db, "productos"), where("status", "==", "published"));
      const docs = await getDocs(q);
      setProductos(docs.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
    }
    fetchProductos();
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter((prod: any) => {
      if (saborActivo !== "Todos" && !(prod.sabores ?? []).includes(saborActivo)) return false;
      if (soloOferta && !prod.oferta) return false;
      if (soloMasVendidos && !prod.masVendido) return false;
      return true;
    });
  }, [productos, saborActivo, soloOferta, soloMasVendidos]);

  const pillBase =
    "px-4 py-1.5 rounded-full border text-sm font-semibold transition " +
    "focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <section className="w-full bg-background text-foreground min-h-[70vh] py-4 px-0 max-w-[1400px] mx-auto">
      {/* ✅ Header EXACTAMENTE igual (extraído a componente) */}
      <HeaderCosmos logoHref="/tienda" showWishlist showCart />

      {/* HERO */}
      <div className="px-4 mt-4 mb-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 shadow-sm">
          <div className="relative w-full h-[260px] sm:h-[340px] md:h-[440px] lg:h-[520px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-tienda.webp"
              alt="Cosmos - Hero"
              className="absolute inset-0 w-full h-full object-cover object-[70%_35%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/18 to-black/0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.08),transparent_55%)]" />
          </div>

          <div className="absolute inset-0 flex items-center">
            <div className="p-6 md:p-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/90 text-xs font-semibold mb-3 backdrop-blur">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 border border-white/15">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="icon icon-tabler icons-tabler-outline icon-tabler-sparkles"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6" />
                  </svg>
                </span>
                Infinitas Posibilidades
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Tienda Cosmos
              </h1>

              <p className="mt-3 text-white/85 text-sm sm:text-base md:text-lg">
                Elige tu sabor, selecciona el tamaño y agrégalo al carrito.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-5 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold mr-1 text-muted-foreground">Sabores:</span>
          {SABORES.map((sabor) => (
            <button
              key={sabor}
              onClick={() => setSabor(sabor)}
              className={[
                pillBase,
                saborActivo === sabor
                  ? "bg-primary text-primary-foreground border-primary/30 shadow-sm"
                  : "bg-card text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground",
              ].join(" ")}
              type="button"
            >
              {sabor}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSoloOferta((v) => !v)}
            className={[
              pillBase,
              soloOferta
                ? "bg-emerald-600 text-white border-emerald-700"
                : "bg-card text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-muted",
            ].join(" ")}
            type="button"
          >
            Ofertas
          </button>

          <button
            onClick={() => setSoloMasVendidos((v) => !v)}
            className={[
              pillBase,
              soloMasVendidos
                ? "bg-amber-500 text-black border-amber-600"
                : "bg-card text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-muted",
            ].join(" ")}
            type="button"
          >
            Más vendidos
          </button>
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-4 justify-center">
        {loading && (
          <div className="col-span-full text-center py-12 text-primary text-xl font-semibold animate-pulse">
            Cargando productos...
          </div>
        )}

        {!loading && productosFiltrados.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground text-xl font-semibold">
            No hay productos publicados en la tienda.
          </div>
        )}

        {!loading &&
          productosFiltrados.map((prod: any) => (
            <Link key={prod.id} href={`/producto/${prod.id}`} className="block group">
              <ProductoCard
                prod={prod}
                addToCart={addToCart}
                tamañosDisponibles={TAMAÑOS}
                wishlistActive={isInWishlist(String(prod.id))}
                onToggleWishlist={() =>
                  toggleWishlist({
                    id: String(prod.id),
                    nombre: prod.nombre,
                    imagen: prod.imagen,
                  })
                }
              />
            </Link>
          ))}
      </div>

      <CartSlider
        show={showCart}
        cart={carrito}
        onClose={() => setShowCart(false)}
        updateCantidad={updateCantidad}
        removeFromCart={removeFromCart}
        total={total}
        finalizarCompra={finalizarCompra}
      />
    </section>
  );
}

// ⚠️ El ProductoCard incluye el corazón (wishlist).
function ProductoCard({
  prod,
  addToCart,
  tamañosDisponibles,
  wishlistActive,
  onToggleWishlist,
}: {
  prod: Producto;
  addToCart: (prod: Producto, tamaño: string) => void;
  tamañosDisponibles: { key: string; label: string; litros: number }[];
  wishlistActive: boolean;
  onToggleWishlist: () => void;
}) {
  const [tamañoSeleccionado, setTamañoSeleccionado] = useState<string | null>(null);
  const [openSizes, setOpenSizes] = useState(false);

  const recetasMap = (prod as any).recetasPorTamano || (prod as any).recetasPorTamaño || {};
  const tamaños = tamañosDisponibles.filter((t) => Object.keys(recetasMap).includes(t.key));

  const stockTotal = getStockTotal(prod as any);
  const isAgotado = stockTotal <= 0;

  const precioActual = tamañoSeleccionado ? getPrecioPorTamano(prod as any, tamañoSeleccionado) : 0;
  const selectedInfo = tamañosDisponibles.find((t) => t.key === tamañoSeleccionado);

  return (
    <Card className="rounded-3xl border border-border/60 bg-card text-card-foreground shadow-sm flex flex-col pb-3 pt-2 max-w-[340px] w-full mx-auto transition duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg text-foreground group-hover:underline leading-snug">
            {prod.nombre}
          </CardTitle>

          <div className="shrink-0">
            {isAgotado ? (
              <span className="px-2 py-1 rounded-full text-[11px] font-extrabold bg-destructive text-destructive-foreground">
                Agotado
              </span>
            ) : stockTotal <= 3 ? (
              <span className="px-2 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                Stock bajo
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Disponible
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getProductImage(prod)}
            alt={prod.nombre}
            className="object-cover w-full h-full group-hover:scale-110 transition duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />

          {/* corazón */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist();
            }}
            className={[
              "absolute top-3 right-3 z-6 h-6 w-6 rounded-full grid place-items-center border transition",
              wishlistActive
                ? "bg-red-600 text-white border-red-700 hover:bg-red-700"
                : "bg-background/70 backdrop-blur border-border/60 text-muted-foreground hover:bg-muted",
            ].join(" ")}
            aria-label={wishlistActive ? "Quitar de wishlist" : "Añadir a wishlist"}
            title={wishlistActive ? "Quitar de wishlist" : "Añadir a wishlist"}
          >
            <Heart className={["h-3 w-3", wishlistActive ? "fill-white" : ""].join(" ")} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {(prod.sabores ?? []).map((sabor: string, idx: number) => (
            <span
              key={idx}
              className="bg-muted text-muted-foreground border border-border/60 px-3 py-1 rounded-full text-xs font-semibold"
            >
              {sabor}
            </span>
          ))}
        </div>

        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{prod.descripcion}</p>

        {tamañoSeleccionado && (
          <div className="mb-3">
            <div className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatPEN(precioActual)}
            </div>
          </div>
        )}

        {/* selector de tamaños */}
        <div className="mb-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setOpenSizes((v) => !v);
            }}
            className={[
              "w-full rounded-xl border px-4 py-2 flex items-center justify-between transition",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              openSizes ? "bg-muted border-border" : "bg-card border-border/60 hover:bg-muted",
            ].join(" ")}
          >
            <span className="flex items-center gap-3">
              {tamañoSeleccionado ? (
                <>
                  <span
                    className={[
                      "inline-flex items-center justify-center w-9 h-9 rounded-xl border",
                      "bg-primary/10 border-primary/20 text-primary",
                      "dark:bg-white/10 dark:border-white/15 dark:text-white",
                    ].join(" ")}
                  >
                    <JarIcon size={sizeForTamKey(tamañoSeleccionado)} className="currentColor" />
                  </span>

                  <span className="font-semibold text-foreground">
                    {selectedInfo?.label ?? tamañoSeleccionado}
                    <span className="ml-2 text-xs text-muted-foreground">({selectedInfo?.litros} L)</span>
                  </span>
                </>
              ) : (
                <span className="font-semibold text-foreground">Tamaño</span>
              )}
            </span>

            <span
              className={[
                "text-muted-foreground text-sm transition-transform duration-300",
                openSizes ? "rotate-180" : "rotate-0",
              ].join(" ")}
            >
              ▼
            </span>
          </button>

          <div
            className={[
              "mt-2 rounded-xl border border-border/60 bg-card overflow-hidden",
              "transition-all duration-300 ease-out",
              openSizes ? "max-h-96 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1",
            ].join(" ")}
          >
            <div className="py-1">
              {tamaños.map((tam) => {
                const active = tamañoSeleccionado === tam.key;
                const iconSize = sizeForTamKey(tam.key);

                return (
                  <button
                    key={tam.key}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTamañoSeleccionado(tam.key);
                      setTimeout(() => setOpenSizes(false), 80);
                    }}
                    className={[
                      "w-full flex items-center justify-between px-4 py-2 transition text-left",
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={[
                          "inline-flex items-center justify-center rounded-xl border",
                          active
                            ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
                            : "bg-primary/10 border-primary/20 text-primary dark:bg-white/10 dark:border-white/15 dark:text-white",
                        ].join(" ")}
                        style={{ width: iconSize + 14, height: iconSize + 14 }}
                      >
                        <JarIcon size={iconSize} className="currentColor" />
                      </span>

                      <span className="font-semibold">
                        {tam.label}
                        <span
                          className={
                            active
                              ? "ml-2 text-xs text-primary-foreground/80"
                              : "ml-2 text-xs text-muted-foreground"
                          }
                        >
                          ({tam.litros} L)
                        </span>
                      </span>
                    </span>

                    <span
                      className={
                        active
                          ? "text-primary-foreground/90 text-sm font-bold"
                          : "text-emerald-700 dark:text-emerald-300 text-sm font-bold"
                      }
                    >
                      {formatPEN(getPrecioPorTamano(prod as any, tam.key))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3 py-2 rounded-xl mt-1 transition flex items-center justify-center gap-2 disabled:opacity-60"
          onClick={(e) => {
            e.preventDefault();
            if (!tamañoSeleccionado) return;
            addToCart(prod, tamañoSeleccionado);
          }}
          disabled={!tamañoSeleccionado || isAgotado}
          title={isAgotado ? "Agotado" : undefined}
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M17 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M17 17h-11v-14h-2" />
            <path d="M6 5l14 1l-1 7h-13" />
          </svg>
          {tamañoSeleccionado ? `Añadir ${tamañoSeleccionado}` : "Añadir al carrito"}
        </button>
      </CardContent>
    </Card>
  );
}