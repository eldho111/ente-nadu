"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getPublicApiBase, ReportDetail } from "@/lib/api";

const API_BASE = getPublicApiBase();
const STATUS_OPTIONS = ["acknowledged", "in_progress", "fixed", "rejected", "open"];

export default function OpsReportDetailPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [token, setToken] = useState("");
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [nextStatus, setNextStatus] = useState("acknowledged");
  const [statusNote, setStatusNote] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const existing = localStorage.getItem("ops_id_token") || "";
    setToken(existing);
  }, []);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  const loadReport = async () => {
    if (!publicId) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/v1/reports/${publicId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch report");
      }
      setReport(data);
      setNextStatus(data.status === "open" ? "acknowledged" : "in_progress");
      setMessage("");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to fetch report";
      setMessage(detail);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  const claim = async () => {
    if (!token) {
      setMessage("Missing ops token");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/v1/ops/reports/${publicId}/claim`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Claim failed");
      }
      setMessage("Report claimed.");
      await loadReport();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Claim failed";
      setMessage(detail);
    } finally {
      setBusy(false);
    }
  };

  const addProof = async () => {
    if (!token) {
      setMessage("Missing ops token");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/v1/ops/reports/${publicId}/resolution-proof`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          note: proofNote || null,
          media_url: proofUrl || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to add proof");
      }
      setMessage(`Resolution proof saved (${data.proof_id}).`);
      setProofNote("");
      setProofUrl("");
      await loadReport();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Failed to add proof";
      setMessage(detail);
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async () => {
    if (!token) {
      setMessage("Missing ops token");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE}/v1/ops/reports/${publicId}/status`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          status: nextStatus,
          note: statusNote || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Status update failed");
      }
      setMessage(data.message || "Status updated.");
      setStatusNote("");
      await loadReport();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Status update failed";
      setMessage(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <section className="hero">
        <h1>Ops Report Detail</h1>
        <p>Claim, attach resolution proof, and move status with audit timeline.</p>
      </section>

      <p style={{ marginTop: 0 }}>
        <Link href="/ops" className="button secondary">
          Back to Inbox
        </Link>
      </p>

      {!report && <p className="muted">Loading report...</p>}

      {report && (
        <div style={{ display: "grid", gap: 14 }}>
          <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {report.public_id} <span className="chip">{report.status}</span>
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              Category: {report.category_final.replaceAll("_", " ")}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Ward {report.ward_id || "N/A"} | Zone {report.zone_id || "N/A"} | Severity {report.severity_ai ?? "N/A"} / 5
            </p>
            <p style={{ margin: 0 }}>{report.description_ai || report.description_user || "No description."}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="button secondary" onClick={claim} disabled={busy}>
                Claim
              </button>
              <a className="button secondary" href={`${API_BASE}/v1/reports/${report.public_id}/notify/email`} target="_blank" rel="noreferrer">
                Preview Email Notify
              </a>
            </div>
          </section>

          <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Resolution Proof</h3>
            <textarea
              rows={3}
              value={proofNote}
              onChange={(event) => setProofNote(event.target.value)}
              placeholder="Add proof note"
              style={{ borderRadius: 8, border: "1px solid #d5ccb7", padding: 10 }}
            />
            <input
              value={proofUrl}
              onChange={(event) => setProofUrl(event.target.value)}
              placeholder="Optional evidence URL"
              style={{ borderRadius: 8, border: "1px solid #d5ccb7", minHeight: 36, padding: "0 10px" }}
            />
            <button className="button" onClick={addProof} disabled={busy}>
              Save Proof
            </button>
          </section>

          <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Status Transition</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                style={{ minHeight: 36, borderRadius: 8, border: "1px solid #d5ccb7", padding: "0 8px" }}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
              <input
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                placeholder="Optional status note"
                style={{ flex: "1 1 220px", minHeight: 36, borderRadius: 8, border: "1px solid #d5ccb7", padding: "0 10px" }}
              />
              <button className="button" onClick={updateStatus} disabled={busy}>
                Update Status
              </button>
            </div>
          </section>

          <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0 }}>Timeline</h3>
            {(report.events || []).map((event) => (
              <div key={event.id} style={{ padding: "8px 0", borderBottom: "1px solid #ece4d0" }}>
                <strong>{event.event_type}</strong>
                <div className="muted">{new Date(event.created_at).toLocaleString("en-IN")}</div>
              </div>
            ))}
          </section>
        </div>
      )}

      {message && (
        <p className="muted" style={{ marginTop: 12 }}>
          {message}
        </p>
      )}
    </main>
  );
}
