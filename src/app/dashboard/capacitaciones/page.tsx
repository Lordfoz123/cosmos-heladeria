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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Download, Trash2, Eye, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
      const q = query(collection(db, "capacitaciones"), orderBy("fechaSubida", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d. data() } as Capacitacion));
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

    if (! titulo.trim()) {
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
    if (! confirm(`¿Eliminar "${cap.titulo}"?`)) return;

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
    const i = Math. floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }

  return (
    <div className="flex-1 space-y-6 p-8 bg-background text-foreground">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Capacitaciones</h1>
          <p className="text-muted-foreground mt-1">
            Sube y gestiona material de capacitación en PDF
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Subir PDF
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Subir nueva capacitación</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Título *
                </label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Manual de seguridad alimentaria"
                  required
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Descripción (opcional)
                </label>
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción breve del contenido..."
                  rows={3}
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Archivo PDF *
                </label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                  required
                />
                {file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.name} ({formatBytes(file.size)})
                  </p>
                )}
              </div>

              {uploading && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Subiendo...</span>
                    <span className="font-bold text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading || !file}>
                  {uploading ?  (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo... 
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Subir
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grilla de PDFs */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : capacitaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">
            No hay capacitaciones aún
          </h3>
          <p className="text-muted-foreground mt-1">
            Sube tu primer PDF para empezar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {capacitaciones. map((cap) => (
            <div
              key={cap.id}
              className="group relative bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>

              {/* Título */}
              <h3 className="font-bold text-foreground text-base mb-2 line-clamp-2 min-h-[3rem]">
                {cap.titulo}
              </h3>

              {/* Descripción */}
              {cap.descripcion && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {cap.descripcion}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                <div>
                  {format(cap.fechaSubida. toDate(), "dd MMM yyyy", { locale: es })}
                </div>
                <div>{formatBytes(cap.size)}</div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => window.open(cap.url, "_blank")}
                >
                  <Eye className="h-3. 5 w-3.5" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = cap. url;
                    a.download = cap.fileName;
                    a.click();
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(cap)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}