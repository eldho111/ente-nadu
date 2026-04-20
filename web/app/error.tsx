"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Civic Pulse UI Error</h1>
      <p className="muted" style={{ margin: 0 }}>
        A runtime error occurred while rendering this page.
      </p>
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #e4dcc8",
          background: "#fff",
          overflowX: "auto",
          fontSize: 12,
        }}
      >
        {error?.message || "Unknown error"}
      </pre>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="button" onClick={reset}>
          Retry
        </button>
        <a className="button secondary" href="/doctor">
          Open Doctor
        </a>
        <a className="button secondary" href="/clear-cache">
          Clear Cache
        </a>
      </div>
    </main>
  );
}
