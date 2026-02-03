"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db, storage } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";

const WHATSAPP_TIENDA_E164_NO_PLUS = "51965127795";
const ASTRONAUT_URL =
  "https://fullframe-design.com/wp-content/uploads/2026/01/imagen-gracias.png";

type PedidoData = {
  accessToken?: string;
  nombreCliente?: string;
  total?: number;
  estadoPago?: string;
  medioPago?: string;
  voucher?: {
    status?: "none" | "uploaded" | "deleted";
    path?: string;
    uploadedAt?: any;
  };
};

function buildWaMeUrl(phoneE164NoPlus: string, text: string) {
  return `https://wa.me/${phoneE164NoPlus}?text=${encodeURIComponent(text)}`;
}

async function fileToJpegBlob(file: File, quality = 0.82, maxWidth = 1400): Promise<Blob> {
  const img = document.createElement("img");
  img.decoding = "async";
  img.src = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
  });

  const scale = Math.min(1, maxWidth / (img.naturalWidth || maxWidth));
  const w = Math.round((img.naturalWidth || maxWidth) * scale);
  const h = Math.round((img.naturalHeight || maxWidth) * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(img, 0, 0, w, h);

  URL.revokeObjectURL(img.src);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("No se pudo convertir la imagen a JPG"));
        resolve(b);
      },
      "image/jpeg",
      quality
    );
  });

  return blob;
}

type UploadUiState = "idle" | "dragging" | "uploading" | "uploaded" | "error";

function validateImageFile(file: File) {
  const maxMb = 12;
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

  if (!allowed.includes(file.type)) {
    // igual dejamos pasar algunos móviles raros: si empieza con image/
    if (!file.type.startsWith("image/")) {
      throw new Error("Formato inválido. Sube una imagen (JPG/PNG/WebP).");
    }
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > maxMb) throw new Error(`Imagen muy pesada (${sizeMb.toFixed(1)}MB). Máx: ${maxMb}MB.`);
}

