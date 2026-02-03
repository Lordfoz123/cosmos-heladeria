"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { endOfDay, startOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";

type Voucher = {
  status?: "none" | "uploaded" | "deleted" | string;
  path?: string;
  uploadedAt?: any;
};

export type PedidoPagoLite = {
  id: string;
  fecha?: any;
  medioPago?: string;
  pagoConfirmado?: boolean;
  pagoConfirmadoAt?: any; // por si lo quieres usar luego
  estadoPago?: "pendiente" | "voucher_subido" | "pagado" | "rechazado" | string;
  voucher?: Voucher;
  total?: number;
};

function toMillis(fecha: any): number {
  if (!fecha) return 0;
  if (fecha instanceof Date) return fecha.getTime();
  if (typeof fecha?.toDate === "function") return fecha.toDate().getTime();
  if (typeof fecha?.seconds === "number") return fecha.seconds * 1000;
  if (typeof fecha === "string") {
    const d = new Date(fecha);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (typeof fecha === "number") return fecha;
  return 0;
}

function normMedioPago(v: any) {
  const mp = String(v ?? "").toLowerCase();
  if (mp === "izipay") return "tarjeta";
  return mp || "desconocido";
}

function normEstadoPago(v: any) {
  return String(v ?? "").toLowerCase();
}

function computeRange(opts: { rangoIndex: number; fechaIni: string; fechaFin: string }) {
  const now = new Date();

  if (opts.rangoIndex === 0) {
    return { from: startOfDay(now).getTime(), to: endOfDay(now).getTime() };
  }
  if (opts.rangoIndex === 1) {
    const from = startOfDay(subDays(now, 6)).getTime();
    const to = endOfDay(now).getTime();
    return { from, to };
  }
  if (opts.rangoIndex === 2) {
    return { from: startOfMonth(now).getTime(), to: endOfMonth(now).getTime() };
  }

  const ini = opts.fechaIni ? startOfDay(new Date(opts.fechaIni)).getTime() : 0;
  const fin = opts.fechaFin ? endOfDay(new Date(opts.fechaFin)).getTime() : Date.now();
  return { from: ini, to: fin };
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildEmptyDaySeries(fromMillis: number, toMillis: number) {
  const labels: string[] = [];
  const map = new Map<string, number>();
  const cur = new Date(fromMillis);
  cur.setHours(0, 0, 0, 0);

  const end = new Date(toMillis);
  end.setHours(0, 0, 0, 0);

  while (cur.getTime() <= end.getTime()) {
    const k = dayKey(cur);
    labels.push(k);
    map.set(k, 0);
    cur.setDate(cur.getDate() + 1);
  }

  return { labels, map };
}

export function usePagosDashboardRange(opts: {
  pedidosCollection: string;
  rangoIndex: number;
  fechaIni: string;
  fechaFin: string;
}) {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoPagoLite[]>([]);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, opts.pedidosCollection),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PedidoPagoLite[];
        setPedidos(rows);
        setLoading(false);
      },
      (err) => {
        console.error("[usePagosDashboardRange] onSnapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [opts.pedidosCollection]);

  const range = useMemo(
    () => computeRange({ rangoIndex: opts.rangoIndex, fechaIni: opts.fechaIni, fechaFin: opts.fechaFin }),
    [opts.rangoIndex, opts.fechaIni, opts.fechaFin]
  );

  // 🔎 Rango por FECHA DE CREACIÓN (fecha). Esto está bien para "operativo de pedidos creados en el rango".
  const inRange = useMemo(() => {
    const { from, to } = range;
    return pedidos.filter((p) => {
      const ms = toMillis(p.fecha);
      return ms >= from && ms <= to;
    });
  }, [pedidos, range]);

  const computed = useMemo(() => {
    let voucherPorRevisar = 0;
    let sinVoucher = 0;
    let efectivoPorCobrar = 0;
    let rechazados = 0;
    let pagados = 0;

    let montoPendiente = 0;

    const { labels, map: pendientesDia } = buildEmptyDaySeries(range.from, range.to);
    const { map: revisaDia } = buildEmptyDaySeries(range.from, range.to);
    const { map: sinVoucherDia } = buildEmptyDaySeries(range.from, range.to);
    const { map: efectivoDia } = buildEmptyDaySeries(range.from, range.to);
    const { map: rechazadosDia } = buildEmptyDaySeries(range.from, range.to);

    for (const p of inRange) {
      const medioPago = normMedioPago(p.medioPago);
      const estadoPago = normEstadoPago(p.estadoPago);
      const pagoConfirmado = !!p.pagoConfirmado;

      const isYapePlin = medioPago === "yape" || medioPago === "plin";
      const total = Number(p.total ?? 0);

      // Voucher robusto (path o uploadedAt)
      const hasVoucher =
        p.voucher?.status === "uploaded" && (!!p.voucher?.path || !!p.voucher?.uploadedAt);

      const isRechazado = estadoPago === "rechazado";

      // ✅ Pagado SOLO si está confirmado o marcado como pagado (NO por medioPago)
      const isPagado = pagoConfirmado || estadoPago === "pagado";

      const isVoucherSubido = estadoPago === "voucher_subido" || hasVoucher;

      const isEfectivoPorCobrar = medioPago === "efectivo" && !isPagado && !isRechazado;
      const isSinVoucher = isYapePlin && !isVoucherSubido && !isPagado && !isRechazado;
      const isVoucherPorRevisar = isYapePlin && isVoucherSubido && !isPagado && !isRechazado;

      const ms = toMillis(p.fecha);
      const k = dayKey(new Date(ms));

      if (isPagado) pagados += 1;

      if (isRechazado) {
        rechazados += 1;
        rechazadosDia.set(k, (rechazadosDia.get(k) ?? 0) + 1);
      }

      if (isEfectivoPorCobrar) {
        efectivoPorCobrar += 1;
        efectivoDia.set(k, (efectivoDia.get(k) ?? 0) + 1);
        montoPendiente += total;
      }

      if (isSinVoucher) {
        sinVoucher += 1;
        sinVoucherDia.set(k, (sinVoucherDia.get(k) ?? 0) + 1);
        montoPendiente += total;
      }

      if (isVoucherPorRevisar) {
        voucherPorRevisar += 1;
        revisaDia.set(k, (revisaDia.get(k) ?? 0) + 1);
        montoPendiente += total;
      }

      const pendienteAny = isEfectivoPorCobrar || isSinVoucher || isVoucherPorRevisar;
      if (pendienteAny) {
        pendientesDia.set(k, (pendientesDia.get(k) ?? 0) + 1);
      }
    }

    const pagosPendientes = voucherPorRevisar + sinVoucher + efectivoPorCobrar;

    const linePendientes = {
      labels,
      datasets: [{ label: "Pendientes", data: labels.map((k) => pendientesDia.get(k) ?? 0) }],
    };

    const barPendientesBreakdown = {
      labels: ["Voucher por revisar", "Sin voucher (Yape/Plin)", "Efectivo por cobrar", "Rechazados"],
      datasets: [
        {
          label: "Cantidad",
          data: [voucherPorRevisar, sinVoucher, efectivoPorCobrar, rechazados],
          backgroundColor: [
            "rgba(34,211,238,0.65)",
            "rgba(251,191,36,0.65)",
            "rgba(16,185,129,0.65)",
            "rgba(244,63,94,0.65)",
          ],
          borderColor: [
            "rgba(34,211,238,0.95)",
            "rgba(251,191,36,0.95)",
            "rgba(16,185,129,0.95)",
            "rgba(244,63,94,0.95)",
          ],
          borderWidth: 1.2,
        },
      ],
    };

    const pieEstadoPago = {
      labels: ["Pagados", "Voucher por revisar", "Sin voucher", "Efectivo por cobrar", "Rechazados"],
      datasets: [
        {
          data: [pagados, voucherPorRevisar, sinVoucher, efectivoPorCobrar, rechazados],
          backgroundColor: [
            "rgba(16,185,129,0.65)",
            "rgba(34,211,238,0.65)",
            "rgba(251,191,36,0.65)",
            "rgba(59,130,246,0.55)",
            "rgba(244,63,94,0.65)",
          ],
          borderColor: [
            "rgba(16,185,129,0.95)",
            "rgba(34,211,238,0.95)",
            "rgba(251,191,36,0.95)",
            "rgba(59,130,246,0.85)",
            "rgba(244,63,94,0.95)",
          ],
          borderWidth: 1.2,
        },
      ],
    };

    return {
      counts: {
        pagosPendientes,
        voucherPorRevisar,
        sinVoucher,
        efectivoPorCobrar,
        rechazados,
        montoPendiente,
        pagados,
      },
      charts: {
        linePendientes,
        barPendientesBreakdown,
        pieEstadoPago,
      },
    };
  }, [inRange, range.from, range.to]);

  return {
    loading,
    range,
    counts: computed.counts,
    charts: computed.charts,
  };
}