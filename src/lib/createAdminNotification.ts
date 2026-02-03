import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";

export async function createAdminNotification(payload: {
  type: "pedido_nuevo";
  pedidoId: string;
  orden?: number | string;
  titulo: string;
}) {
  await addDoc(collection(db, "adminNotificaciones"), {
    ...payload,
    leida: false,
    createdAt: serverTimestamp(),
  });
}