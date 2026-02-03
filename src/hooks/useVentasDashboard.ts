"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import {
  addDays,
  endOfDay,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";

function toDate(ts: any) {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  if (typeof ts === "string") return parseISO(ts);
  return null;
}

function isValidDate(d: any): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

export const rangos = [
  {
    label: "Hoy",
    get: () => {
      const ini = startOfDay(new Date());
      const fin = endOfDay(new Date());
      return [ini, fin] as const;
    },
  },
  {
    label: "Últimos 7 días",
    get: () => {
      const fin = endOfDay(new Date());
      const ini = startOfDay(subDays(fin, 6));
      return [ini, fin] as const;
    },
  },
  {
    label: "Este mes",
    get: () => {
      const now = new Date();
      const ini = new Date(now.getFullYear(), now.getMonth(), 1);
      const fin = endOfDay(new Date());
      return [ini, fin] as const;
    },
  },
  { label: "Personalizado", get: null },
] as const;

type UseVentasParams = {
  pedidosCollection?: string;

  // modo entregadas (legacy)
  estadoField?: string;
  entregadoValue?: string;

  // fechas
  fechaField?: string; // fecha de creación del pedido
  fechaPagoField?: string; // fecha de confirmación de pago (recomendado)

  // pago confirmado
  pagoConfirmadoField?: string;
  pagoConfirmadoValue?: boolean;

  // campos base
  totalField?: string;
  productosField?: string;
  medioPagoField?: string;

  // comportamiento
  modo?: "pagadas" | "entregadas";

  rangoIndex: number;
  fechaIni: string; // yyyy-MM-dd
  fechaFin: string; // yyyy-MM-dd
};

