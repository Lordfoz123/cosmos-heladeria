import { addDoc, collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export type MovimientoTipo = "entrada" | "salida";

export async function crearMovimiento(params: {
  insumoId: string;
  insumoNombre: string;
  cantidad: number; // kg
  tipo: MovimientoTipo;
  observacion: string;
  usuarioNombre: string;
}) {
  await addDoc(collection(db, "movimientos"), {
    insumoId: params.insumoId,
    insumoNombre: params.insumoNombre,
    cantidad: Number(params.cantidad || 0),
    tipo: params.tipo,
    observacion: params.observacion,
    usuarioNombre: params.usuarioNombre,
    fecha: serverTimestamp(),
  });
}

export async function aplicarMovimientoStock(params: { insumoId: string; delta: number }) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "insumos", params.insumoId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Insumo no existe");

    const current = Number((snap.data() as any).stock || 0);
    const next = current + Number(params.delta || 0);

    // Seguridad: evita negativos
    if (next < 0) {
      const nombre = String((snap.data() as any).nombre || "");
      throw new Error(
        `Stock insuficiente${nombre ? ` para "${nombre}"` : ""}. Stock: ${current}, requiere: ${Math.abs(
          Number(params.delta || 0)
        )}`
      );
    }

    tx.update(ref, { stock: next, updatedAt: serverTimestamp() });
  });
}