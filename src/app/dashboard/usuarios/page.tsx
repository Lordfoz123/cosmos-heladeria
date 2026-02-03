"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import toast from "react-hot-toast";
import {
  Loader2,
  Users,
  ShieldCheck,
  Upload,
  UserPlus,
  RefreshCcw,
  Trash2,
  Power,
  Pencil,
  X,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebaseConfig";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "logistica", label: "Logística" },
  { value: "cocina", label: "Cocina" },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

type UserRow = {
  uid: string;
  email: string;
  displayName?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  telefono?: string | null;
  role?: string | null;
  photoURL?: string | null;
  active?: boolean;
  disabled?: boolean;
  createdAt?: string;
};

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function GestionUsuariosPage() {
  const { loading, isAdmin } = useAuth();

  // --- Create form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [role, setRole] = useState<RoleValue>("logistica");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (loading || !isAdmin || submitting) return false;
    if (!isValidEmail(email)) return false;
    if (password.length < 6) return false;
    if (!nombres.trim() || !apellidos.trim()) return false;
    return true;
  }, [loading, isAdmin, submitting, email, password, nombres, apellidos]);

  // --- List users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [q, setQ] = useState("");

  // --- Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [editNombres, setEditNombres] = useState("");
  const [editApellidos, setEditApellidos] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editRole, setEditRole] = useState<RoleValue>("logistica");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const name = (u.displayName || `${u.nombres ?? ""} ${u.apellidos ?? ""}`).toLowerCase();
      return (
        (u.email || "").toLowerCase().includes(s) ||
        name.includes(s) ||
        (u.role || "").toLowerCase().includes(s)
      );
    });
  }, [users, q]);

  async function adminFetch(url: string, init?: RequestInit) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("No hay sesión activa");

    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Error");
    return json;
  }

  async function loadUsers() {
    try {
      setListLoading(true);
      const json = await adminFetch("/api/admin/users/list");
      setUsers((json.users as UserRow[]) || []);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cargar usuarios");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && isAdmin) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin]);

  function onPickPhoto() {
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

    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);

      const fd = new FormData();
      fd.append("email", email.trim());
      fd.append("password", password);
      fd.append("nombres", nombres.trim());
      fd.append("apellidos", apellidos.trim());
      fd.append("telefono", telefono.trim());
      fd.append("role", role);
      if (photoFile) fd.append("photo", photoFile);

      const json = await adminFetch("/api/admin/users/create", {
        method: "POST",
        body: fd,
      });

      toast.success(`Usuario creado: ${json.email} (${json.role})`, { duration: 2200 });

      // reset
      setEmail("");
      setPassword("");
      setNombres("");
      setApellidos("");
      setTelefono("");
      setRole("logistica");
      setPhotoFile(null);
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);

      await loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Error", { duration: 3000 });
    } finally {
      setSubmitting(false);
    }
  }

  async function setActive(uid: string, active: boolean) {
    try {
      await adminFetch("/api/admin/users/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, active }),
      });
      toast.success(active ? "Usuario activado" : "Usuario desactivado");
      await loadUsers();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar");
    }
  }

  async function deleteUser(uid: string) {
    if (!confirm("¿Eliminar usuario? Esto es irreversible.")) return;

    try {
      await adminFetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      toast.success("Usuario eliminado");
      await loadUsers();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setEditNombres((u.nombres ?? "").toString());
    setEditApellidos((u.apellidos ?? "").toString());
    setEditTelefono((u.telefono ?? "").toString());
    setEditRole(((u.role as RoleValue) || "logistica") as RoleValue);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing) return;
    const nextN = editNombres.trim();
    const nextA = editApellidos.trim();
    const nextT = editTelefono.trim();
    const nextR = editRole;

    if (!nextN || !nextA) {
      toast.error("Nombres y apellidos son requeridos");
      return;
    }

    try {
      setEditSubmitting(true);
      await adminFetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: editing.uid,
          nombres: nextN,
          apellidos: nextA,
          telefono: nextT,
          role: nextR,
        }),
      });

      toast.success("Usuario actualizado");
      setEditOpen(false);
      setEditing(null);
      await loadUsers();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar");
    } finally {
      setEditSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-card-foreground shadow-sm">
          <div className="font-extrabold text-foreground text-lg">No autorizado</div>
          <div className="text-sm text-muted-foreground mt-1">
            Solo un administrador puede gestionar usuarios.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12 pt-6 font-sans">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-none">
              Gestión de Usuarios
            </h1>
            <div className="text-muted-foreground text-sm mt-1">
              Crear, editar, activar/desactivar o eliminar personal interno.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={listLoading}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bold shadow-sm",
            "bg-muted hover:bg-muted/80 text-foreground border border-border/60",
            "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring",
            listLoading ? "opacity-60 cursor-not-allowed" : ""
          )}
        >
          <RefreshCcw className={cn("h-4 w-4", listLoading ? "animate-spin" : "")} />
          Actualizar
        </button>
      </div>

      {/* Crear */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-card-foreground shadow-[0_8px_28px_-18px_rgba(0,0,0,0.65)] mb-6">
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4 mb-5">
          <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-card border border-border/60">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="text-sm">
            <div className="font-extrabold text-foreground">Importante</div>
            <div className="text-muted-foreground mt-0.5">
              Aquí NO se crean clientes. Solo personal interno.
            </div>
          </div>
        </div>

        <form onSubmit={onCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Foto */}
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">
              Foto de perfil (opcional)
            </label>

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden border border-border/60 bg-muted grid place-items-center">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-extrabold text-muted-foreground">Sin foto</span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />

              <button
                type="button"
                onClick={onPickPhoto}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bold shadow-sm",
                  "bg-muted hover:bg-muted/80 text-foreground border border-border/60",
                  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
                )}
              >
                <Upload className="h-4 w-4" />
                Elegir foto
              </button>
            </div>

            <div className="text-xs text-muted-foreground mt-2">Máx 1MB. JPG/PNG/WEBP.</div>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">Nombres</label>
            <input
              className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">Apellidos</label>
            <input
              className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">
              Teléfono (opcional)
            </label>
            <input
              className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+51 999 999 999"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">Rol</label>
            <select
              className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={role}
              onChange={(e) => setRole(e.target.value as RoleValue)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">Correo</label>
            <input
              className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@correo.com"
              required
            />
            {!isValidEmail(email) && email.length > 0 && (
              <div className="text-xs text-destructive mt-1">Correo inválido</div>
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">Contraseña</label>
            <input
              type="password"
              className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
              required
            />
            {password.length > 0 && password.length < 6 && (
              <div className="text-xs text-destructive mt-1">Mínimo 6 caracteres</div>
            )}
          </div>

          <div className="md:col-span-2 flex justify-end">
            <motion.button
              type="submit"
              whileHover={{ scale: submitting ? 1 : 1.04 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              disabled={!canSubmit}
              className={cn(
                "bg-primary hover:bg-primary/90 text-primary-foreground px-7 py-2.5 rounded-full font-bold shadow-sm",
                "transition-all duration-200 text-base flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring",
                "disabled:opacity-60"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Crear usuario
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Listado */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-card-foreground shadow-[0_8px_28px_-18px_rgba(0,0,0,0.65)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="font-extrabold text-foreground text-lg">Usuarios</div>
            <div className="text-sm text-muted-foreground">Lista de personal registrado</div>
          </div>

          <input
            className="border border-border rounded-lg px-4 py-2 bg-background w-full md:w-80 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar por email, nombre o rol…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {listLoading ? (
          <div className="text-muted-foreground">Cargando usuarios…</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground">No hay usuarios.</div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {filtered.map((u) => {
                const active = u.active !== false;
                const title =
                  u.displayName ||
                  `${u.nombres ?? ""} ${u.apellidos ?? ""}`.trim() ||
                  (u.email ? u.email.split("@")[0] : "Sin nombre");

                return (
                  <motion.div
                    key={u.uid}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="rounded-xl border border-border/60 bg-muted/30 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-border/60 bg-muted grid place-items-center">
                        {u.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.photoURL} alt={title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-extrabold text-muted-foreground">—</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-extrabold text-foreground truncate">{title}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Rol: <span className="font-semibold text-foreground">{u.role ?? "—"}</span> • Estado:{" "}
                          <span className={cn("font-semibold", active ? "text-foreground" : "text-destructive")}>
                            {active ? "Activo" : "Desactivado"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold shadow-sm transition-all duration-200",
                          "bg-muted hover:bg-muted/80 text-foreground border border-border/60",
                          "focus:outline-none focus:ring-2 focus:ring-ring"
                        )}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => setActive(u.uid, !active)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold shadow-sm transition-all duration-200",
                          active
                            ? "bg-muted hover:bg-muted/80 text-foreground border border-border/60"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-ring"
                        )}
                      >
                        <Power className="h-4 w-4" />
                        {active ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUser(u.uid)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold shadow-sm transition-all duration-200",
                          "bg-destructive/15 hover:bg-destructive/20 text-destructive border border-destructive/20",
                          "focus:outline-none focus:ring-2 focus:ring-ring"
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal editar */}
      <AnimatePresence>
        {editOpen && editing && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            onClick={() => (editSubmitting ? null : setEditOpen(false))}
          >
            <motion.div
              className="bg-card text-card-foreground w-full max-w-md rounded-2xl shadow-2xl relative border border-border/60 p-0"
              initial={{ opacity: 0, y: 38, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 35, scale: 0.97 }}
              transition={{ duration: 0.28, type: "spring", damping: 20, stiffness: 210 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-5 right-7 text-2xl text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                onClick={() => setEditOpen(false)}
                aria-label="Cerrar"
                type="button"
                disabled={editSubmitting}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="p-7">
                <h3 className="font-extrabold text-xl text-foreground">Editar usuario</h3>
                <p className="text-sm text-muted-foreground mt-1 truncate">{editing.email}</p>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-1 block">Nombres</label>
                    <input
                      className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editNombres}
                      onChange={(e) => setEditNombres(e.target.value)}
                      disabled={editSubmitting}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-1 block">Apellidos</label>
                    <input
                      className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editApellidos}
                      onChange={(e) => setEditApellidos(e.target.value)}
                      disabled={editSubmitting}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-1 block">
                      Teléfono (opcional)
                    </label>
                    <input
                      className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editTelefono}
                      onChange={(e) => setEditTelefono(e.target.value)}
                      disabled={editSubmitting}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-1 block">Rol</label>
                    <select
                      className="border border-border rounded-lg px-4 py-2 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as RoleValue)}
                      disabled={editSubmitting}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className={cn(
                      "px-5 py-2 rounded-full font-bold shadow-sm transition-all duration-200",
                      "bg-muted hover:bg-muted/80 text-foreground border border-border/60",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      editSubmitting ? "opacity-60 cursor-not-allowed" : ""
                    )}
                    onClick={() => setEditOpen(false)}
                    disabled={editSubmitting}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "px-5 py-2 rounded-full font-bold shadow-sm transition-all duration-200",
                      "bg-primary hover:bg-primary/90 text-primary-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      editSubmitting ? "opacity-60 cursor-not-allowed" : ""
                    )}
                    onClick={saveEdit}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                        Guardando…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 inline-block mr-2" />
                        Guardar
                      </>
                    )}
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