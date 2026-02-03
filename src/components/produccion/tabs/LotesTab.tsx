"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { ClipboardList } from "lucide-react";

type LoteDoc = {
  recetaId: string;
  recetaNombre: string;
  tipo: "subreceta" | "final";
  batchKg: number;
  outputInsumoId: string;
  outputNombre: string;
  outputKg: number;
  inputs: Array<{ insumoId: string; insumoNombre: string; kg: number }>;
  usuarioNombre: string;
  createdAt?: any;
};

function formatFecha(ts: any) {
  const d = ts?.toDate?.() ? ts.toDate() : null;
  if (!d) return "-";
  return d.toLocaleString();
}

export function LotesTab({ onNuevoLote }: { onNuevoLote: () => void }) {
  const [lotes, setLotes] = useState<Array<{ id: string; data: LoteDoc }>>([]);

  useEffect(() => {
    const q = query(collection(db, "lotes_produccion"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLotes(snap.docs.map((d) => ({ id: d.id, data: d.data() as LoteDoc })));
    });
    return () => unsub();
  }, []);

  const totalHoy = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = now.getDate();
    return lotes.filter((l) => {
      const d = l.data.createdAt?.toDate?.();
      if (!d) return false;
      return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
    }).length;
  }, [lotes]);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="bg-muted rounded-lg p-2 flex items-center justify-center">
            <ClipboardList className="text-primary w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-foreground leading-none">Lotes</div>
            <div className="text-sm text-muted-foreground mt-1">
              Total: <b className="text-foreground">{lotes.length}</b> · Hoy:{" "}
              <b className="text-foreground">{totalHoy}</b>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2 rounded-xl shadow-sm transition"
          onClick={onNuevoLote}
        >
          Nuevo lote
        </button>
      </div>

      <div className="divide-y divide-border">
        {lotes.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">Aún no hay lotes.</div>
        ) : (
          lotes.map((l) => (
            <details key={l.id} className="group p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-foreground">{l.data.recetaNombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFecha(l.data.createdAt)} · {l.data.tipo}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-foreground">
                      {Number(l.data.outputKg || 0).toFixed(2)} kg
                    </div>
                    <div className="text-xs text-muted-foreground">{l.data.outputNombre}</div>
                  </div>
                </div>
              </summary>

              <div className="mt-3 rounded-xl border border-border bg-muted/30 overflow-hidden">
                <div className="px-4 py-2 text-xs font-extrabold text-muted-foreground border-b border-border">
                  Inputs (descontados)
                </div>
                <div className="divide-y divide-border">
                  {(l.data.inputs ?? []).map((i) => (
                    <div key={i.insumoId} className="px-4 py-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">{i.insumoNombre}</div>
                      <div className="text-sm font-bold text-muted-foreground">{Number(i.kg || 0).toFixed(3)} kg</div>
                    </div>
                  ))}
                  {(l.data.inputs ?? []).length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Sin inputs registrados.</div>
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                Lote ID: <span className="font-mono text-foreground">{l.id}</span>
              </div>
            </details>
          ))
        )}
      </div>
    </section>
  );
}