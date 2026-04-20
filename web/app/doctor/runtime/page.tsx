"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RuntimeErrorRow = {
  at: string;
  type: "window.error" | "unhandledrejection" | "script.error";
  message: string;
  source?: string;
};

type RuntimeSnapshot = {
  captured_at: string;
  online: boolean;
  user_agent: string;
  location: string;
  service_worker_supported: boolean;
  service_worker_controller: boolean;
  service_worker_registrations: number;
  cache_keys: string[];
  webgl_supported: boolean;
  webgl2_supported: boolean;
  errors: RuntimeErrorRow[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const SNAPSHOT_KEY = "civic_pulse_runtime_snapshot_v1";
const ERRORS_KEY = "civic_pulse_runtime_errors_v1";

function toErrorText(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "unknown error";
  }
}

function detectWebGl(): { webgl: boolean; webgl2: boolean } {
  try {
    const canvas = document.createElement("canvas");
    const webgl = Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    const webgl2 = Boolean(canvas.getContext("webgl2"));
    return { webgl, webgl2 };
  } catch {
    return { webgl: false, webgl2: false };
  }
}

async function clearBrowserState(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export default function RuntimeDoctorPage() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [runtimeMeta, setRuntimeMeta] = useState<Record<string, unknown> | null>(null);
  const [resetStatus, setResetStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSnapshot = useCallback(async () => {
    const errors: RuntimeErrorRow[] = [];
    try {
      const persistedErrors = localStorage.getItem(ERRORS_KEY);
      if (persistedErrors) {
        errors.push(...(JSON.parse(persistedErrors) as RuntimeErrorRow[]));
      }
    } catch {
      // ignore blocked/broken local storage
    }

    let cacheKeys: string[] = [];
    if ("caches" in window) {
      try {
        cacheKeys = await caches.keys();
      } catch {
        cacheKeys = [];
      }
    }

    let registrations = 0;
    if ("serviceWorker" in navigator) {
      try {
        registrations = (await navigator.serviceWorker.getRegistrations()).length;
      } catch {
        registrations = -1;
      }
    }

    const gl = detectWebGl();
    const nextSnapshot: RuntimeSnapshot = {
      captured_at: new Date().toISOString(),
      online: navigator.onLine,
      user_agent: navigator.userAgent,
      location: window.location.href,
      service_worker_supported: "serviceWorker" in navigator,
      service_worker_controller: Boolean(navigator.serviceWorker?.controller),
      service_worker_registrations: registrations,
      cache_keys: cacheKeys,
      webgl_supported: gl.webgl,
      webgl2_supported: gl.webgl2,
      errors,
    };

    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextSnapshot));
    } catch {
      // ignore blocked/broken local storage
    }

    setSnapshot(nextSnapshot);
  }, []);

  useEffect(() => {
    const onError = (event: Event) => {
      const asError = event as ErrorEvent;
      const target = event.target as HTMLElement | null;
      const row: RuntimeErrorRow = {
        at: new Date().toISOString(),
        type: target?.tagName === "SCRIPT" ? "script.error" : "window.error",
        message:
          target?.tagName === "SCRIPT"
            ? "Script load failed"
            : asError.message || "window error",
        source:
          target?.tagName === "SCRIPT"
            ? (target as HTMLScriptElement).src
            : asError.filename,
      };

      try {
        const prev = localStorage.getItem(ERRORS_KEY);
        const parsed = prev ? (JSON.parse(prev) as RuntimeErrorRow[]) : [];
        const next = [row, ...parsed].slice(0, 20);
        localStorage.setItem(ERRORS_KEY, JSON.stringify(next));
      } catch {
        // ignore blocked/broken local storage
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const row: RuntimeErrorRow = {
        at: new Date().toISOString(),
        type: "unhandledrejection",
        message: toErrorText(event.reason),
      };

      try {
        const prev = localStorage.getItem(ERRORS_KEY);
        const parsed = prev ? (JSON.parse(prev) as RuntimeErrorRow[]) : [];
        const next = [row, ...parsed].slice(0, 20);
        localStorage.setItem(ERRORS_KEY, JSON.stringify(next));
      } catch {
        // ignore blocked/broken local storage
      }
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const boot = async () => {
      await loadSnapshot();
      try {
        const response = await fetch(`${API_BASE}/v1/meta/runtime`, { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          setRuntimeMeta(payload as Record<string, unknown>);
        }
      } catch {
        setRuntimeMeta({ error: "failed to load /v1/meta/runtime" });
      }
      setLoading(false);
    };

    void boot();

    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [loadSnapshot]);

  const errorCount = useMemo(() => snapshot?.errors.length || 0, [snapshot?.errors.length]);

  const handleResetAndSafeLaunch = async () => {
    setResetStatus("Resetting service workers and cache...");
    try {
      await clearBrowserState();
      try {
        localStorage.removeItem(SNAPSHOT_KEY);
        localStorage.removeItem(ERRORS_KEY);
      } catch {
        // ignore blocked/broken local storage
      }
      setResetStatus("Reset complete. Redirecting to safe mode...");
      window.location.assign("/app?safe=1");
    } catch {
      setResetStatus("Reset failed. Try /clear-cache and then open /app?safe=1.");
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Ente Nadu — Runtime Diagnostics</h1>
      <p className="muted" style={{ margin: 0 }}>
        Browser-side diagnostics for white-screen issues when server routes still return 200.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/app?safe=1" className="button">
          Safe Launch
        </Link>
        <button className="button secondary" onClick={handleResetAndSafeLaunch}>
          Reset Browser State
        </button>
        <Link href="/doctor" className="button secondary">
          Back to Doctor
        </Link>
      </div>
      {resetStatus ? (
        <p className="muted" style={{ margin: 0 }}>
          {resetStatus}
        </p>
      ) : null}
      {loading ? <p className="muted">Collecting runtime data...</p> : null}

      {!loading && snapshot ? (
        <>
          <section className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
            <strong>Browser Snapshot</strong>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </section>
          <section className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
            <strong>API Runtime Meta</strong>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(runtimeMeta || {}, null, 2)}
            </pre>
          </section>
          <section className="card" style={{ padding: 12 }}>
            <strong>Error Summary</strong>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              Captured runtime errors: {errorCount}
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}
