export type UnidadUI = "kg" | "g";

export type IngredienteReceta = {
  key: string;
  nombre: string; // debe coincidir con insumos.nombre
  unidadUI: UnidadUI;
};

export type RecetaProduccion = {
  id: string;
  nombre: string;
  tipo: "subreceta" | "final";
  batchBaseKg: number;
  outputNombre: string;
  ingredientes: IngredienteReceta[];
};

export const RECETAS_PRODUCCION: RecetaProduccion[] = [
  {
    id: "base-coco",
    nombre: "Base Coco (sub-receta)",
    tipo: "subreceta",
    batchBaseKg: 10,
    outputNombre: "Base Coco",
    ingredientes: [
      { key: "leche_coco", nombre: "Leche de coco", unidadUI: "kg" },
      { key: "azucar", nombre: "Azúcar", unidadUI: "kg" },
      { key: "inulina", nombre: "Inulina", unidadUI: "g" },
      { key: "cmc", nombre: "CMC", unidadUI: "g" },
      { key: "aceite_coco", nombre: "Aceite de coco", unidadUI: "g" },
    ],
  },
  {
    id: "pulpa-frutos-rojos",
    nombre: "Pulpa Frutos Rojos (sub-receta)",
    tipo: "subreceta",
    batchBaseKg: 10,
    outputNombre: "Pulpa Frutos Rojos",
    ingredientes: [
      { key: "fresa", nombre: "Fresa", unidadUI: "kg" },
      { key: "arandanos", nombre: "Arándanos", unidadUI: "kg" },
      { key: "azucar", nombre: "Azúcar", unidadUI: "kg" },
    ],
  },
  {
    id: "base-chocolate",
    nombre: "Base Chocolate (sub-receta)",
    tipo: "subreceta",
    batchBaseKg: 10,
    outputNombre: "Base Chocolate",
    ingredientes: [
      { key: "agua", nombre: "Agua", unidadUI: "kg" },
      { key: "azucar", nombre: "Azúcar", unidadUI: "kg" },
      { key: "choco_polvo", nombre: "Chocolate polvo", unidadUI: "g" },
      { key: "choco_70", nombre: "Chocolate 70%", unidadUI: "g" },
      { key: "inulina", nombre: "Inulina", unidadUI: "g" },
      { key: "cmc", nombre: "CMC", unidadUI: "g" },
    ],
  },
  {
    id: "helado-frutos-rojos",
    nombre: "Helado Frutos Rojos (final)",
    tipo: "final",
    batchBaseKg: 10,
    outputNombre: "Helado Frutos Rojos Granel",
    ingredientes: [
      { key: "base_coco", nombre: "Base Coco", unidadUI: "kg" },
      { key: "pulpa_fr", nombre: "Pulpa Frutos Rojos", unidadUI: "kg" },
      { key: "vainilla", nombre: "Pasta de vainilla", unidadUI: "g" },
    ],
  },
];