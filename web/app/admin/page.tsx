"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getAdminKey,
  setAdminKey,
  validateAdminKey,
} from "@/lib/admin-api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, jump straight to /admin/reports.
  useEffect(() => {
    if (getAdminKey()) {
      router.replace("/admin/reports");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setSubmitting(true);
    setError(null);
    const ok = await validateAdminKey(key.trim());
    setSubmitting(false);
    if (!ok) {
      setError("That key was rejected. Double-check ADMIN_API_KEY on the API service.");
      return;
    }
    setAdminKey(key.trim());
    router.replace("/admin/reports");
  };

  return (
    <div style={{ display: "grid", placeItems: "center", paddingTop: "10vh" }}>
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          padding: 28,
          width: "100%",
          maxWidth: 440,
          display: "grid",
          gap: 14,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--alarm)",
            fontFamily: "var(--font-body)",
          }}
        >
          Ente Nadu · Admin
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink-0)",
            letterSpacing: "-0.01em",
          }}
        >
          Sign in to manage reports
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ink-1)",
            lineHeight: 1.55,
          }}
        >
          Paste the <code style={{ color: "var(--ink-0)", fontFamily: "var(--font-mono)" }}>ADMIN_API_KEY</code>{" "}
          configured on the API service. The key is stored in this tab&apos;s sessionStorage and cleared when you close the tab.
        </p>

        <label
          style={{
            display: "grid",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          Admin key
          <input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your key here"
            style={{
              padding: "10px 12px",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--r-sm)",
              background: "var(--bg-elev)",
              color: "var(--ink-0)",
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          />
        </label>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "var(--r-sm)",
              background: "var(--alarm-soft)",
              border: "1px solid var(--border)",
              borderLeft: "2px solid var(--alarm)",
              fontSize: 12,
              color: "var(--alarm)",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="button primary"
          disabled={submitting || !key.trim()}
          style={{ marginTop: 4 }}
        >
          {submitting ? "Verifying…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