export function useVentasDashboard({
  pedidosCollection = "pedidos",

  // legacy entregadas
  estadoField = "estado",
  entregadoValue = "entregado",

  // fechas
  fechaField = "fecha",
  fechaPagoField = "pagoConfirmadoAt",

  // pago confirmado
  pagoConfirmadoField = "pagoConfirmado",
  pagoConfirmadoValue = true,

  // campos base
  totalField = "total",
  productosField = "productos",
  medioPagoField = "medioPago",

  // comportamiento
  modo = "pagadas",

  rangoIndex,
  fechaIni,
  fechaFin,
}: UseVentasParams) {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { ini, fin } = useMemo(() => {
    let ini: Date, fin: Date;

    if (rangoIndex < 3) {
      [ini, fin] = rangos[rangoIndex].get!();
    } else {
      // ✅ evita problemas de timezone con new Date("YYYY-MM-DD")
      ini = startOfDay(parseISO(fechaIni));
      fin = endOfDay(parseISO(fechaFin));
    }

    return { ini, fin };
  }, [rangoIndex, fechaIni, fechaFin]);

  // ✅ para rango: en pagadas preferimos pagoConfirmadoAt; si no existe en el doc,
  // el query NO lo devolverá (porque el where requiere que exista). Por eso es importante
  // que al aprobar pago siempre se escriba pagoConfirmadoAt.
  const rangeField = modo === "pagadas" ? fechaPagoField : fechaField;

  // ✅ key estable: evita error "changed size between renders"
  const listenerKey = useMemo(() => {
    return [
      pedidosCollection,
      modo,

      // legacy entregadas
      estadoField,
      entregadoValue,

      // pagadas
      pagoConfirmadoField,
      String(pagoConfirmadoValue),

      // fechas
      fechaField,
      fechaPagoField,
      rangeField,

      // rango
      rangoIndex,
      fechaIni,
      fechaFin,
      ini.getTime(),
      fin.getTime(),
    ].join("|");
  }, [
    pedidosCollection,
    modo,
    estadoField,
    entregadoValue,
    pagoConfirmadoField,
    pagoConfirmadoValue,
    fechaField,
    fechaPagoField,
    rangeField,
    rangoIndex,
    fechaIni,
    fechaFin,
    ini,
    fin,
  ]);

  useEffect(() => {
    setLoading(true);

    if (!isValidDate(ini) || !isValidDate(fin)) {
      console.warn("[useVentasDashboard] Rango inválido:", {
        ini,
        fin,
        rangoIndex,
        fechaIni,
        fechaFin,
      });
      setVentas([]);
      setLoading(false);
      return;
    }

    let unsub: undefined | (() => void);

    try {
      const q =
        modo === "pagadas"
          ? query(
              collection(db, pedidosCollection),
              where(pagoConfirmadoField, "==", pagoConfirmadoValue),
              where(rangeField, ">=", Timestamp.fromDate(ini)),
              where(rangeField, "<=", Timestamp.fromDate(fin))
            )
          : query(
              collection(db, pedidosCollection),
              where(estadoField, "==", entregadoValue),
              where(rangeField, ">=", Timestamp.fromDate(ini)),
              where(rangeField, "<=", Timestamp.fromDate(fin))
            );

      unsub = onSnapshot(
        q,
        (snap) => {
          const arr = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((p) => {
              // Seguridad extra: filtra en JS por si hay datos con tipos raros
              const f = toDate(p[rangeField] ?? p[fechaField]);
              return f && !isBefore(f, ini) && !isAfter(f, fin);
            });

          setVentas(arr);
          setLoading(false);
        },
        (err) => {
          console.error("[useVentasDashboard] onSnapshot error:", err);
          setLoading(false);
        }
      );
    } catch (e) {
      console.error("[useVentasDashboard] Error creando listener:", e);
      setLoading(false);
    }

    return () => {
      unsub?.();
    };
  }, [listenerKey]);

  const total = useMemo(
    () => ventas.reduce((acc, v) => acc + (Number(v[totalField]) || 0), 0),
    [ventas, totalField]
  );

  const nPedidos = ventas.length;

  const totUnidades = useMemo(() => {
    return ventas.reduce((a, v) => {
      const prods = Array.isArray(v[productosField]) ? v[productosField] : [];
      const sum = prods.reduce((s: number, p: any) => s + (Number(p.cantidad) || 1), 0);
      return a + sum;
    }, 0);
  }, [ventas, productosField]);

  const ticketPromedio = nPedidos > 0 ? total / nPedidos : 0;

  const { fechasLabels, ventasPorDia } = useMemo(() => {
    const map: Record<string, number> = {};

    ventas.forEach((v) => {
      const f = toDate(v[rangeField] ?? v[fechaField]);
      if (!f) return;
      const key = format(f, "yyyy-MM-dd");
      map[key] = (map[key] || 0) + (Number(v[totalField]) || 0);
    });

    // ✅ Labels siempre cubren todo el rango seleccionado (incluye días 0)
    const labels: string[] = [];
    let cur = startOfDay(ini);
    const end = startOfDay(fin);

    while (cur <= end) {
      labels.push(format(cur, "yyyy-MM-dd"));
      cur = addDays(cur, 1);
    }

    return { fechasLabels: labels, ventasPorDia: labels.map((d) => map[d] || 0) };
  }, [ventas, rangeField, fechaField, totalField, ini, fin]);

  const ventasDayChart = useMemo(
    () => ({
      labels: fechasLabels,
      datasets: [
        {
          label: "Ventas S/",
          data: ventasPorDia,
          fill: true,
          backgroundColor: "rgba(37,82,133,0.07)",
          borderColor: "#255285",
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#33df89",
        },
      ],
    }),
    [fechasLabels, ventasPorDia]
  );

  const { barData, pieData } = useMemo(() => {
    const productosVendidos: Record<string, number> = {};

    ventas.forEach((v) => {
      const prods = Array.isArray(v[productosField]) ? v[productosField] : [];
      prods.forEach((p: any) => {
        const key = `${p.nombre ?? "Producto"}${p.tamaño ? ` (${p.tamaño})` : ""}`;
        productosVendidos[key] = (productosVendidos[key] || 0) + (Number(p.cantidad) || 1);
      });
    });

    const topProds = Object.entries(productosVendidos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const barData = {
      labels: topProds.map(([k]) => k),
      datasets: [
        {
          label: "Unidades vendidas",
          data: topProds.map(([_, v]) => v),
          backgroundColor: "#33df89",
        },
      ],
    };

    const medios: Record<string, number> = {};
    ventas.forEach((v) => {
      let mp = String(v[medioPagoField] ?? "—").toLowerCase();
      if (mp === "izipay") mp = "tarjeta";
      medios[mp] = (medios[mp] || 0) + 1;
    });

    const methodColors: Record<string, string> = {
      yape: "#730dc1",
      plin: "#9ecfff",
      efectivo: "#33df89",
      tarjeta: "#18355e",
      culqi: "#f9b579",
      paypal: "#232B92",
      otro: "#255285",
    };

    const pieData = {
      labels: Object.keys(medios),
      datasets: [
        {
          data: Object.values(medios),
          backgroundColor: Object.keys(medios).map((k) => methodColors[k] || methodColors.otro),
        },
      ],
    };

    return { barData, pieData };
  }, [ventas, productosField, medioPagoField]);

  const ventasHoy = useMemo(() => {
    const now = new Date();
    const iniH = startOfDay(now);
    const finH = endOfDay(now);

    return ventas
      .filter((v) => {
        const f = toDate(v[rangeField] ?? v[fechaField]);
        return f && !isBefore(f, iniH) && !isAfter(f, finH);
      })
      .reduce((acc, v) => acc + (Number(v[totalField]) || 0), 0);
  }, [ventas, rangeField, fechaField, totalField]);

  return {
    ventas,
    loading,
    ini,
    fin,
    stats: { total, nPedidos, totUnidades, ticketPromedio, ventasHoy },
    charts: { ventasDayChart, barData, pieData },
  };
}