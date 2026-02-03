import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../firebase";

const ORDERS_COLLECTION = "pedidos";
const DATE_FIELD = "fecha";
const SOUND_URL = "/sounds/Notification.wav";
const NOTIFICATIONS_COLLECTION = "adminNotificaciones";

// ✅ Key para recordar si ya activaron sonido en este navegador
const SOUND_ENABLED_KEY = "cosmos:soundEnabled";

type AdminNotification = {
  type: "pedido_nuevo";
  pedidoId: string;
  orden?: number | string;
  titulo: string;
};

export function useOrderAlerts() {
  const [soundEnabled, setSoundEnabled] = useState(false);

  const firstLoad = useRef(true);
  const lastSeenDate = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ✅ Cargar preferencia al iniciar (tras refresh)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SOUND_ENABLED_KEY);
      if (saved === "1") setSoundEnabled(true);
    } catch {}
  }, []);

  const enableSound = useCallback(async () => {
    try {
      if (!audioRef.current) audioRef.current = new Audio(SOUND_URL);

      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      setSoundEnabled(true);
      try {
        localStorage.setItem(SOUND_ENABLED_KEY, "1");
      } catch {}

      toast.success("Sonido activado");
    } catch (e) {
      console.error("enableSound error:", e);
      toast.error("El navegador bloqueó el sonido. Intenta nuevamente.");
    }
  }, []);

  const storeNotification = useCallback((payload: AdminNotification) => {
    addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...payload,
      leida: false,
      createdAt: serverTimestamp(),
    }).catch((err) => {
      console.error("storeNotification error:", err);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy(DATE_FIELD, "desc"));

    const unsub = onSnapshot(q, (snap) => {
      if (firstLoad.current) {
        firstLoad.current = false;
        const newest = snap.docs[0]?.data()?.[DATE_FIELD];
        if (newest instanceof Timestamp) lastSeenDate.current = newest.toMillis();
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;

        const data = change.doc.data() as any;
        const ts = data?.[DATE_FIELD];
        const millis = ts instanceof Timestamp ? ts.toMillis() : Date.now();

        if (millis <= lastSeenDate.current) return;
        lastSeenDate.current = millis;

        const title = `Nuevo pedido: #${data.orden ?? change.doc.id}`;

        toast.success(title, { duration: 7000 });

        storeNotification({
          type: "pedido_nuevo",
          pedidoId: change.doc.id,
          orden: data.orden,
          titulo: title,
        });

        if (soundEnabled) {
          const a = audioRef.current || new Audio(SOUND_URL);
          audioRef.current = a;
          a.currentTime = 0;
          a.play().catch(() => {});
        }
      });
    });

    return () => unsub();
  }, [soundEnabled, storeNotification]);

  return { soundEnabled, enableSound };
}