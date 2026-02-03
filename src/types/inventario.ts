export type Insumo = {
  id: string;
  nombre: string;

  // unidad de medida (kg, lt, und, etc.)
  unidad: string;

  // stock disponible
  stock: number;

  // costo por unidad
  costo: number;
};

// Receta por tamaño (si tu producto lo usa)
export type RecetaPorTamaño = Record<
  string,
  {
    ingredientes: {
      insumoId: string;
      nombre: string;
      cantidad: number;
      unidad: string;
    }[];
    precio?: number;
    label?: string;
  }
>;

// ✅ Producto (para TiendaGrid / checkout / carrito)
export type Producto = {
  id: string; // obligatorio para addToCart y para rutas

  nombre: string;
  precio: number;

  descripcion?: string;
  imagen?: string;
  sabores?: string[];

  // stock (opcional en distintas pantallas)
  stock?: number;
  stockPorTamaño?: Record<string, number>;
  stockTotal?: number;

  // badge oferta (opcional)
  oferta?: boolean;

  // recetas / insumos (opcionales)
  recetasPorTamaño?: RecetaPorTamaño;
  insumos?: Insumo[];

  // estados (opcionales)
  status?: "draft" | "published";
  inCatalog?: boolean;
};