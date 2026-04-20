"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ClearCachePage() {
  const [status, setStatus] = useState("Clearing browser cache and service workers...");

  useEffect(() => {
    const clear = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        setStatus("Cache cleared. Open App Mode again.");
      } catch {
        setStatus("Could not clear everything automatically. Use hard refresh (Ctrl+Shift+R).");
      }
    };
    clear();
  }, []);

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px", display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Civic Pulse Cache Reset</h1>
      <p className="muted" style={{ margin: 0 }}>{status}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="button" href="/app?safe=1">
          Open App Safe Mode
        </Link>
        <Link className="button secondary" href="/app">
          Open App Mode
        </Link>
        <Link className="button secondary" href="/">
          Open Web Mode
        </Link>
      </div>
    </main>
  );
}
