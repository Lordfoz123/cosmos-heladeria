export type InsumoTipo = "comprado" | "intermedio" | "final";

export type Insumo = {
  id?: string;
  nombre: string;
  unidad: "Kg" | "Gramos";
  stock: number;
  costo: number;
  tipo?: InsumoTipo;
};