export default function VoucherPage() {
  const params = useParams<{ pedidoId: string }>();
  const searchParams = useSearchParams();
  const pedidoId = params?.pedidoId;
  const token = searchParams?.get("t") ?? "";

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [pedido, setPedido] = useState<PedidoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uiState, setUiState] = useState<UploadUiState>("idle");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState("");

  const pedidoCode = useMemo(() => (pedidoId ? pedidoId.slice(-5).toUpperCase() : ""), [pedidoId]);

  const waText = useMemo(() => {
    return `Hola, acabo de subir mi voucher del pedido #${pedidoCode}. ¿Me confirmas por favor?`;
  }, [pedidoCode]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!pedidoId) {
        setError("Pedido inválido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const refPedido = doc(db, "pedidos", pedidoId);
        const snap = await getDoc(refPedido);

        if (!alive) return;

        if (!snap.exists()) {
          setError("Pedido no encontrado.");
          setPedido(null);
          return;
        }

        const data = snap.data() as PedidoData;

        if (!token || token !== data.accessToken) {
          setError("Link inválido o expirado.");
          setPedido(null);
          return;
        }

        setPedido(data);

        const isUploaded = data.voucher?.status === "uploaded" && !!data.voucher?.path;
        setUploaded(isUploaded);
        setUiState(isUploaded ? "uploaded" : "idle");
      } catch (e: any) {
        setError(e?.message || "Error cargando el pedido.");
        setPedido(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [pedidoId, token]);

  const canUpload = !loading && !error && !!pedidoId && !!pedido && !uploading;

  async function handleUpload(file: File) {
    if (!pedidoId || !pedido) return;
    if (uploading) return;

    setError(null);
    setUploading(true);
    setUiState("uploading");
    setFileName(file.name);

    const previousPath = pedido.voucher?.path || "";

    try {
      validateImageFile(file);

      const blob = await fileToJpegBlob(file, 0.82, 1400);
      const newPath = `vouchers/${pedidoId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, newPath);

      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });

      const now = Timestamp.now();
      await updateDoc(doc(db, "pedidos", pedidoId), {
        "voucher.status": "uploaded",
        "voucher.path": newPath,
        "voucher.uploadedAt": now,
        estadoPago: "voucher_subido",
      });

      setPedido((p) =>
        p
          ? {
              ...p,
              estadoPago: "voucher_subido",
              voucher: { ...(p.voucher ?? {}), status: "uploaded", path: newPath, uploadedAt: now },
            }
          : p
      );

      setUploaded(true);
      setUiState("uploaded");

      if (previousPath && previousPath !== newPath) {
        try {
          await deleteObject(ref(storage, previousPath));
        } catch {
          // ignore
        }
      }
    } catch (e: any) {
      setUiState("error");
      setError(e?.message || "No se pudo subir el voucher. Inténtalo nuevamente.");
    } finally {
      setUploading(false);
    }
  }

  function openPicker() {
    if (!canUpload) return;
    inputRef.current?.click();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload) return;

    setUiState(uploaded ? "uploaded" : "idle");

    const f = e.dataTransfer.files?.[0];
    if (f) void handleUpload(f);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload) return;
    if (!uploaded) setUiState("dragging");
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload) return;
    setUiState(uploaded ? "uploaded" : "idle");
  }

  const dropTitle = useMemo(() => {
    if (uiState === "uploading") return "Subiendo voucher…";
    if (uiState === "uploaded") return "Voucher subido ✅";
    if (uiState === "dragging") return "Suelta tu voucher aquí";
    if (uiState === "error") return "No se pudo subir. Intenta nuevamente.";
    return "Arrastra y suelta tu voucher aquí";
  }, [uiState]);

  const dropSubtitle = useMemo(() => {
    if (uiState === "uploading") return "No cierres esta ventana.";
    if (uiState === "uploaded") return "¡Listo! Ya puedes continuar por WhatsApp.";
    if (uiState === "dragging") return "Tip: puede ser captura o foto.";
    if (uiState === "error") return "Puedes intentar otra vez (arrastrando o tocando la tarjeta).";
    return "O toca aquí para seleccionarlo (JPG/PNG).";
  }, [uiState]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] text-white grid place-items-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur-md">
          <h1 className="text-2xl font-extrabold">Cargando…</h1>
          <p className="mt-2 text-white/70">Preparando tu pedido.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.22),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(34,211,238,0.18),transparent_45%)]" />
        <div className="stars absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 py-10">
        <div className="mb-3 mt-2 animate-float">
          <Image
            src={ASTRONAUT_URL}
            alt="Astronauta"
            width={260}
            height={260}
            priority
            className="drop-shadow-[0_20px_35px_rgba(0,0,0,0.45)]"
          />
        </div>

        <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
          <h1 className="text-center text-3xl font-bold leading-tight">¡Gracias por tu compra!</h1>

          {error && (
            <div className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4 text-rose-100 text-sm font-semibold">
              {error}
            </div>
          )}

          {!error && (
            <>
              <p className="mt-3 text-center text-white/80">
                Para continuar, sube tu <b className="text-white">voucher</b> (captura o foto). Cuando termine,
                se activará el botón de WhatsApp.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-white/90">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-white/60">Pedido</div>
                    <div className="text-lg font-extrabold">#{pedidoCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-white/60">Total</div>
                    <div className="text-lg font-extrabold">S/{Number(pedido?.total ?? 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  disabled={!canUpload}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                    e.currentTarget.value = "";
                  }}
                  className="hidden"
                />

                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openPicker();
                  }}
                  onClick={openPicker}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={[
                    "relative w-full rounded-2xl border-2 border-dashed p-6 text-center transition",
                    "outline-none focus:ring-2 focus:ring-cyan-300/60",
                    !canUpload ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                    uiState === "uploaded"
                      ? "border-emerald-400/60 bg-emerald-500/10"
                      : uiState === "error"
                        ? "border-rose-400/60 bg-rose-500/10"
                        : uiState === "dragging"
                          ? "border-cyan-300/70 bg-cyan-500/10"
                          : "border-white/20 bg-black/15 hover:border-white/35 hover:bg-black/25",
                  ].join(" ")}
                >
                  <div className="text-lg font-extrabold">{dropTitle}</div>
                  <div className="mt-1 text-sm text-white/70">{dropSubtitle}</div>

                  <div className="mt-3 text-xs text-white/55">
                    {fileName ? (
                      <>
                        Archivo: <span className="text-white/85 font-semibold">{fileName}</span>
                      </>
                    ) : (
                      "Recomendación: foto clara, sin reflejos."
                    )}
                  </div>

                  {uploading && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                      Subiendo…
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-white/55">
                  Puedes reemplazar el voucher cuando quieras, subiendo otro.
                </p>
              </div>

              <a
                href={uploaded ? buildWaMeUrl(WHATSAPP_TIENDA_E164_NO_PLUS, waText) : "#"}
                onClick={(e) => {
                  if (!uploaded) e.preventDefault();
                }}
                className={[
                  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-extrabold shadow transition",
                  uploaded
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "bg-white/10 text-white/40 cursor-not-allowed",
                ].join(" ")}
                target={uploaded ? "_blank" : undefined}
                rel={uploaded ? "noopener noreferrer" : undefined}
              >
                Contactar por WhatsApp
              </a>

              <div className="mt-3">
                <Link
                  href="/tienda"
                  className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 font-extrabold shadow transition bg-white/10 text-white hover:bg-white/15 border border-white/10"
                >
                  Volver a la tienda
                </Link>
              </div>

              <p className="mt-4 text-center text-xs text-white/55">
                Si te piden reenviar el voucher, vuelve a esta misma pantalla y súbelo nuevamente.
              </p>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .stars {
          background-image: radial-gradient(2px 2px at 20px 30px, rgba(255, 255, 255, 0.32), transparent 40%),
            radial-gradient(1px 1px at 100px 80px, rgba(255, 255, 255, 0.22), transparent 40%),
            radial-gradient(2px 2px at 220px 120px, rgba(255, 255, 255, 0.2), transparent 40%),
            radial-gradient(1px 1px at 340px 200px, rgba(255, 255, 255, 0.16), transparent 40%),
            radial-gradient(2px 2px at 480px 70px, rgba(255, 255, 255, 0.16), transparent 40%),
            radial-gradient(1px 1px at 560px 260px, rgba(255, 255, 255, 0.14), transparent 40%);
          background-size: 600px 320px;
          background-repeat: repeat;
          filter: blur(0.2px);
        }

        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .animate-float {
          animation: float 4.5s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}