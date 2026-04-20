"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getPublicApiBase } from "@/lib/api";

type OpsProfile = {
  firebase_uid: string;
  role: "super_admin" | "dept_manager" | "field_officer" | "viewer";
  department_name: string | null;
  display_name: string | null;
};

type OpsReport = {
  id: string;
  public_id: string;
  category: string;
  status: string;
  severity_ai: number | null;
  confidence: number | null;
  ward_id: string | null;
  zone_id: string | null;
  locality: string | null;
  created_at: string;
  assigned_official_id: string | null;
};

const API_BASE = getPublicApiBase();

const STATUS_FILTERS = ["", "open", "acknowledged", "in_progress", "fixed", "rejected"];

export default function OpsInboxPage() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<OpsProfile | null>(null);
  const [reports, setReports] = useState<OpsReport[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const existing = localStorage.getItem("ops_id_token");
    if (existing) {
      setToken(existing);
    }
  }, []);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  const login = async () => {
    if (!token.trim()) {
      setMessage("Enter a Firebase ID token");
      return;
    }
    setBusy(true);
    setMessage("Checking official access...");
    try {
      const response = await fetch(`${API_BASE}/v1/ops/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: token.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Login failed");
      }
      const data = await response.json();
      localStorage.setItem("ops_id_token", token.trim());
      setProfile(data);
      setMessage("Official access granted.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Login failed";
      setProfile(null);
      setMessage(detail);
    } finally {
      setBusy(false);
    }
  };

  const loadReports = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const response = await fetch(`${API_BASE}/v1/ops/reports?${params.toString()}`, {
        headers: authHeaders,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to load reports");
      }
      const data = await response.json();
      setReports(data.items || []);
      setMessage(`Loaded ${data.items?.length ?? 0} reports`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to load reports";
      setMessage(detail);
    } finally {
      setBusy(false);
    }
  }, [authHeaders, statusFilter, token]);

  useEffect(() => {
    if (profile) {
      loadReports();
    }
  }, [profile, loadReports]);

  const claimReport = async (publicId: string) => {
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/v1/ops/reports/${publicId}/claim`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Claim failed");
      }
      setMessage(`Claimed report ${publicId}`);
      await loadReports();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Claim failed";
      setMessage(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <section className="hero">
        <h1>Receiver Action Inbox</h1>
        <p>Official interface for claim, status updates, and resolution tracking.</p>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Official Login</h2>
        <p className="muted" style={{ margin: 0 }}>
          Use a Firebase ID token mapped to an `official_users` record.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="password"
            placeholder="Paste Firebase ID token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            style={{ flex: "1 1 360px", minHeight: 38, borderRadius: 8, border: "1px solid #d5ccb7", padding: "0 10px" }}
          />
          <button className="button" onClick={login} disabled={busy}>
            Verify Access
          </button>
        </div>
        {profile && (
          <div className="chip" style={{ width: "fit-content" }}>
            {profile.display_name || profile.firebase_uid} - {profile.role}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Inbox</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="statusFilter" className="muted" style={{ fontSize: 13 }}>
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ minHeight: 34, borderRadius: 8, border: "1px solid #d5ccb7", padding: "0 8px" }}
            >
              {STATUS_FILTERS.map((status) => (
                <option value={status} key={status || "all"}>
                  {status || "all"}
                </option>
              ))}
            </select>
            <button className="button secondary" onClick={loadReports} disabled={busy || !profile}>
              Refresh
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {reports.map((report) => (
            <article key={report.id} className="reportCard" style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>{report.public_id}</h3>
                <span className="chip">{report.status}</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {report.category.replaceAll("_", " ")} | Ward {report.ward_id || "N/A"} | Zone {report.zone_id || "N/A"}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Severity: {report.severity_ai ?? "N/A"} / 5 | Confidence: {report.confidence ? `${Math.round(report.confidence * 100)}%` : "N/A"}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="button secondary" onClick={() => claimReport(report.public_id)} disabled={busy || !profile}>
                  Claim
                </button>
                <Link href={`/ops/reports/${report.public_id}`} className="button">
                  Open
                </Link>
              </div>
            </article>
          ))}
          {reports.length === 0 && <p className="muted">No reports to display.</p>}
        </div>
      </section>

      {message && (
        <p className="muted" style={{ marginTop: 12 }}>
          {message}
        </p>
      )}
    </main>
  );
}
