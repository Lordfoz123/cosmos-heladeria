"use client";

import { useCarrito } from "@/components/CarritoContext";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import confetti from "canvas-confetti";

// Regiones Perú
const PERU_REGIONES = [
  "Amazonas",
  "Áncash",
  "Apurímac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Callao",
  "Cusco",
  "Huancavelica",
  "Huánuco",
  "Ica",
  "Junín",
  "La Libertad",
  "Lambayeque",
  "Lima",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "San Martín",
  "Tacna",
  "Tumbes",
  "Ucayali",
];

// --- Inputs flotantes
function InputFloating({
  value,
  label,
  type = "text",
  onChange,
  name = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="relative mt-1">
      <input
        className={[
          "peer w-full rounded-lg border px-4 py-3 pt-5 text-base focus:outline-none",
          "border-border/60 bg-background text-foreground",
          "focus:border-primary focus:ring-2 focus:ring-ring",
        ].join(" ")}
        type={type}
        value={value}
        name={name}
        autoComplete="off"
        onChange={onChange}
        placeholder=" "
        {...rest}
      />
      <label
        className={[
          "absolute left-4 top-3 px-1 pointer-events-none transition-all duration-200",
          "bg-background text-muted-foreground",
          value ? "-translate-y-4 text-xs text-primary" : "text-base",
          "peer-focus:-translate-y-4 peer-focus:text-xs peer-focus:text-primary",
        ].join(" ")}
      >
        {label}
      </label>
    </div>
  );
}

function TextareaFloating({
  value,
  label,
  onChange,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  label: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="relative mt-1">
      <textarea
        className={[
          "peer w-full rounded-lg border px-4 py-3 text-base min-h-[48px] resize-none focus:outline-none",
          "border-border/60 bg-background text-foreground",
          "focus:border-primary focus:ring-2 focus:ring-ring",
        ].join(" ")}
        value={value}
        onChange={onChange}
        placeholder=" "
        {...rest}
      />
      <label
        className={[
          "absolute left-4 top-3 px-1 pointer-events-none transition-all duration-200",
          "bg-background text-muted-foreground",
          value ? "-translate-y-4 text-xs text-primary" : "text-base",
          "peer-focus:-translate-y-4 peer-focus:text-xs peer-focus:text-primary",
        ].join(" ")}
      >
        {label}
      </label>
    </div>
  );
}

