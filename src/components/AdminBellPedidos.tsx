"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { Bell, Volume2, VolumeX, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebaseConfig";

type PedidoItem = {
  productoId?: string;
  nombre: string;
  tamaño?: string;
  cantidad: number;
  precioUnit?: number;
};

type Pedido = {
  id: string;
  estado: string;
  fecha: any;
  nombreCliente?: string;
  total?: number;
  productos?: PedidoItem[];
  medioPago?: string;
  pagoConfirmado?: boolean;
};

const SOUND_URL = "/sounds/Notification.wav"; // o /sounds/notification.wav (recomendado renombrar)
const SOUND_KEY = "bellPedidos:soundEnabled";

function formatHora(fecha: any) {
  try {
    if (!fecha) return "";
    const d =
      fecha instanceof Date
        ? fecha
        : typeof fecha?.toDate === "function"
          ? fecha.toDate()
          : typeof fecha?.seconds === "number"
            ? new Date(fecha.seconds * 1000)
            : null;
    if (!d) return "";
    return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function safePlay(audio: HTMLAudioElement) {
  audio.currentTime = 0;
  const p = audio.play();
  if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
}

async function unlockAudio(audio: HTMLAudioElement) {
  try {
    audio.muted = true;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.muted = false;
  } catch {
    audio.muted = false;
  }
}

export default function AdminBellPedidos() {
  const [open, setOpen] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(SOUND_KEY);
    return v == null ? true : v === "1";
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  const hydratedRef = useRef(false);
  const lastIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const a = new Audio(SOUND_URL);
    a.preload = "auto";
    audioRef.current = a;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SOUND_KEY, soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  useEffect(() => {
    // ✅ Si quieres SOLO "en espera", usa where("estado","==","en espera")
    // ✅ Si quieres "en espera" + "tomado", usa "in"
    const q = query(
      collection(db, "pedidos"),
      where("estado", "==", "en espera"),
      orderBy("fecha", "desc")
    );

    return onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as Pedido[];

      // evitar sonar con el historial inicial
      if (!hydratedRef.current) {
        hydratedRef.current = true;
        lastIdsRef.current = new Set(next.map((p) => p.id));
      } else {
        const prev = lastIdsRef.current;
        const newOnes = next.filter((p) => !prev.has(p.id));
        lastIdsRef.current = new Set(next.map((p) => p.id));

        if (newOnes.length > 0 && soundEnabled && audioRef.current && !open) {
          safePlay(audioRef.current);
        }
      }

      setPedidos(next);
    });
  }, [soundEnabled, open]);

  const count = pedidos.length;

  const iconBtn =
    "relative inline-flex h-10 w-10 items-center justify-center rounded-full " +
    "bg-card hover:bg-muted border border-border/60 " +
    "text-muted-foreground hover:text-foreground " +
    "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const chipBtn =
    "inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-border/60 " +
    "bg-background hover:bg-muted transition text-xs font-bold " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const pedidosUI = useMemo(() => pedidos.slice(0, 10), [pedidos]);

  return (
    <div className="relative">
      <button
        onClick={async () => {
          if (audioRef.current && !audioUnlockedRef.current) {
            await unlockAudio(audioRef.current);
            audioUnlockedRef.current = true;
          }
          setOpen((v) => !v);
        }}
        className={iconBtn}
        aria-label="Pedidos nuevos"
        title="Pedidos nuevos"
        type="button"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center bg-destructive text-destructive-foreground border border-destructive/30 shadow-sm">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] bg-card text-card-foreground border border-border/60 rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between p-3 border-b border-border/60">
            <div className="font-extrabold">
              Pedidos en espera{" "}
              <span className="text-muted-foreground font-semibold">
                ({count})
              </span>
            </div>

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
          </div>

          <div className="max-h-96 overflow-auto">
            {count === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No hay pedidos en espera.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {pedidosUI.map((p) => {
                  const hora = formatHora(p.fecha);
                  const items =
                    (p.productos ?? []).reduce((acc, it) => acc + (Number(it.cantidad) || 1), 0) || 0;

                  return (
                    <div key={p.id} className="p-3 hover:bg-muted/40 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-extrabold text-foreground leading-tight">
                            #{p.id.slice(-5).toUpperCase()}
                            <span className="ml-2 text-xs font-semibold text-muted-foreground">
                              {hora}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Cliente:{" "}
                            <span className="text-foreground font-semibold">
                              {p.nombreCliente || "Online"}
                            </span>{" "}
                            · Items:{" "}
                            <span className="text-foreground font-semibold">
                              {items}
                            </span>
                          </div>
                        </div>

                        <div className="text-right whitespace-nowrap">
                          <div className="text-xs text-muted-foreground">
                            Total
                          </div>
                          <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            S/ {Number(p.total || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="mt-2 flex justify-end">
                        {/* Ajusta la ruta a tu pantalla real de pedidos */}
                        <Link
                          href={`/dashboard?tab=pedidos&pedido=${p.id}`}
                          className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline underline-offset-4"
                          onClick={() => setOpen(false)}
                        >
                          Ver pedido <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border/60 bg-muted/20 flex justify-end">
            <Link
              href="/dashboard?tab=pedidos"
              className="text-xs font-extrabold text-foreground hover:underline underline-offset-4"
              onClick={() => setOpen(false)}
            >
              Ver todos los pedidos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}