"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import AdminGuard, { useAdminSignOut } from "@/components/admin/AdminGuard";
import { adminFetch } from "@/lib/admin-api";
import { getPublicApiBase } from "@/lib/api";
import { CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/reportConstants";

const API_BASE = getPublicApiBase();

type ReportRow = {
  id: string;
  public_id: string;
  created_at: string;
  status: string;
  moderation_state: string | null;
  category: string;
  ward_id: string | null;
  locality: string | null;
};

export default function AdminReportsPage() {
  return (
    <AdminGuard>
      <AdminReports />
    </AdminGuard>
  );
}

function AdminReports() {
  const signOut = useAdminSignOut();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // public_id currently being acted on
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Public list endpoint is fine here — admin doesn't need extra fields,
      // and listing reports doesn't require auth.
      const resp = await fetch(`${API_BASE}/v1/reports?page_size=100`, {
        cache: "no-store",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setRows(data.items || []);
    } catch (e) {
      setError(`Failed to load reports: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteReport = async (publicId: string) => {
    if (!confirm(`Permanently delete ${publicId}?\n\nThis removes the report, its photo, events, and timeline. Cannot be undone.`)) return;
    setBusy(publicId);
    try {
      const resp = await adminFetch(`/v1/admin/reports/${publicId}`, { method: "DELETE" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setRows((r) => r.filter((x) => x.public_id !== publicId));
      setSelected((s) => {
        const next = new Set(s);
        next.delete(publicId);
        return next;
      });
    } catch (e) {
      alert(`Delete failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const hideReport = async (publicId: string) => {
    setBusy(publicId);
    try {
      const resp = await adminFetch(`/v1/admin/reports/${publicId}/moderation`, {
        method: "PATCH",
        body: JSON.stringify({ moderation_state: "hidden" }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setRows((r) =>
        r.map((x) =>
          x.public_id === publicId ? { ...x, moderation_state: "hidden" } : x,
        ),
      );
    } catch (e) {
      alert(`Hide failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const restoreReport = async (publicId: string) => {
    setBusy(publicId);
    try {
      const resp = await adminFetch(`/v1/admin/reports/${publicId}/moderation`, {
        method: "PATCH",
        body: JSON.stringify({ moderation_state: "clean" }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setRows((r) =>
        r.map((x) =>
          x.public_id === publicId ? { ...x, moderation_state: "clean" } : x,
        ),
      );
    } catch (e) {
      alert(`Restore failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected report(s)? This cannot be undone.`)) return;
    setBusy("__bulk__");
    const failed: string[] = [];
    for (const pid of selected) {
      try {
        const resp = await adminFetch(`/v1/admin/reports/${pid}`, { method: "DELETE" });
        if (!resp.ok) failed.push(pid);
      } catch {
        failed.push(pid);
      }
    }
    setRows((r) => r.filter((x) => !selected.has(x.public_id) || failed.includes(x.public_id)));
    setSelected(new Set(failed));
    setBusy(null);
    if (failed.length > 0) alert(`${failed.length} report(s) failed to delete: ${failed.join(", ")}`);
  };

  const toggleSelect = (publicId: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.public_id)));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingBottom: 12,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--alarm)",
              fontFamily: "var(--font-body)",
              marginBottom: 4,
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
            Reports management
          </h1>
        </div>
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <Link href="/" className="button secondary" style={{ minHeight: 36, padding: "6px 14px" }}>
            ← Public site
          </Link>
          <button
            onClick={load}
            className="button secondary"
            style={{ minHeight: 36, padding: "6px 14px" }}
          >
            Refresh
          </button>
          <button
            onClick={signOut}
            className="button"
            style={{ minHeight: 36, padding: "6px 14px" }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            background: "var(--alarm-soft)",
            border: "1px solid var(--border)",
            borderLeft: "2px solid var(--alarm)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <strong style={{ fontSize: 13, color: "var(--ink-0)" }}>
            {selected.size} selected
          </strong>
          <button
            onClick={deleteSelected}
            disabled={busy === "__bulk__"}
            className="button"
            style={{
              minHeight: 32,
              padding: "4px 12px",
              background: "var(--alarm)",
              borderColor: "var(--alarm)",
              color: "#fff",
              fontSize: 12,
            }}
          >
            {busy === "__bulk__" ? "Deleting…" : "Delete selected"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="button secondary"
            style={{ minHeight: 32, padding: "4px 12px", fontSize: 12 }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Status / errors */}
      {error && (
        <div
          style={{
            padding: "8px 12px",
            background: "var(--alarm-soft)",
            border: "1px solid var(--border)",
            borderLeft: "2px solid var(--alarm)",
            borderRadius: "var(--r-sm)",
            color: "var(--alarm)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)" }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)" }}>
          No reports.
        </div>
      ) : (
        <div
          className="card"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            overflow: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-elev)" }}>
                <th style={th}>
                  <input
                    type="checkbox"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th style={th}>Report ID</th>
                <th style={th}>Created</th>
                <th style={th}>Category</th>
                <th style={th}>Status</th>
                <th style={th}>Moderation</th>
                <th style={th}>Ward / Locality</th>
                <th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isHidden = row.moderation_state === "hidden";
                const isBusy = busy === row.public_id;
                const sColor = STATUS_COLORS[row.status] || "var(--ink-muted)";
                const catLabel = CATEGORY_LABELS[row.category] || row.category;
                const sLabel = STATUS_LABELS[row.status] || row.status;
                return (
                  <tr
                    key={row.public_id}
                    style={{
                      borderTop: "1px solid var(--border)",
                      opacity: isHidden ? 0.55 : 1,
                    }}
                  >
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.public_id)}
                        onChange={() => toggleSelect(row.public_id)}
                        aria-label={`Select ${row.public_id}`}
                      />
                    </td>
                    <td style={td}>
                      <Link
                        href={`/reports/${row.public_id}`}
                        target="_blank"
                        style={{
                          color: "var(--accent)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          textDecoration: "none",
                        }}
                      >
                        {row.public_id}
                      </Link>
                    </td>
                    <td style={{ ...td, color: "var(--ink-muted)", fontSize: 12 }}>
                      {new Date(row.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={td}>{catLabel}</td>
                    <td style={td}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          color: sColor,
                          padding: "3px 8px",
                          background: `${sColor}1a`,
                          border: `1px solid ${sColor}40`,
                          borderRadius: "var(--r-sm)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {sLabel}
                      </span>
                    </td>
                    <td style={td}>
                      {row.moderation_state && row.moderation_state !== "clean" ? (
                        <span style={{ fontSize: 11, color: "var(--alarm)", fontWeight: 600 }}>
                          {row.moderation_state}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>clean</span>
                      )}
                    </td>
                    <td style={{ ...td, color: "var(--ink-1)", fontSize: 12 }}>
                      {row.ward_id ? <code style={{ fontFamily: "var(--font-mono)" }}>{row.ward_id}</code> : "—"}
                      {row.locality ? <span style={{ color: "var(--ink-muted)" }}> · {row.locality}</span> : null}
                    </td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {isHidden ? (
                        <button
                          onClick={() => restoreReport(row.public_id)}
                          disabled={isBusy}
                          className="button secondary"
                          style={{ minHeight: 28, padding: "2px 10px", fontSize: 11, marginRight: 6 }}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => hideReport(row.public_id)}
                          disabled={isBusy}
                          className="button secondary"
                          style={{ minHeight: 28, padding: "2px 10px", fontSize: 11, marginRight: 6 }}
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => deleteReport(row.public_id)}
                        disabled={isBusy}
                        className="button"
                        style={{
                          minHeight: 28,
                          padding: "2px 10px",
                          fontSize: 11,
                          background: "var(--alarm)",
                          borderColor: "var(--alarm)",
                          color: "#fff",
                        }}
                      >
                        {isBusy ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--ink-muted)", textAlign: "center", marginTop: 8 }}>
        Showing the {rows.length} most recent reports. Hidden reports stay in the DB but disappear from public views.
      </p>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
};
