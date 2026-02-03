"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Bell, Volume2, VolumeX, CheckCheck } from "lucide-react";
import { db } from "@/lib/firebaseConfig";

type Noti = {
  id: string;
  titulo: string;
  leida: boolean;
  createdAt?: any;
};

const NOTIFICATIONS_COLLECTION = "adminNotificaciones";

/**
 * ✅ Tu archivo actual:
 * public/sounds/Notification.wav
 *
 * IMPORTANTE:
 * - La ruta es case-sensitive en producción (Linux/Vercel).
 * - Si lo renombras a "notification.wav", cambia esta constante.
 */
const NOTI_SOUND_URL = "/sounds/Notification.wav";

function safePlay(audio: HTMLAudioElement) {
  audio.currentTime = 0;
  const p = audio.play();
  if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
}

async function unlockAudio(audio: HTMLAudioElement) {
  // "Desbloquea" audio en iOS/Safari/Chrome (requiere gesto del usuario).
  // Reproduce en mute un instante y pausa.
  try {
    audio.muted = true;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.muted = false;
  } catch {
    // si falla, no rompemos. Igual puede funcionar luego.
    audio.muted = false;
  }
}

export default function AdminBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Noti[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("adminBell:soundEnabled");
    return v == null ? true : v === "1";
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // Para detectar "nuevas" sin sonar por histórico
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);

  // Preparar audio 1 vez
  useEffect(() => {
    const a = new Audio(NOTI_SOUND_URL);
    a.preload = "auto";
    audioRef.current = a;
  }, []);

  // Persistir preferencia de sonido
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("adminBell:soundEnabled", soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  useEffect(() => {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          titulo: data.titulo ?? "(sin título)",
          leida: !!data.leida,
          createdAt: data.createdAt,
        } as Noti;
      });

      // Primer load: no sonar, solo hidratar
      if (!hydratedRef.current) {
        hydratedRef.current = true;
        lastSeenIdsRef.current = new Set(next.map((n) => n.id));
      } else {
        const prev = lastSeenIdsRef.current;

        const newOnes = next.filter((n) => !prev.has(n.id));

        lastSeenIdsRef.current = new Set(next.map((n) => n.id));

        // ✅ Sonido solo por notificaciones NUEVAS (después del primer snapshot)
        // ✅ y solo si está habilitado
        // ✅ y (recomendado) si el panel no está abierto
        if (newOnes.length > 0 && soundEnabled && audioRef.current && !open) {
          safePlay(audioRef.current);
        }
      }

      setItems(next);
    });
  }, [soundEnabled, open]);

  const unread = useMemo(
    () => items.filter((i) => !i.leida).length,
    [items]
  );

  const markAllAsRead = async () => {
    const unreadItems = items.filter((i) => !i.leida);
    await Promise.all(
      unreadItems.map((i) =>
        updateDoc(doc(db, NOTIFICATIONS_COLLECTION, i.id), { leida: true })
      )
    );
  };

  const iconBtn =
    "relative inline-flex h-10 w-10 items-center justify-center rounded-full " +
    "bg-card hover:bg-muted border border-border/60 " +
    "text-muted-foreground hover:text-foreground " +
    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const chipBtn =
    "inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-border/60 " +
    "bg-background hover:bg-muted transition text-xs font-bold " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="relative">
      <button
        onClick={async () => {
          // ✅ Primer click: desbloquear audio (para que luego pueda sonar)
          if (audioRef.current && !audioUnlockedRef.current) {
            await unlockAudio(audioRef.current);
            audioUnlockedRef.current = true;
          }
          setOpen((v) => !v);
        }}
        className={iconBtn}
        aria-label="Notificaciones"
        title="Notificaciones"
        type="button"
      >
        <Bell className="h-5 w-5" />

        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center bg-destructive text-destructive-foreground border border-destructive/30 shadow-sm">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card text-card-foreground border border-border/60 rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between p-3 border-b border-border/60">
            <div className="font-extrabold">Notificaciones</div>

            <div className="flex items-center gap-2">
              {/* Toggle sonido */}
              <button
                onClick={() => setSoundEnabled((v) => !v)}
                className={chipBtn}
                type="button"
                aria-label={soundEnabled ? "Silenciar" : "Activar sonido"}
                title={soundEnabled ? "Silenciar" : "Activar sonido"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                {soundEnabled ? "Sonido" : "Mute"}
              </button>

              {unread > 0 && (
                <button
                  onClick={() => markAllAsRead().catch(console.error)}
                  className={chipBtn}
                  type="button"
                >
                  <CheckCheck className="h-4 w-4" />
                  Leer todo
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                Sin notificaciones
              </div>
            ) : (
              items.slice(0, 30).map((n) => (
                <div
                  key={n.id}
                  className={[
                    "p-3 border-b border-border/60 text-sm",
                    n.leida ? "bg-card" : "bg-primary/10",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-foreground">{n.titulo}</div>
                    {!n.leida && (
                      <span className="text-xs font-bold text-primary whitespace-nowrap">
                        • nueva
                      </span>
                    )}
                  </div>

                  {!n.leida && (
                    <button
                      onClick={() =>
                        updateDoc(doc(db, NOTIFICATIONS_COLLECTION, n.id), {
                          leida: true,
                        }).catch(console.error)
                      }
                      className="mt-2 text-xs font-bold text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                      type="button"
                    >
                      Marcar como leído
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}