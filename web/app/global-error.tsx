"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f8f6f0", color: "#102120" }}>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0 }}>Civic Pulse Global Render Error</h1>
          <p style={{ margin: 0 }}>
            The app shell crashed during render. Use the details below to debug quickly.
          </p>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #d7d1bf",
              background: "#fff",
              overflowX: "auto",
              fontSize: 12,
            }}
          >
            {error?.message || "Unknown error"}
          </pre>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              style={{
                border: "1px solid #0c7a5f",
                background: "#0c7a5f",
                color: "#fff",
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
              onClick={reset}
            >
              Retry
            </button>
            <a href="/diag.html" style={{ color: "#0c7a5f", fontWeight: 700 }}>
              Open Static Diagnostic
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
