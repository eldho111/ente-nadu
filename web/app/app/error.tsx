"use client";

import Link from "next/link";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>App Mode Runtime Error</h1>
      <p className="muted" style={{ margin: 0 }}>
        A client-side rendering error occurred in app mode. Use safe launch to bypass heavy components.
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
        {error?.message || "Unknown runtime error"}
      </pre>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="button" onClick={reset}>
          Retry
        </button>
        <Link href="/app?safe=1" className="button secondary">
          Safe Launch
        </Link>
        <Link href="/doctor/runtime" className="button secondary">
          Runtime Doctor
        </Link>
      </div>
    </main>
  );
}
