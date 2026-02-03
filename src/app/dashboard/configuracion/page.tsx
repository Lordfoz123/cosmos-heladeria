"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { auth, storage } from "@/lib/firebaseConfig";
import { signOut, updateProfile } from "firebase/auth";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { useAuth } from "@/components/auth/AuthProvider";
import { AnimatePresence, motion } from "framer-motion";
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  Pencil,
  Save,
  X,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

function initialsFromUser(displayName?: string | null, email?: string | null) {
  const name = (displayName || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "A";
    const second = parts[1]?.[0] ?? (parts[0]?.[1] ?? "");
    return (first + second).toUpperCase();
  }

  const e = (email || "").trim();
  if (e) {
    const local = e.split("@")[0] || "A";
    return (local.slice(0, 2) || "A").toUpperCase();
  }

  return "A";
}

function withThemeTransition(run: () => void) {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  run();
  window.setTimeout(() => root.classList.remove("theme-transition"), 260);
}

function getExtFromType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export default function ConfiguracionPage() {
  const router = useRouter();

  // ✅ importante: refreshUser para que Header cambie sin recargar
  const { user, refreshUser } = useAuth();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const effective = resolvedTheme ?? theme;

  const email = user?.email ?? "";
  const displayName = user?.displayName ?? "";
  const photoURL = user?.photoURL ?? "";

  const initials = useMemo(
    () => initialsFromUser(displayName, email),
    [displayName, email]
  );

  const titleName = displayName || (email ? email.split("@")[0] : "Invitado");

  // --- Edit name ---
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(titleName);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setNameDraft(titleName);
  }, [titleName]);

  async function saveName() {
    if (!auth.currentUser) return;
    const nextName = nameDraft.trim();
    if (!nextName) return toast.error("El nombre no puede estar vacío.");

    try {
      setSavingName(true);
      await updateProfile(auth.currentUser, { displayName: nextName });

      // ✅ fuerza re-render global (Header, etc.)
      await refreshUser();

      toast.success("Nombre actualizado.");
      setEditNameOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar el nombre.");
    } finally {
      setSavingName(false);
    }
  }

  // --- Upload avatar ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editPhotoOpen, setEditPhotoOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  function onPickPhotoClick() {
    fileInputRef.current?.click();
  }

  function onFileSelected(file: File | null) {
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato inválido. Usa JPG/PNG/WEBP.");
      return;
    }

    const maxBytes = 1 * 1024 * 1024; // 1MB
    if (file.size > maxBytes) {
      toast.error("La imagen es muy grande. Máx 1MB.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  async function savePhoto() {
    if (!auth.currentUser || !user) return;
    if (!photoFile) return toast.error("Selecciona una foto primero.");

    try {
      setSavingPhoto(true);

      const ext = getExtFromType(photoFile.type);
      const path = `users/${user.uid}/avatar.${ext}`;
      const fileRef = storageRef(storage, path);

      await uploadBytes(fileRef, photoFile, {
        contentType: photoFile.type,
        cacheControl: "public,max-age=3600",
      });

      const url = await getDownloadURL(fileRef);

      await updateProfile(auth.currentUser, { photoURL: url });

      // ✅ fuerza re-render global (Header, etc.)
      await refreshUser();

      toast.success("Foto actualizada.");
      setEditPhotoOpen(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo subir la foto.");
    } finally {
      setSavingPhoto(false);
    }
  }

  // --- Logout modal ---
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function doLogout() {
    try {
      setLoggingOut(true);
      await signOut(auth);
      router.replace("/login");
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  }

  const inputClass =
    "border border-border/60 rounded-xl px-4 py-3 bg-background w-full shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-ring text-base transition placeholder:text-muted-foreground";

  const cardShadow = "shadow-[0_8px_28px_-18px_rgba(0,0,0,0.65)]";

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12 pt-6 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preferencias de cuenta y apariencia.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Perfil */}
        <div
          className={cn(
            "rounded-2xl border border-border/60 bg-card text-card-foreground p-6",
            cardShadow
          )}
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full overflow-hidden border border-border/60 bg-muted grid place-items-center">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt={titleName}
                  className="h-full w-full object-cover"
                />
              ) : photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoURL}
                  alt={titleName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-extrabold text-foreground">
                  {initials}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-foreground truncate">
                {titleName}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {email || "Sin sesión"}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full p-2 border border-border/60 bg-muted/40 hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => {
                  setEditNameOpen(true);
                  setEditPhotoOpen(false);
                }}
                disabled={!user}
                title="Editar nombre"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                type="button"
                className="rounded-full p-2 border border-border/60 bg-muted/40 hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => {
                  setEditPhotoOpen(true);
                  setEditNameOpen(false);
                }}
                disabled={!user}
                title="Cambiar foto"
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Edit name */}
          <AnimatePresence initial={false}>
            {editNameOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22, ease: [0.24, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold text-foreground">
                      Editar nombre
                    </div>
                    <button
                      type="button"
                      className="rounded-full p-1.5 hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring"
                      onClick={() => setEditNameOpen(false)}
                      disabled={savingName}
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      className={inputClass}
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Tu nombre"
                      autoComplete="name"
                    />
                    <button
                      type="button"
                      onClick={saveName}
                      disabled={!user || savingName}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-extrabold shadow-sm transition-all",
                        "bg-primary hover:bg-primary/90 text-primary-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                        savingName ? "opacity-60 cursor-not-allowed" : ""
                      )}
                    >
                      <Save className="h-4 w-4" />
                      {savingName ? "Guardando..." : "Guardar"}
                    </button>
                  </div>

                  <div className="text-xs text-muted-foreground mt-2">
                    Esto actualiza tu nombre en Firebase Auth (displayName).
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload photo */}
          <AnimatePresence initial={false}>
            {editPhotoOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22, ease: [0.24, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold text-foreground">
                      Cambiar foto
                    </div>
                    <button
                      type="button"
                      className="rounded-full p-1.5 hover:bg-muted transition focus:outline-none focus:ring-2 focus:ring-ring"
                      onClick={() => {
                        setEditPhotoOpen(false);
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      disabled={savingPhoto}
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        onFileSelected(e.target.files?.[0] ?? null)
                      }
                    />

                    <button
                      type="button"
                      onClick={onPickPhotoClick}
                      disabled={!user || savingPhoto}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-extrabold shadow-sm transition-all",
                        "bg-muted hover:bg-muted/80 text-foreground border border-border/60",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                        savingPhoto ? "opacity-60 cursor-not-allowed" : ""
                      )}
                    >
                      <Upload className="h-4 w-4" />
                      Elegir archivo
                    </button>

                    <div className="text-xs text-muted-foreground">
                      Máx 1MB. Recomendado: cuadrada (1:1).
                    </div>

                    <button
                      type="button"
                      onClick={savePhoto}
                      disabled={!user || savingPhoto || !photoFile}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-extrabold shadow-sm transition-all",
                        "bg-primary hover:bg-primary/90 text-primary-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                        savingPhoto ? "opacity-60 cursor-not-allowed" : ""
                      )}
                    >
                      <Save className="h-4 w-4" />
                      {savingPhoto ? "Subiendo..." : "Guardar foto"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tema */}
        <div
          className={cn(
            "rounded-2xl border border-border/60 bg-card text-card-foreground p-6",
            cardShadow
          )}
        >
          <div className="font-extrabold text-foreground mb-1">Apariencia</div>
          <div className="text-sm text-muted-foreground mb-4">
            Elige cómo se verá el sistema.
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => withThemeTransition(() => setTheme("system"))}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                theme === "system"
                  ? "bg-primary text-primary-foreground border-primary/30"
                  : "bg-muted/40 border-border/60 hover:border-primary/40"
              )}
            >
              <Monitor className="h-5 w-5" />
              <div className="text-left">
                <div className="font-extrabold leading-tight">Sistema</div>
                <div
                  className={cn(
                    "text-xs",
                    theme === "system"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  Usa el modo del dispositivo ({effective ?? "—"})
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => withThemeTransition(() => setTheme("light"))}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                theme === "light"
                  ? "bg-primary text-primary-foreground border-primary/30"
                  : "bg-muted/40 border-border/60 hover:border-primary/40"
              )}
            >
              <Sun className="h-5 w-5" />
              <div className="text-left">
                <div className="font-extrabold leading-tight">Claro</div>
                <div
                  className={cn(
                    "text-xs",
                    theme === "light"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  Forzar modo claro
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => withThemeTransition(() => setTheme("dark"))}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                theme === "dark"
                  ? "bg-primary text-primary-foreground border-primary/30"
                  : "bg-muted/40 border-border/60 hover:border-primary/40"
              )}
            >
              <Moon className="h-5 w-5" />
              <div className="text-left">
                <div className="font-extrabold leading-tight">Oscuro</div>
                <div
                  className={cn(
                    "text-xs",
                    theme === "dark"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  Forzar modo oscuro
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Sesión */}
        <div
          className={cn(
            "rounded-2xl border border-border/60 bg-card text-card-foreground p-6 md:col-span-2",
            cardShadow
          )}
        >
          <div className="font-extrabold text-foreground mb-1">Sesión</div>
          <div className="text-sm text-muted-foreground mb-4">
            Controla tu acceso al sistema.
          </div>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-6 py-2 font-bold shadow-sm transition-all duration-200",
              "bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive/20",
              "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            disabled={!user}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Modal confirm (misma línea gráfica) */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            onClick={() => (loggingOut ? null : setConfirmOpen(false))}
          >
            <motion.div
              className="bg-card text-card-foreground w-full max-w-md rounded-2xl shadow-2xl relative border border-border/60 p-0"
              initial={{ opacity: 0, y: 38, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 35, scale: 0.97 }}
              transition={{
                duration: 0.32,
                type: "spring",
                damping: 20,
                stiffness: 210,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-5 right-7 text-2xl text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                onClick={() => setConfirmOpen(false)}
                aria-label="Cerrar"
                type="button"
                disabled={loggingOut}
              >
                ×
              </button>

              <div className="p-7">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20 p-2">
                    <LogOut className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-extrabold text-xl text-foreground">
                      ¿Cerrar sesión?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vas a salir del panel. Luego tendrás que iniciar sesión de
                      nuevo.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className={[
                      "px-5 py-2 rounded-full font-bold shadow-sm transition-all duration-200",
                      "bg-muted hover:bg-muted/80 text-foreground border border-border/60",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      loggingOut ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                    onClick={() => setConfirmOpen(false)}
                    disabled={loggingOut}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className={[
                      "px-5 py-2 rounded-full font-bold shadow-sm transition-all duration-200",
                      "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      loggingOut ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                    onClick={doLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? "Cerrando..." : "Sí, cerrar sesión"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}