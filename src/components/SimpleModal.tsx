"use client";
import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function SimpleModal({ open, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[3px] p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card text-card-foreground shadow-2xl ring-1 ring-white/5 p-8">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted text-2xl leading-none font-bold transition focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Cerrar modal"
          type="button"
        >
          ×
        </button>

        {children}
      </div>
    </div>
  );
}