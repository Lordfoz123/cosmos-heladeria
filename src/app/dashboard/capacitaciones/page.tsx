"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp, query, orderBy } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Download, Trash2, Eye, Loader2, GraduationCap, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Capacitacion = {
  id: string;
  titulo:  string;
  descripcion: string;
  url: string;
  fileName: string;
  fechaSubida: Timestamp;
  size: number;
};

export default function CapacitacionesPage() {
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchCapacitaciones();
  }, []);

  async function fetchCapacitaciones() {
    setLoading(true);
    try {
      const q = query(collection(db, "capacitaciones"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Capacitacion));
      setCapacitaciones(data);
    } catch (err) {
      console.error("Error al cargar capacitaciones:", err);
      toast.error("Error al cargar capacitaciones");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      toast.error("Selecciona un archivo PDF");
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    if (!titulo.trim()) {
      toast.error("Ingresa un título");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Subir a Firebase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `capacitaciones/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Error al subir:", error);
          toast.error("Error al subir el archivo");
          setUploading(false);
        },
        async () => {
          // Obtener URL
          const url = await getDownloadURL(uploadTask.snapshot.ref);

          // Guardar metadata en Firestore
          await addDoc(collection(db, "capacitaciones"), {
            titulo:  titulo.trim(),
            descripcion: descripcion.trim(),
            url,
            fileName,
            fechaSubida: Timestamp.now(),
            size: file.size,
          });

          toast.success("Capacitación subida exitosamente");
          setOpenDialog(false);
          resetForm();
          fetchCapacitaciones();
        }
      );
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al subir");
      setUploading(false);
    }
  }

  async function handleDelete(cap: Capacitacion) {
    if (!confirm(`¿Eliminar "${cap.titulo}"?`)) return;

    try {
      // Eliminar de Storage
      const storageRef = ref(storage, `capacitaciones/${cap.fileName}`);
      await deleteObject(storageRef);

      // Eliminar de Firestore
      await deleteDoc(doc(db, "capacitaciones", cap.id));

      toast.success("Capacitación eliminada");
      fetchCapacitaciones();
    } catch (err) {
      console.error("Error al eliminar:", err);
      toast.error("Error al eliminar");
    }
  }

  function resetForm() {
    setTitulo("");
    setDescripcion("");
    setFile(null);
    setUploading(false);
    setUploadProgress(0);
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 font-sans transition-colors duration-300">
      <Toaster position="top-center" />

      {/* HEADER UNIFORMIZADO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/40 pb-8">
        <div className="space-y-2">
          {/* 🔥 ÍCONO SUPERIOR AGREGADO 🔥 */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Recursos Humanos
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Capacitaciones
          </h1>
          <p className="text-lg text-muted-foreground mt-1 max-w-2xl font-medium">
            Sube y gestiona material de entrenamiento y manuales en PDF.
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <button className="h-11 px-6 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-[1.02] transition-all tracking-tight active:scale-95 shrink-0">
              <Upload className="w-4 h-4" />
              Subir PDF
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-background border border-border sm:rounded-3xl p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="px-8 py-6 border-b border-border bg-muted/30">
              <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">Subir nueva capacitación</DialogTitle>
              <p className="text-xs text-muted-foreground font-medium">Sube un archivo PDF con un peso máximo recomendado de 10MB.</p>
            </DialogHeader>

            <form onSubmit={handleUpload} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Título *
                </label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Manual de seguridad alimentaria"
                  required
                  disabled={uploading}
                  className="bg-card border-border rounded-xl px-4 py-6 text-sm font-semibold focus-visible:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Descripción (opcional)
                </label>
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción breve del contenido..."
                  rows={3}
                  disabled={uploading}
                  className="bg-card border-border rounded-xl px-4 py-3 text-sm resize-none focus-visible:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Archivo PDF *
                </label>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={uploading}
                    required
                    className="bg-card border-border rounded-xl file:bg-blue-50 file:text-blue-700 file:dark:bg-blue-500/20 file:dark:text-blue-400 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:font-bold file:text-xs cursor-pointer h-12 pt-2.5"
                  />
                </div>
                {file && (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 px-1">
                    ✓ {file.name} ({formatBytes(file.size)})
                  </p>
                )}
              </div>

              {uploading && (
                <div className="bg-muted p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between text-xs mb-2 font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Subiendo...</span>
                    <span className="text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-border/50">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {setOpenDialog(false); resetForm();}}
                  disabled={uploading}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={uploading || !file}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ?  (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando... 
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* GRILLA DE PDFs */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-widest">Cargando módulos...</span>
        </div>
      ) : capacitaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center opacity-60 bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-border/60">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold text-foreground tracking-tight">
            No hay capacitaciones aún
          </h3>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Sube tu primer PDF para empezar a entrenar al equipo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {capacitaciones.map((cap) => (
            <div
              key={cap.id}
              className="group bg-card rounded-[2rem] border border-border shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 overflow-hidden flex flex-col h-full p-6 relative"
            >
              {/* Botón Borrar en la esquina (Hover) */}
              <button
                onClick={() => handleDelete(cap)}
                className="absolute top-4 right-4 p-2.5 bg-background border border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10 shadow-sm"
                title="Eliminar PDF"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Icono del PDF */}
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 shadow-inner shrink-0 group-hover:scale-110 transition-transform duration-500">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>

              {/* Textos */}
              <div className="flex-1">
                  <h3 className="font-extrabold text-xl text-foreground tracking-tight mb-2 leading-tight pr-8">
                    {cap.titulo}
                  </h3>

                  {cap.descripcion ? (
                    <p className="text-xs text-muted-foreground font-medium mb-4 line-clamp-3 leading-relaxed">
                      {cap.descripcion}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 font-medium mb-4 italic">
                      Sin descripción adicional.
                    </p>
                  )}
              </div>

              {/* Metadatos y Botones */}
              <div className="mt-auto pt-5 border-t border-border">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-muted px-2.5 py-1 rounded-md">
                        {format(cap.fechaSubida.toDate(), "dd MMM yyyy", { locale: es })}
                    </span>
                    <span className="text-[10px] font-black text-muted-foreground tracking-widest tabular-nums">
                        {formatBytes(cap.size)}
                    </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(cap.url, "_blank")}
                    className="flex-1 py-3 bg-background border border-border hover:bg-foreground hover:text-background text-foreground rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                  >
                    <Eye className="w-4 h-4" /> Ver
                  </button>
                  <button
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = cap.url;
                      a.download = cap.fileName;
                      a.click();
                    }}
                    className="flex-1 py-3 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Bajar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}