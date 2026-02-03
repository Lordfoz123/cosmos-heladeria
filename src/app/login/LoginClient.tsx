"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebaseConfig";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

type Tab = "cliente" | "admin";
type EmailMode = "login" | "register";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";
  const { user, loading } = useAuth();

  const [tab, setTab] = useState<Tab>("cliente");

  // Cliente: email sheet/form
  const [clienteEmailOpen, setClienteEmailOpen] = useState(false);
  const [clienteEmailMode, setClienteEmailMode] = useState<EmailMode>("login");

  // Campos (reuso para admin también)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const canSubmit = useMemo(() => !submitting, [submitting]);

  useEffect(() => {
    if (!loading && user) {
      toast.dismiss();
      router.replace(next);
    }
  }, [loading, user, router, next]);

  useEffect(() => {
    toast.dismiss();
    return () => toast.dismiss();
  }, []);

  // Si cambias de tab, cerramos el form cliente email (UX)
  useEffect(() => {
    setClienteEmailOpen(false);
    setClienteEmailMode("login");
    setEmail("");
    setPassword("");
  }, [tab]);

  async function onClienteGoogle() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(auth, provider);

      toast.success("¡Bienvenido!", { duration: 1200 });
      setTimeout(() => {
        toast.dismiss();
        router.replace("/tienda");
      }, 350);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo iniciar con Google", {
        duration: 2500,
      });
      setSubmitting(false);
    }
  }

  async function onClienteEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const emailClean = email.trim();

      if (clienteEmailMode === "register") {
        await createUserWithEmailAndPassword(auth, emailClean, password);
        toast.success("Cuenta creada. ¡Bienvenido!", { duration: 1400 });
      } else {
        await signInWithEmailAndPassword(auth, emailClean, password);
        toast.success("Sesión iniciada", { duration: 1200 });
      }

      setTimeout(() => {
        toast.dismiss();
        router.replace("/tienda");
      }, 350);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo continuar con email", {
        duration: 2500,
      });
      setSubmitting(false);
    }
  }

  async function onAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Sesión iniciada", { duration: 1200 });

      setTimeout(() => {
        toast.dismiss();
        router.replace(next);
      }, 350);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo iniciar sesión", {
        duration: 2500,
      });
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100vh] w-full bg-background text-foreground">
      <Toaster position="top-center" />

      <div className="relative min-h-[100vh] w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-1/2 h-[540px] w-[540px] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-[540px] w-[540px] -translate-x-1/2 rounded-full bg-muted/70 blur-3xl" />
        </div>

        <div className="relative min-h-[100vh] w-full">
          <div className="grid min-h-[100vh] w-full grid-cols-1 lg:grid-cols-[1fr_440px]">
            {/* Imagen izquierda */}
            <section className="relative hidden lg:block">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "url(/images/login-space.jpg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/10 to-black/60" />
              <div className="absolute inset-0 bg-transparent dark:bg-black/25" />

              <div className="absolute left-10 top-10">
                <img
                  src="/brand/logo-cosmos-dark.png"
                  alt="Cosmos"
                  className="h-9 w-auto object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
                />

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-white text-xs font-extrabold backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                  Infinitas posibilidades
                </div>
              </div>
            </section>

            {/* Panel derecho */}
            <section
              className={cn(
                "flex items-center justify-center px-5 py-10 border-l",
                "bg-background text-foreground border-border",
                "dark:bg-[#0b0b0c] dark:text-white dark:border-white/10"
              )}
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.35,
                  type: "spring",
                  damping: 18,
                  stiffness: 180,
                }}
                className="w-full max-w-sm"
              >
                <div className="flex justify-center mb-6">
                  <img
                    src="/brand/logo-cosmos.png"
                    alt="Cosmos"
                    className={cn(
                      "h-8 w-auto object-contain",
                      "drop-shadow-none dark:drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
                    )}
                  />
                </div>

                <div className="text-center mb-6">
                  <div className="text-2xl font-extrabold">Inicia sesión</div>
                  <div className="text-sm mt-1 text-muted-foreground dark:text-white/60">
                    Cliente o Administrador/Personal
                  </div>
                </div>

                {/* Tabs */}
                <div
                  className={cn(
                    "mb-5 inline-flex w-full rounded-full p-1.5 shadow-sm gap-2 border",
                    "bg-muted/60 border-border/60",
                    "dark:bg-white/10 dark:border-white/10"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setTab("cliente")}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-full font-extrabold transition",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      tab === "cliente"
                        ? "bg-card text-foreground border border-border/60"
                        : "text-muted-foreground hover:text-foreground",
                      tab === "cliente"
                        ? "dark:bg-white dark:text-black dark:border-white/10"
                        : "dark:text-white/70 dark:hover:text-white"
                    )}
                  >
                    Cliente
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab("admin")}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-full font-extrabold transition",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      tab === "admin"
                        ? "bg-card text-foreground border border-border/60"
                        : "text-muted-foreground hover:text-foreground",
                      tab === "admin"
                        ? "dark:bg-white dark:text-black dark:border-white/10"
                        : "dark:text-white/70 dark:hover:text-white"
                    )}
                  >
                    Admin / Personal
                  </button>
                </div>

                {/* Contenido */}
                {tab === "cliente" ? (
                  <div className="flex flex-col gap-3">
                    <div
                      className={cn(
                        "rounded-2xl border p-4",
                        "border-border/60 bg-muted/40",
                        "dark:border-white/10 dark:bg-white/5"
                      )}
                    >
                      <div className="font-extrabold">Clientes</div>
                      <div className="text-sm mt-1 text-muted-foreground dark:text-white/65">
                        Entra para comprar rápido y ver tus pedidos.
                      </div>
                    </div>

                    {/* Google */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: submitting ? 1 : 1.03 }}
                      whileTap={{ scale: submitting ? 1 : 0.98 }}
                      disabled={submitting}
                      onClick={onClienteGoogle}
                      className={cn(
                        "px-7 py-3 rounded-xl font-extrabold shadow-sm",
                        "transition-all duration-200 text-base flex items-center justify-center gap-3",
                        "border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
                        "bg-card hover:bg-muted text-foreground border-border/60",
                        "dark:bg-white/5 dark:hover:bg-white/10 dark:text-white dark:border-white/10"
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Abriendo Google…
                        </>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "h-9 w-9 rounded-xl grid place-items-center font-extrabold border",
                              "bg-muted text-foreground border-border/60",
                              "dark:bg-white/10 dark:text-white dark:border-white/10"
                            )}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="icon icon-tabler icons-tabler-filled icon-tabler-brand-google"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 2a9.96 9.96 0 0 1 6.29 2.226a1 1 0 0 1 .04 1.52l-1.51 1.362a1 1 0 0 1 -1.265 .06a6 6 0 1 0 2.103 6.836l.001 -.004h-3.66a1 1 0 0 1 -.992 -.883l-.007 -.117v-2a1 1 0 0 1 1 -1h6.945a1 1 0 0 1 .994 .89c.04 .367 .061 .737 .061 1.11c0 5.523 -4.477 10 -10 10s-10 -4.477 -10 -10s4.477 -10 10 -10z" /></svg>
                          </span>
                          Continuar con Google
                        </>
                      )}
                    </motion.button>

                    {/* ✅ Email (botón tipo Google) */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: submitting ? 1 : 1.03 }}
                      whileTap={{ scale: submitting ? 1 : 0.98 }}
                      disabled={submitting}
                      onClick={() => setClienteEmailOpen((v) => !v)}
                      className={cn(
                        "px-7 py-3 rounded-xl font-extrabold shadow-sm",
                        "transition-all duration-200 text-base flex items-center justify-center gap-3",
                        "border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
                        "bg-card hover:bg-muted text-foreground border-border/60",
                        "dark:bg-white/5 dark:hover:bg-white/10 dark:text-white dark:border-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "h-9 w-9 rounded-xl grid place-items-center font-extrabold border",
                          "bg-muted text-foreground border-border/60",
                          "dark:bg-white/10 dark:text-white dark:border-white/10"
                        )}
                      >
                        <Mail className="h-5 w-5" />
                      </span>
                      Continuar con email
                    </motion.button>

                    {/* Formulario email cliente */}
                    {clienteEmailOpen && (
                      <div
                        className={cn(
                          "mt-1 rounded-2xl border p-4",
                          "border-border/60 bg-muted/40",
                          "dark:border-white/10 dark:bg-white/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="font-extrabold">
                            {clienteEmailMode === "login"
                              ? "Iniciar sesión con email"
                              : "Registrarte con email"}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setClienteEmailMode((m) =>
                                m === "login" ? "register" : "login"
                              )
                            }
                            className="text-xs font-bold underline text-muted-foreground hover:text-foreground"
                          >
                            {clienteEmailMode === "login"
                              ? "Registrarme"
                              : "Ya tengo cuenta"}
                          </button>
                        </div>

                        <form onSubmit={onClienteEmailSubmit} className="flex flex-col gap-2">
                          <input
                            className="w-full border border-border/60 rounded-xl px-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Correo"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                          <input
                            className="w-full border border-border/60 rounded-xl px-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Contraseña"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />

                          <motion.button
                            type="submit"
                            whileHover={{ scale: submitting ? 1 : 1.02 }}
                            whileTap={{ scale: submitting ? 1 : 0.98 }}
                            disabled={submitting}
                            className={cn(
                              "mt-2 px-5 py-2.5 rounded-xl font-extrabold shadow-sm",
                              "transition-all duration-200 text-sm flex items-center justify-center gap-2",
                              "focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
                              "bg-primary text-primary-foreground hover:bg-primary/90",
                              "dark:bg-white dark:text-black dark:hover:bg-white/90"
                            )}
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Procesando…
                              </>
                            ) : clienteEmailMode === "login" ? (
                              "Ingresar"
                            ) : (
                              "Crear cuenta"
                            )}
                          </motion.button>
                        </form>
                      </div>
                    )}

                    <div className="text-xs mt-2 text-center text-muted-foreground dark:text-white/45">
                    </div>
                  </div>
                ) : (
                  <form onSubmit={onAdminLogin} className="flex flex-col gap-3">
                    <div>
                      <label className="text-sm font-semibold mb-1 block text-muted-foreground dark:text-white/70">
                        Correo
                      </label>
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-4 py-3 shadow-sm border",
                          "bg-background border-border/60 focus-within:ring-2 focus-within:ring-ring",
                          "dark:bg-white/5 dark:border-white/10 dark:focus-within:ring-white/15"
                        )}
                      >
                        <Mail className="h-4 w-4 text-muted-foreground dark:text-white/55" />
                        <input
                          className="w-full bg-transparent outline-none text-base placeholder:text-muted-foreground dark:placeholder:text-white/40"
                          placeholder="correo@cosmos.com"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-1 block text-muted-foreground dark:text-white/70">
                        Contraseña
                      </label>
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-4 py-3 shadow-sm border",
                          "bg-background border-border/60 focus-within:ring-2 focus-within:ring-ring",
                          "dark:bg-white/5 dark:border-white/10 dark:focus-within:ring-white/15"
                        )}
                      >
                        <Lock className="h-4 w-4 text-muted-foreground dark:text-white/55" />
                        <input
                          className="w-full bg-transparent outline-none text-base placeholder:text-muted-foreground dark:placeholder:text-white/40"
                          placeholder="••••••••"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: submitting ? 1 : 1.03 }}
                      whileTap={{ scale: submitting ? 1 : 0.98 }}
                      disabled={submitting}
                      className={cn(
                        "mt-2 px-7 py-3 rounded-xl font-extrabold shadow-sm",
                        "transition-all duration-200 text-base flex items-center justify-center gap-2",
                        "focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        "dark:bg-white dark:text-black dark:hover:bg-white/90"
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Ingresando…
                        </>
                      ) : (
                        "Ingresar"
                      )}
                    </motion.button>
                  </form>
                )}
              </motion.div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}