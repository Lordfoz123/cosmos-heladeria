// src/lib/saveAdminTokenFCM.ts
import { db } from "@/lib/firebaseConfig";
import { setDoc, doc } from "firebase/firestore";

export async function saveAdminTokenFCM(token: string) {
  try {
    await setDoc(doc(db, "fcmTokens", "admin"), {
      token,
      updatedAt: new Date(),
    });
    console.log("Token FCM guardado en Firestore:", token);
  } catch (err) {
    console.error("ERROR guardando token FCM:", err);
  }
}