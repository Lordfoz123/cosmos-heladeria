"use client";
import { useCallback, useRef, useState } from "react";
import { Image as ImageIcon, UploadCloud } from "lucide-react";

type Props = {
  onChange?: (file: File | null, url: string | null) => void;
};

export default function ImageUploader({ onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File | null) => {
    if (!file) {
      setPreview(null);
      onChange?.(null, null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      onChange?.(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // File select via dialog
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] || null);
  };

  // DnD events
  const preventDefaults = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    preventDefaults(e);
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    preventDefaults(e);
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    preventDefaults(e);
    setDragActive(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block font-medium text-gray-700 mb-1">Imagen del producto</label>
      {/* Dropzone */}
      <div
        className={[
          "relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition h-40 w-full cursor-pointer bg-gray-50 group",
          dragActive ? "border-primary-400 bg-primary-50" : "border-gray-300",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        tabIndex={0}
        role="button"
        aria-label="Cargar imagen"
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="object-contain rounded-lg h-36"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400 py-8 select-none">
            <UploadCloud className="w-10 h-10 mb-1 text-primary-400 group-hover:text-primary-600 transition" />
            <p className="text-sm text-gray-500">Arrastra una imagen aquí o <span className="underline text-primary-600">haz clic para seleccionar</span></p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
}