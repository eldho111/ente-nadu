"use client";

import Link from "next/link";

export default function ReportError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <section className="hero">
        <h1>Something went wrong</h1>
        <p className="muted">We could not load this report. The page or one of its components failed to render.</p>
      </section>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="button secondary">
          Back to map
        </Link>
      </div>
    </main>
  );
}
