import { Timestamp } from "firebase/firestore";

export type RecetaProduccionDoc = {
  nombre: string;
  tipo: "subreceta" | "final";
  batchBaseKg: number;
  outputInsumoId: string;
  outputNombre: string;
  imagen?: string; // <--- NUEVO CAMPO
  ingredientes: Array<{
    insumoId: string;
    insumoNombre: string;
    unidadUI: "kg" | "g";
    cantidadTeorica: number;
  }>;
  activo: boolean;
  updatedAt: any;
  createdAt: any;
};