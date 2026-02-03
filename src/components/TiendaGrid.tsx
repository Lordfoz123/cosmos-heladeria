import { useCarrito } from "@/components/CarritoContext";
import { Producto } from "@/types/inventario";
import { useState } from "react";

const TAMAÑOS = [
  { key: "8oz", label: "8 oz", litros: 0.237 },
  { key: "16oz", label: "16 oz", litros: 0.473 },
  { key: "32oz", label: "32 oz", litros: 0.946 },
];

export default function TiendaGrid({ productos }: { productos: Producto[] }) {
  const { addToCart } = useCarrito();

  return (
    <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-4 justify-center">
      {productos.map((prod) => (
        <ProductoCard key={prod.id} prod={prod} addToCart={addToCart} />
      ))}
    </div>
  );
}

function ProductoCard({
  prod,
  addToCart,
}: {
  prod: Producto;
  addToCart: (prod: Producto, tam: string) => void;
}) {
  const [tamañoSeleccionado, setTamañoSeleccionado] = useState<string | null>(
    null
  );

  const tamaños = TAMAÑOS.filter(
    (t) => prod.recetasPorTamaño && prod.recetasPorTamaño[t.key]
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow flex flex-col pb-4 pt-3 max-w-[340px] w-full mx-auto">
      {/* Nombre (siempre legible en dark) */}
      <div className="text-lg text-foreground mt-2 font-bold px-4">
        {prod.nombre}
      </div>

      {/* Imagen */}
      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mt-2 mb-3 bg-muted">
        <img
          src={prod.imagen}
          alt={prod.nombre}
          className="object-cover w-full h-full"
        />
      </div>

      {/* Sabores */}
      <div className="flex flex-wrap gap-1 mb-2 px-4">
        {prod.sabores?.map((sabor, idx) => (
          <span
            key={idx}
            className="bg-muted text-muted-foreground border border-border/60 px-3 py-1 rounded-full text-xs font-medium"
          >
            {sabor}
          </span>
        ))}
      </div>

      {/* Descripción */}
      <div className="mb-2 px-4 text-sm text-muted-foreground">
        {prod.descripcion}
      </div>

      {/* Tamaños */}
      <div className="flex gap-2 mb-4 flex-wrap px-4">
        {tamaños.map((tam) => {
          const active = tamañoSeleccionado === tam.key;

          return (
            <button
              key={tam.key}
              onClick={() => setTamañoSeleccionado(tam.key)}
              className={[
                "px-4 py-1.5 rounded-full border text-sm font-semibold transition",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-foreground border-border hover:bg-muted",
              ].join(" ")}
              aria-pressed={active}
              tabIndex={0}
            >
              {tam.label}{" "}
              <span className="text-xs text-muted-foreground">
                ({tam.litros}L)
              </span>
            </button>
          );
        })}
      </div>

      {/* Precio */}
      <div className="font-bold text-xl mb-3 text-emerald-600 dark:text-emerald-400 px-4">
        S/
        {Number(prod.precio).toLocaleString("es-PE", {
          minimumFractionDigits: 2,
        })}
      </div>

      {/* Añadir al carrito */}
      <button
        className={[
          "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-xl mt-1 transition",
          "flex items-center justify-center gap-2",
          !tamañoSeleccionado ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
        onClick={() => tamañoSeleccionado && addToCart(prod, tamañoSeleccionado)}
        disabled={!tamañoSeleccionado}
        aria-disabled={!tamañoSeleccionado}
      >
        <svg
          width="22"
          height="22"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1"
        >
          <path stroke="none" d="M0 0h24v24H0z" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="17" cy="20" r="1" />
          <path d="M3 6h18l-1.5 9h-15z" />
          <path d="M17 17h-11v-14h-2" />
          <path d="M6 5l14 1l-1 7h-13" />
        </svg>
        Añadir al carrito
      </button>
    </div>
  );
}