"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log en consola del navegador
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-xl font-bold">Ocurrió un error</h1>
      <p className="mt-2 text-sm opacity-80">
        {error.message} {error.digest ? `(digest: ${error.digest})` : ""}
      </p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded bg-black px-4 py-2 text-white"
      >
        Reintentar
      </button>
    </div>
  );
}