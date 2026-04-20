"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function checkUrl(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return { ok: res.ok, detail: `HTTP ${res.status}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    return { ok: false, detail: message };
  }
}

export default function DoctorPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const nextChecks: Check[] = [];
      nextChecks.push({
        name: "Browser online",
        ok: navigator.onLine,
        detail: navigator.onLine ? "online" : "offline",
      });

      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          nextChecks.push({
            name: "Service workers",
            ok: true,
            detail: `${regs.length} registered`,
          });
        } else {
          nextChecks.push({
            name: "Service workers",
            ok: true,
            detail: "not supported",
          });
        }
      } catch {
        nextChecks.push({
          name: "Service workers",
          ok: false,
          detail: "could not read registrations",
        });
      }

      const apiHealth = await checkUrl(`${API_BASE}/health`);
      nextChecks.push({
        name: "API /health",
        ok: apiHealth.ok,
        detail: apiHealth.detail,
      });

      const reports = await checkUrl(`${API_BASE}/v1/reports?page_size=1`);
      nextChecks.push({
        name: "API /v1/reports",
        ok: reports.ok,
        detail: reports.detail,
      });

      const runtime = await checkUrl(`${API_BASE}/v1/meta/runtime`);
      nextChecks.push({
        name: "API /v1/meta/runtime",
        ok: runtime.ok,
        detail: runtime.detail,
      });

      let locale = "en";
      try {
        locale = localStorage.getItem("locale") || "en";
      } catch {
        locale = "storage_blocked";
      }
      nextChecks.push({
        name: "Local storage locale",
        ok: true,
        detail: locale,
      });

      setChecks(nextChecks);
      setLoading(false);
    };
    void run();
  }, []);

  const hasFailure = useMemo(() => checks.some((item) => !item.ok), [checks]);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 14 }}>
      <h1 style={{ margin: 0 }}>Ente Nadu — Diagnostics</h1>
      <p className="muted" style={{ margin: 0 }}>
        Use this page to quickly isolate why UI appears blank.
      </p>

      {loading ? <p className="muted">Running checks...</p> : null}

      {!loading ? (
        <section style={{ border: "1px solid #d7d1bf", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f7f4ec" }}>
                <th style={{ padding: 10, borderBottom: "1px solid #e4dcc8" }}>Check</th>
                <th style={{ padding: 10, borderBottom: "1px solid #e4dcc8" }}>Status</th>
                <th style={{ padding: 10, borderBottom: "1px solid #e4dcc8" }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((item) => (
                <tr key={item.name}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0eadb" }}>{item.name}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0eadb", fontWeight: 700 }}>
                    {item.ok ? "OK" : "FAIL"}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0eadb" }}>{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {!loading ? (
        <section style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Next Action</h2>
          {hasFailure ? (
            <p className="muted" style={{ margin: 0 }}>
              At least one backend/runtime check failed. Run terminal diagnostics: <code>npm run diagnose:ui</code>.
            </p>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Server checks are fine. If app is still white, open runtime doctor, then clear service worker/cache.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/doctor/runtime" className="button">
              Runtime Doctor
            </Link>
            <Link href="/app?safe=1" className="button secondary">
              Safe Launch
            </Link>
            <Link href="/clear-cache" className="button">
              Clear Cache
            </Link>
            <Link href="/app?safe=1" className="button secondary">
              Open App
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
