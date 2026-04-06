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
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando…
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
          <div className="font-extrabold text-foreground text-lg">No autorizado</div>
          <div className="text-sm text-muted-foreground mt-1">
            Solo un administrador puede gestionar usuarios.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12 pt-6 font-sans transition-colors duration-300">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          {/* 🔥 CORRECCIÓN DEL ICONO PRINCIPAL 🔥 */}
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-none tracking-tight">
              Gestión de Usuarios
            </h1>
            <div className="text-muted-foreground text-sm mt-1 font-medium">
              Crear, editar, activar/desactivar o eliminar personal interno.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={listLoading}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold shadow-sm",
            "bg-card hover:bg-muted text-foreground border border-border",
            "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
            listLoading ? "opacity-60 cursor-not-allowed" : "active:scale-95"
          )}
        >
          <RefreshCcw className={cn("h-4 w-4", listLoading ? "animate-spin" : "")} />
          Actualizar
        </button>
      </div>

      {/* Crear */}
      <div className="rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 🔥 ALERTA VISUAL ADAPTADA AL MODO OSCURO 🔥 */}
        <div className="flex items-start gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 mb-8">
          <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-background border border-border shadow-sm shrink-0">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm">
            <div className="font-extrabold text-foreground tracking-tight">Importante</div>
            <div className="text-muted-foreground mt-0.5 font-medium">
              Aquí NO se crean clientes. Esta sección es exclusivamente para personal interno.
            </div>
          </div>
        </div>

        <form onSubmit={onCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Foto */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 block">
              Foto de perfil (opcional)
            </label>

            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border bg-muted grid place-items-center shrink-0">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-extrabold text-muted-foreground uppercase">Sin foto</span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />

              <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={onPickPhoto}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-bold shadow-sm",
                      "bg-background hover:bg-muted text-foreground border border-border",
                      "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:scale-95"
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    Elegir foto
                  </button>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 px-1">Máx 1MB. JPG/PNG/WEBP.</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Nombres</label>
            <input
              className="border border-border rounded-xl px-4 py-3 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium transition-all"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Apellidos</label>
            <input
              className="border border-border rounded-xl px-4 py-3 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium transition-all"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Teléfono (opcional)
            </label>
            <input
              className="border border-border rounded-xl px-4 py-3 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium transition-all"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+51 999 999 999"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Rol</label>
            <select
              className="border border-border rounded-xl px-4 py-3 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-bold text-foreground appearance-none cursor-pointer transition-all"
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
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Correo (Usuario)</label>
            <input
              className="border border-border rounded-xl px-4 py-3 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@correo.com"
              required
            />
            {!isValidEmail(email) && email.length > 0 && (
              <div className="text-[10px] font-bold text-destructive uppercase mt-1.5 ml-1">Correo inválido</div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Contraseña</label>
            <input
              type="password"
              className="border border-border rounded-xl px-4 py-3 bg-background w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
            {password.length > 0 && password.length < 6 && (
              <div className="text-[10px] font-bold text-destructive uppercase mt-1.5 ml-1">Mínimo 6 caracteres</div>
            )}
          </div>

          {/* 🔥 BOTÓN PRINCIPAL DE CREACIÓN 🔥 */}
          <div className="md:col-span-2 flex justify-end pt-4 border-t border-border/50">
            <motion.button
              type="submit"
              whileHover={{ scale: submitting || !canSubmit ? 1 : 1.02 }}
              whileTap={{ scale: submitting || !canSubmit ? 1 : 0.95 }}
              disabled={!canSubmit}
              className={cn(
                "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg",
                "transition-all duration-200 text-sm flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 uppercase tracking-widest",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crear usuario
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Listado */}
      <div className="rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-border/40 pb-6">
          <div>
            <div className="font-extrabold text-foreground text-xl tracking-tight">Lista de Personal</div>
            <div className="text-sm text-muted-foreground font-medium">Directorio activo de la plataforma</div>
          </div>

          <div className="relative">
            <input
                className="border border-border rounded-xl pl-10 pr-4 py-2.5 bg-background w-full md:w-80 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium text-sm"
                placeholder="Buscar por email, nombre o rol…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
            />
            {/* Si quieres ponerle el icono de lupa, puedes importar Search de lucide-react y ponerlo aquí con absolute */}
          </div>
        </div>

        {listLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="font-bold text-sm uppercase tracking-widest">Cargando directorio...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-bold text-sm uppercase tracking-widest">
              No hay usuarios que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="space-y-3">
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
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-2xl border border-border bg-background p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden border-2 border-border bg-muted grid place-items-center shadow-inner">
                        {u.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.photoURL} alt={title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <span className="text-xs font-extrabold text-muted-foreground uppercase">---</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-extrabold text-foreground truncate text-base tracking-tight">{title}</div>
                        <div className="text-xs text-muted-foreground truncate font-medium">{u.email}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="bg-muted px-2 py-0.5 rounded-md font-bold text-foreground uppercase tracking-widest text-[9px]">{u.role ?? "—"}</span> 
                          <span className={cn("font-bold text-[10px] uppercase tracking-widest", active ? "text-emerald-500" : "text-destructive")}>
                            • {active ? "Activo" : "Desactivado"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end flex-wrap mt-2 md:mt-0 pt-3 md:pt-0 border-t border-border md:border-none">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold text-xs shadow-sm bg-card hover:bg-muted text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => setActive(u.uid, !active)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold text-xs shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30",
                          active
                            ? "bg-card hover:bg-muted text-foreground border border-border"
                            : "bg-blue-600 hover:bg-blue-700 text-white border border-transparent"
                        )}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {active ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUser(u.uid)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold text-xs shadow-sm bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground border border-destructive/20 focus:outline-none transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
            className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            onClick={() => (editSubmitting ? null : setEditOpen(false))}
          >
            <motion.div
              className="bg-card w-full max-w-md rounded-3xl shadow-2xl relative border border-border overflow-hidden"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
                 <div>
                    <h3 className="font-extrabold text-xl text-foreground tracking-tight">Editar usuario</h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate max-w-[200px]">{editing.email}</p>
                 </div>
                 <button
                    className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors rounded-full disabled:opacity-50"
                    onClick={() => setEditOpen(false)}
                    disabled={editSubmitting}
                 >
                    <X className="h-5 w-5" />
                 </button>
              </div>

              <div className="p-8 bg-background">
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Nombres</label>
                    <input
                      className="border border-border rounded-xl px-4 py-2.5 bg-card w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-medium transition-all"
                      value={editNombres}
                      onChange={(e) => setEditNombres(e.target.value)}
                      disabled={editSubmitting}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Apellidos</label>
                    <input
                      className="border border-border rounded-xl px-4 py-2.5 bg-card w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-medium transition-all"
                      value={editApellidos}
                      onChange={(e) => setEditApellidos(e.target.value)}
                      disabled={editSubmitting}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Teléfono (opcional)
                    </label>
                    <input
                      className="border border-border rounded-xl px-4 py-2.5 bg-card w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-medium transition-all"
                      value={editTelefono}
                      onChange={(e) => setEditTelefono(e.target.value)}
                      disabled={editSubmitting}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Rol</label>
                    <select
                      className="border border-border rounded-xl px-4 py-2.5 bg-card w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-bold text-foreground appearance-none cursor-pointer transition-all"
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

                <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors disabled:opacity-50"
                    onClick={() => setEditOpen(false)}
                    disabled={editSubmitting}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                    onClick={saveEdit}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
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