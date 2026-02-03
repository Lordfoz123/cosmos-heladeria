"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function StyledModal({ open, onClose, children }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Cerrar con ESC
  useEffect(() => {
    function listener(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [open, onClose]);

  // Cerrar clic fuera
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[3px] transition-all animate-modal-fade p-4"
    >
      <div
        className={[
          "relative w-full max-w-md rounded-2xl p-8 animate-modal-pop",
          "bg-card text-card-foreground",
          "border border-border/50",
          "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)]",
          "ring-1 ring-white/5",
        ].join(" ")}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-2 hover:bg-muted focus:outline-none text-xl text-muted-foreground hover:text-foreground transition"
          aria-label="Cerrar modal"
          type="button"
        >
          ×
        </button>

        <div className="font-sans">{children}</div>
      </div>

      <style jsx global>{`
        .animate-modal-fade {
          animation: modalFadeIn 0.22s;
        }
        .animate-modal-pop {
          animation: modalPopIn 0.23s;
        }
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modalPopIn {
          from {
            opacity: 0;
            transform: translateY(32px) scale(0.93);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}