function SelectLabel({
  value,
  label,
  onChange,
  options,
  ...rest
}: {
  value: string;
  label: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1 mt-1">
      <label className="text-muted-foreground text-base font-medium mb-1">{label}</label>
      <select
        className={[
          "w-full rounded-lg border px-4 py-3 text-base focus:outline-none appearance-none",
          "border-border/60 bg-background text-foreground",
          "focus:border-primary focus:ring-2 focus:ring-ring",
          value ? "text-foreground" : "text-muted-foreground",
        ].join(" ")}
        value={value}
        onChange={onChange}
        required
        {...rest}
      >
        <option value="" disabled>
          Selecciona región
        </option>
        {options.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- Métodos de pago
const METODOS = [
  {
    key: "yape",
    nombre: "Yape",
    logo: "https://fullframe-design.com/wp-content/uploads/2025/12/yape-app-logo-png_seeklogo-399697.png",
  },
  {
    key: "plin",
    nombre: "Plin",
    logo: "https://fullframe-design.com/wp-content/uploads/2025/12/plin-logo-png_seeklogo-386806.png",
  },
  {
    key: "izipay",
    nombre: "Tarjeta (Izipay)",
    logo: "https://fullframe-design.com/wp-content/uploads/2026/01/unnamed.png",
  },
];

function FormularioIzipay({
  total,
  onResult,
  enviando,
}: {
  total: number;
  onResult: (result: { ok: boolean; msg?: string }) => void;
  enviando: boolean;
}) {
  const [numTarjeta, setNumTarjeta] = useState("");
  const [expira, setExpira] = useState("");
  const [cvv, setCvv] = useState("");
  const [nombre, setNombre] = useState("");

  async function handlePago(e: React.FormEvent) {
    e.preventDefault();

    // En producción: aquí NO confirmes pago en cliente.
    // Debes llamar a tu backend, y tu backend confirma con Izipay.
    onResult({ ok: false });

    try {
      setTimeout(() => {
        onResult({ ok: true });
      }, 1200);
    } catch (err: any) {
      onResult({ ok: false, msg: err?.message || "Error realizando el pago" });
    }
  }

  return (
    <form
      onSubmit={handlePago}
      className="bg-card text-card-foreground p-4 rounded-xl shadow border border-border/60 mb-4 flex flex-col gap-3"
    >
      <h3 className="text-primary font-bold text-lg mb-2 flex gap-2 items-center">
        <img
          src="https://fullframe-design.com/wp-content/uploads/2026/01/credit-card-pay.svg"
          alt="Izipay"
          className="w-8 h-8 inline mr-1"
        />
        Tarjeta (Izipay)
      </h3>

      <input
        type="text"
        maxLength={16}
        required
        disabled={enviando}
        className="border border-border/60 bg-background text-foreground rounded-lg px-4 py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Número de tarjeta"
        value={numTarjeta}
        onChange={(e) => setNumTarjeta(e.target.value.replace(/\D/g, ""))}
      />

      <div className="flex gap-2">
        <input
          type="text"
          maxLength={5}
          required
          disabled={enviando}
          className="border border-border/60 bg-background text-foreground rounded-lg px-4 py-2 text-lg font-mono w-24 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="MM/YY"
          value={expira}
          onChange={(e) => setExpira(e.target.value)}
        />
        <input
          type="text"
          maxLength={4}
          required
          disabled={enviando}
          className="border border-border/60 bg-background text-foreground rounded-lg px-4 py-2 text-lg font-mono w-20 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="CVV"
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
        />
      </div>

      <input
        type="text"
        required
        disabled={enviando}
        className="border border-border/60 bg-background text-foreground rounded-lg px-4 py-2 text-base mb-2 focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Nombre en la tarjeta"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <button
        type="submit"
        className="bg-emerald-600 text-white py-2 rounded-xl font-bold text-lg shadow-md hover:scale-[1.02] transition disabled:opacity-60"
        disabled={enviando}
      >
        {enviando ? "Procesando..." : `Pagar S/${total.toFixed(2)}`}
      </button>
    </form>
  );
}

function generateAccessToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

function getPrecioPorTamano(prod: any, tam: string): number {
  const map = prod?.preciosPorTamano ?? prod?.preciosPorTamaño;
  const v = map?.[tam];
  if (Number.isFinite(Number(v)) && Number(v) > 0) return Number(v);

  const legacy = prod?.precio;
  if (Number.isFinite(Number(legacy)) && Number(legacy) > 0) return Number(legacy);

  return 0;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { carrito, limpiarCarrito } = useCarrito();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [region, setRegion] = useState("");
  const [notas, setNotas] = useState("");
  const [alergias, setAlergias] = useState("");
  const [metodo, setMetodo] = useState("yape");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confetiRef = useRef(false);
  const savingRef = useRef(false);

  const totalCalculado = useMemo(() => {
    return (carrito ?? []).reduce((acc, item: any) => {
      const unit = getPrecioPorTamano(item.producto, item.tamaño);
      const qty = Number(item.cantidad) || 0;
      return acc + unit * qty;
    }, 0);
  }, [carrito]);

  async function guardarPedido(_opts: { pagoFlow: "voucher" | "izipay"; pagoConfirmadoCliente: boolean }) {
    setError(null);

    if (!nombre || !email || !telefono || !direccion || !region) {
      setError("Completa todos los campos requeridos.");
      return;
    }
    if (!/^\d{9}$/.test(telefono)) {
      setError("WhatsApp debe tener 9 dígitos.");
      return;
    }
    if (carrito.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    if (savingRef.current) return;
    savingRef.current = true;

    setEnviando(true);

    try {
      const now = Timestamp.now();
      const accessToken = generateAccessToken();

      const productos = carrito.map((item: any) => {
        const precioUnit = getPrecioPorTamano(item.producto, item.tamaño);
        return {
          productoId: String(item.producto.id),
          nombre: String(item.producto.nombre),
          imagen: item.producto.imagen || "",
          tamaño: String(item.tamaño),
          cantidad: Number(item.cantidad) || 0,
          precioUnit,
        };
      });

      const total = totalCalculado;

      const estadoPago = _opts.pagoFlow === "izipay" ? "pendiente_confirmacion" : "pendiente_voucher";

      const docRef = await addDoc(collection(db, "pedidos"), {
        productos,
        total,
        nombreCliente: nombre,
        email,
        telefono,
        direccion,
        region,
        notas,
        alergias,
        medioPago: metodo,
        pagoConfirmado: false,
        estadoPago,
        fecha: now,
        estado: "en espera",
        historial: [{ fecha: now, estado: "en espera", usuario: "cliente" }],
        orden: Date.now(),
        accessToken,
        voucher: { status: "none", path: "", uploadedAt: null },
      });

      limpiarCarrito();
      toast.success("¡Pedido realizado con éxito!");

      if (!confetiRef.current) {
        confetiRef.current = true;
        confetti({
          angle: 90,
          spread: 70,
          origin: { y: 0.6 },
          particleCount: 100,
          colors: ["#255285", "#33df89", "#f9b579", "#fff"],
        });
        setTimeout(() => (confetiRef.current = false), 1400);
      }

      setTimeout(() => {
        router.push(`/pedido/${docRef.id}/voucher?t=${encodeURIComponent(accessToken)}`);
      }, 500);
    } catch {
      setError("Error al guardar. Inténtalo nuevamente.");
    } finally {
      setEnviando(false);
      savingRef.current = false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (metodo === "izipay") return; // lo maneja el form
    guardarPedido({ pagoFlow: "voucher", pagoConfirmadoCliente: false });
  }

  function onIzipayResult({ ok, msg }: { ok: boolean; msg?: string }) {
    if (ok) {
      toast.success("Pago iniciado (Izipay).");
      guardarPedido({ pagoFlow: "izipay", pagoConfirmadoCliente: true });
    } else {
      setEnviando(false);
      if (msg) toast.error(msg);
    }
  }

  return (
    <main className="max-w-4xl mx-auto py-10 px-3 grid grid-cols-1 lg:grid-cols-2 gap-10 min-h-[90vh] bg-background text-foreground">
      <Toaster position="top-center" />

      <section>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight mb-5">Datos para tu pedido</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputFloating value={nombre} label="Nombre completo" onChange={(e) => setNombre(e.target.value)} />
          <InputFloating
            value={email}
            label="Correo electrónico"
            type="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputFloating
            value={telefono}
            label="WhatsApp (9 dígitos)"
            maxLength={9}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
          />
          <InputFloating value={direccion} label="Dirección" onChange={(e) => setDireccion(e.target.value)} />
          <SelectLabel
            value={region}
            label="Región/Provincia"
            onChange={(e) => setRegion(e.target.value)}
            options={PERU_REGIONES}
          />

          <TextareaFloating
            value={alergias}
            label="¿Alergias alimentarias o restricciones? (opcional)"
            maxLength={100}
            onChange={(e) => setAlergias(e.target.value)}
          />
          <TextareaFloating
            value={notas}
            label="Notas (opcional)"
            maxLength={200}
            onChange={(e) => setNotas(e.target.value)}
          />

          <div>
            <label className="block font-semibold text-primary mb-2 mt-1">Método de pago</label>
            <div className="flex gap-4 w-full">
              {METODOS.map((m) => (
                <button
                  type="button"
                  key={m.key}
                  className={[
                    "flex flex-col items-center px-4 py-2 rounded-xl border cursor-pointer transition-all grow",
                    metodo === m.key
                      ? "border-primary shadow-md bg-muted scale-[1.02]"
                      : "border-border/60 bg-card opacity-80 hover:border-primary",
                  ].join(" ")}
                  onClick={() => setMetodo(m.key)}
                  tabIndex={0}
                >
                  <img src={m.logo} alt={m.nombre} className="w-11 h-11 object-contain mb-1" />
                  <span className={["font-semibold text-[15px]", metodo === m.key ? "text-primary" : "text-foreground"].join(" ")}>
                    {m.nombre}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {metodo === "izipay" ? (
            <FormularioIzipay total={totalCalculado} enviando={enviando} onResult={onIzipayResult} />
          ) : (
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-xl font-bold py-3 mt-2 shadow hover:opacity-95 transition text-lg disabled:opacity-60"
              disabled={enviando}
            >
              {enviando ? "Procesando..." : "Realizar el pedido"}
            </button>
          )}

          {error && <div className="mt-1 text-destructive font-semibold">{error}</div>}
        </form>
      </section>

      {/* Resumen */}
      <aside className="bg-card text-card-foreground p-7 rounded-2xl shadow border border-border/60 w-full max-w-[380px] mx-auto flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-1 text-primary">Tu pedido</h2>
        <p className="text-xs text-muted-foreground mb-2">¡Qué rico, ya casi es tuyo!</p>

        <div className="flex flex-col gap-3">
          {carrito.length === 0 ? (
            <div className="text-center text-lg py-14 text-muted-foreground">
              Tu carrito está vacío.
              <br />
              <a href="/tienda" className="text-primary font-bold underline">
                Volver a la tienda
              </a>
            </div>
          ) : (
            carrito.map((item: any, idx: number) => {
              const precioUnit = getPrecioPorTamano(item.producto, item.tamaño);
              return (
                <div
                  key={idx}
                  className="flex gap-3 items-center border-b border-border/60 pb-3 last:border-none last:pb-0 relative group"
                >
                  <img
                    src={item.producto.imagen}
                    alt={item.producto.nombre}
                    className="w-14 h-14 rounded-xl object-cover border border-border/60 shadow-sm hover:scale-[1.02] transition-transform"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-primary flex items-center gap-2">
                      {item.producto.nombre}{" "}
                      <span className="text-xs text-muted-foreground">x{item.cantidad}</span>
                      {item.producto.oferta && (
                        <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 ml-1 rounded font-semibold">
                          Oferta
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-primary font-bold">{item.tamaño}</div>
                    {item.producto.descripcion && (
                      <div className="text-xs text-muted-foreground">{item.producto.descripcion}</div>
                    )}
                  </div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-base flex items-center gap-1">
                    {item.producto.oferta && <span className="text-[16px]">🔥</span>}S/{precioUnit.toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {carrito.length > 0 && (
          <>
            <hr className="border-border/60" />
            <div className="text-sm flex flex-col gap-2 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-bold text-foreground">S/{totalCalculado.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[18px]">
                  S/{totalCalculado.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
      </aside>
    </main>
  );
}