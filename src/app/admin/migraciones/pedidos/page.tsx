"use client";

import { useMemo, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
} from "firebase/firestore";

type FixLog = {
  id: string;
  changes: string[];
  before?: any;
};

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  if (typeof ts === "number") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Normaliza pedidos:
 * - asegura "fecha" como Firestore Timestamp
 * - asegura "orden" number (consecutivo por fecha asc)
 * - normaliza "estado" (trim) opcional
 *
 * Campos esperados:
 * - fecha
 * - orden
 * - estado
 */
export default function MigracionPedidosPage() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<FixLog[]>([]);
  const [summary, setSummary] = useState<{
    scanned: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);

  // opciones
  const [dryRun, setDryRun] = useState(true);
  const [fixOrden, setFixOrden] = useState(true);
  const [fixFecha, setFixFecha] = useState(true);
  const [trimEstado, setTrimEstado] = useState(true);

  const canRun = useMemo(() => !running, [running]);

  async function run() {
    if (!canRun) return;

    setRunning(true);
    setLogs([]);
    setSummary(null);

    try {
      const snap = await getDocs(collection(db, "pedidos"));

      const docs = snap.docs.map((d) => ({
        id: d.id,
        ref: d.ref,
        data: d.data() as any,
      }));

      // ordenamos por fecha asc para asignar orden consecutivo (si fixOrden)
      const withDate = docs.map((x) => ({
        ...x,
        date: toDate(x.data.fecha),
      }));

      withDate.sort((a, b) => {
        const da = a.date?.getTime() ?? 0;
        const dbb = b.date?.getTime() ?? 0;
        return da - dbb;
      });

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      // Firestore batch: máx 500 ops, usamos 400 por seguridad
      const batches = chunk(withDate, 400);

      for (let bi = 0; bi < batches.length; bi++) {
        const batchDocs = batches[bi];
        const batch = writeBatch(db);

        for (let idx = 0; idx < batchDocs.length; idx++) {
          const item = batchDocs[idx];
          const data = item.data;
          const changes: string[] = [];
          const patch: Record<string, any> = {};

          // --- fecha ---
          if (fixFecha) {
            const originalFecha = data.fecha;
            const d = toDate(originalFecha);

            // si no existe fecha, la dejamos (no inventamos), solo log
            if (!originalFecha) {
              // no cambia
            } else if (!d) {
              // fecha con tipo raro: log
              changes.push("fecha: inválida (no convertible)");
            } else {
              // si ya es Timestamp, no tocamos.
              // si es Date/string/number -> convertimos a Timestamp
              const isTimestamp = typeof originalFecha?.toDate === "function" && typeof originalFecha?.seconds === "number";
              if (!isTimestamp) {
                patch.fecha = Timestamp.fromDate(d);
                changes.push("fecha: normalizada a Timestamp");
              }
            }
          }

          // --- estado ---
          if (trimEstado && typeof data.estado === "string") {
            const t = data.estado.trim();
            if (t !== data.estado) {
              patch.estado = t;
              changes.push('estado: trim');
            }
          }

          // --- orden ---
          if (fixOrden) {
            // asignación consecutiva basada en orden por fecha asc
            // solo si falta o no es number
            const ord = data.orden;
            const shouldSet = typeof ord !== "number" || !Number.isFinite(ord);
            if (shouldSet) {
              // orden global: usamos el índice dentro del array total (bi*chunk + idx)
              const globalIndex = bi * 400 + idx;
              patch.orden = globalIndex + 1;
              changes.push("orden: asignado consecutivo");
            }
          }

          if (changes.length === 0) {
            skipped++;
            continue;
          }

          setLogs((prev) => prev.concat([{ id: item.id, changes }]));

          if (!dryRun) {
            batch.update(doc(db, "pedidos", item.id), patch);
          }

          updated++;
        }

        if (!dryRun) {
          try {
            await batch.commit();
          } catch (e) {
            console.error(e);
            errors++;
          }
        }
      }

      setSummary({
        scanned: docs.length,
        updated,
        skipped,
        errors,
      });
    } catch (e) {
      console.error(e);
      setSummary({ scanned: 0, updated: 0, skipped: 0, errors: 1 });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#255285]">Migración: Pedidos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Normaliza campos para evitar errores internos de Firestore (fecha Timestamp + orden number).
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Dry-run (no escribe; solo muestra qué cambiaría)
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={fixFecha} onChange={(e) => setFixFecha(e.target.checked)} />
            Normalizar <code className="px-1 bg-gray-100 rounded">fecha</code> a Timestamp
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={fixOrden} onChange={(e) => setFixOrden(e.target.checked)} />
            Asegurar <code className="px-1 bg-gray-100 rounded">orden</code> (consecutivo por fecha)
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={trimEstado} onChange={(e) => setTrimEstado(e.target.checked)} />
            Trim de <code className="px-1 bg-gray-100 rounded">estado</code>
          </label>

          <div className="flex gap-3 mt-2">
            <button
              disabled={running}
              onClick={run}
              className="bg-[#255285] hover:bg-[#20466f] disabled:opacity-60 text-white font-extrabold px-5 py-2 rounded-xl"
            >
              {running ? "Ejecutando…" : dryRun ? "Simular migración" : "Ejecutar migración"}
            </button>

            {!dryRun && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Estás en modo escritura. Esto modificará documentos.
              </div>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="font-extrabold text-gray-800 mb-2">Resumen</div>
          <div className="text-sm text-gray-700">
            Escaneados: <b>{summary.scanned}</b> · Actualizados: <b>{summary.updated}</b> · Sin cambios:{" "}
            <b>{summary.skipped}</b> · Errores: <b className="text-red-600">{summary.errors}</b>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="font-extrabold text-gray-800 mb-3">Cambios detectados ({logs.length})</div>
          <div className="max-h-[420px] overflow-auto space-y-2">
            {logs.slice(0, 200).map((l) => (
              <div key={l.id} className="border border-gray-200 rounded-xl p-3">
                <div className="font-mono text-xs text-gray-600">id: {l.id}</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                  {l.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
            {logs.length > 200 && (
              <div className="text-xs text-gray-400">Mostrando primeros 200 cambios…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}