"use client";

import Link from "next/link";

export type ReportRow = {
  publicId: string;
  category: string;
  categoryLabel: string;
  categoryIcon?: string;
  status: string;
  statusLabel: string;
  ward?: string | null;
  createdAt: string;        // ISO
  slaTarget?: string | null; // human text like "2h left" / "8h overdue"
};

type Props = {
  title?: string;
  subtitle?: string;
  rows: ReportRow[];
  maxRows?: number;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Dense, scannable report table. Replaces the old 18-card grid.
 * On mobile it collapses to stacked rows (grid → block).
 */
export default function ReportTable({
  title = "Recent Reports",
  subtitle = "Live feed",
  rows,
  maxRows = 20,
}: Props) {
  const trimmed = rows.slice(0, maxRows);

  return (
    <section className="panel rt-panel">
      <header className="rt-heading">
        <span className="heading-main">{title}</span>
        <span className="heading-sub">{subtitle}</span>
      </header>

      {trimmed.length === 0 ? (
        <div className="rt-empty">No reports yet. Be the first to file one.</div>
      ) : (
        <div className="rt-scroll">
          <table className="rt-table" role="grid">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Ref #</th>
                <th scope="col">Category</th>
                <th scope="col">Ward</th>
                <th scope="col">Status</th>
                <th scope="col">Logged</th>
              </tr>
            </thead>
            <tbody>
              {trimmed.map((r) => {
                const statusKey =
                  r.status === "open" ? "open" :
                  r.status === "fixed" ? "fixed" :
                  r.status === "rejected" ? "rejected" :
                  "progress";
                return (
                  <tr key={r.publicId} className="rt-row">
                    <td className="time num">{fmtTime(r.createdAt)}</td>
                    <td className="ref num">
                      <Link href={`/reports/${r.publicId}`}>{r.publicId}</Link>
                    </td>
                    <td className="cat">
                      {r.categoryIcon ? <span className="catIcon" aria-hidden="true">{r.categoryIcon}</span> : null}
                      <span className="catLabel">{r.categoryLabel}</span>
                    </td>
                    <td className="ward">{r.ward || "—"}</td>
                    <td>
                      <span className={`pill ${statusKey}`}>{r.statusLabel}</span>
                    </td>
                    <td className="logged">{fmtDate(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .rt-panel { display: flex; flex-direction: column; }
        .rt-heading {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          gap: 8px;
        }
        .heading-main {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-0);
        }
        .heading-sub {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-muted);
        }
        .rt-scroll { overflow-x: auto; }
        .rt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        thead th {
          text-align: left;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-muted);
          font-weight: 700;
          padding: 8px 14px;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          background: var(--bg-surface);
        }
        tbody .rt-row { border-bottom: 1px solid var(--border); }
        tbody .rt-row:last-child { border-bottom: 0; }
        tbody .rt-row:hover { background: var(--bg-elev); }
        tbody td {
          padding: 8px 14px;
          color: var(--ink-0);
          vertical-align: middle;
          white-space: nowrap;
        }
        .time {
          color: var(--ink-muted);
          font-family: var(--font-mono);
          font-size: 12px;
          width: 72px;
        }
        .ref a {
          color: var(--ink-1);
          font-family: var(--font-mono);
          font-size: 12px;
          text-decoration: none;
        }
        .ref a:hover { color: var(--alarm); text-decoration: underline; }
        .cat {
          display: flex;
          align-items: center;
          gap: 6px;
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .catIcon { font-size: 14px; opacity: 0.9; }
        .catLabel { text-transform: capitalize; font-weight: 600; }
        .ward {
          color: var(--ink-1);
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .logged {
          color: var(--ink-muted);
          font-size: 11px;
          letter-spacing: 0.02em;
          width: 80px;
        }
        .rt-empty {
          padding: 24px 14px;
          color: var(--ink-muted);
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 640px) {
          thead { display: none; }
          tbody .rt-row {
            display: grid;
            grid-template-columns: auto 1fr auto;
            grid-template-areas:
              "time ref status"
              "cat  cat  ward"
              "logged logged logged";
            gap: 4px 10px;
            padding: 10px 14px;
          }
          tbody td { padding: 0; border: none; white-space: normal; }
          .time   { grid-area: time; }
          .ref    { grid-area: ref; }
          .cat    { grid-area: cat; }
          .ward   { grid-area: ward; text-align: right; }
          .logged { grid-area: logged; width: auto; }
          td:nth-child(5) { grid-area: status; text-align: right; }
        }
      `}</style>
    </section>
  );
}
