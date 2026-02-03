"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 24, fontFamily: "sans-serif" }}>
          <h1>Global error</h1>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
          <button onClick={() => reset()}>Reintentar</button>
        </div>
      </body>
    </html>
  );
}