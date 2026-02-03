"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useCarrito } from "@/components/CarritoContext";
import Header from "@/components/Header";
import ShopFooter from "@/components/ShopFooter";

type RecetaPorTamaño = {
  [key: string]: {
    ingredientes: {
      insumoId: string;
      nombre: string;
      cantidad: number;
      unidad: string;
    }[];
    precio?: number;
    label?: string;
  };
};

type Producto = {
  id: string; // ✅ obligatorio
  nombre: string;
  precio: number;
  descripcion: string;
  sabores: string[];
  recetasPorTamaño: RecetaPorTamaño;
  imagen?: string;
};

export default function ProductoPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCarrito();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tam, setTam] = useState<string | null>(null);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    async function fetchProducto() {
      setLoading(true);

      if (!params.id) {
        setProducto(null);
        setLoading(false);
        return;
      }

      const ref = doc(db, "productos", String(params.id));
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setProducto({ id: snap.id, ...(snap.data() as Omit<Producto, "id">) });
      } else {
        setProducto(null);
      }

      setLoading(false);
    }

    fetchProducto();
  }, [params.id]);

  function handleAgregar() {
    // ✅ FIX TS: re-check dentro del handler
    if (!tam) return;
    if (!producto) return;

    addToCart(producto, tam);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1400);
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto flex flex-col justify-center items-center gap-4 py-40 text-[#255285] text-xl font-bold">
          Cargando producto...
        </main>
        <ShopFooter />
      </>
    );
  }

  if (!producto) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto flex flex-col justify-center items-center gap-4 py-40">
          <h2 className="text-xl font-bold text-[#255285]">Producto no encontrado</h2>
          <button
            className="bg-[#255285] text-white rounded-lg px-6 py-2 mt-6 font-semibold"
            onClick={() => router.push("/tienda")}
            type="button"
          >
            Volver a tienda
          </button>
        </main>
        <ShopFooter />
      </>
    );
  }

  // Lista de tamaños configurados (del objeto recetasPorTamaño)
  const tamaños = Object.entries(producto.recetasPorTamaño ?? {}).map(([key, value]) => ({
    key,
    label: value.label || key,
    precio: value.precio ?? producto.precio ?? 0,
  }));

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto py-12 px-4 grid gap-10 md:grid-cols-2 items-center min-h-[80vh]">
        {/* Imagen del producto */}
        <div className="flex justify-center">
          <img
            src={producto.imagen || ""}
            alt={producto.nombre}
            className="max-w-[370px] rounded-2xl border shadow-lg bg-white"
          />
        </div>

        {/* Detalles */}
        <div>
          <h1 className="text-3xl font-bold mb-3 text-[#255285] tracking-tight">
            {producto.nombre}
          </h1>

          <div className="mb-3 text-gray-700 leading-relaxed">{producto.descripcion}</div>

          {/* Píldoras de sabores */}
          {Array.isArray(producto.sabores) && producto.sabores.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {producto.sabores.map((sabor, idx) => (
                <span
                  key={idx}
                  className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium"
                >
                  {sabor}
                </span>
              ))}
            </div>
          )}

          {/* Capacidad selector */}
          {tamaños.length > 0 && (
            <div className="mb-5">
              <div className="font-bold text-gray-800 mb-2">Capacidad:</div>
              <div className="flex flex-wrap gap-2">
                {tamaños.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`border px-5 py-2 rounded-lg font-semibold transition
                      ${
                        tam === t.key
                          ? "bg-[#e7f1fa] border-[#255285] scale-105 shadow-sm text-[#255285]"
                          : "bg-white border-[#CDD9ED] hover:bg-[#f3f8fb] text-[#255285]"
                      }`}
                    onClick={() => setTam(t.key)}
                  >
                    {t.label}
                    <span className="text-xs font-normal ml-1 text-gray-600">
                      S/{t.precio}
                    </span>
                  </button>
                ))}

                {tam && (
                  <button
                    type="button"
                    onClick={() => setTam(null)}
                    className="ml-2 text-xs text-[#255285] underline font-medium hover:text-[#18355e]"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Agregar al carrito */}
          <button
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-full font-bold text-lg
              ${
                tam
                  ? "bg-[#255285] text-white hover:bg-[#18355e] shadow"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
              transition`}
            onClick={handleAgregar}
            disabled={!tam}
            type="button"
          >
            {agregado ? (
              <>
                <svg width={22} height={22} fill="none" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M8.7 16.2 5.1 12.6c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0l2.5 2.5 6.5-6.5c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4l-7.2 7.2c-.2.2-.5.2-.7 0Z"
                  />
                </svg>
                Agregado
              </>
            ) : (
              <>Agregar al carrito</>
            )}
          </button>
        </div>
      </main>
      <ShopFooter />
    </>
  );
}