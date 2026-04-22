"use client";

export type DeptRow = {
  dept: string;
  label: string;
  resolvedPct: number;   // 0..100
  total: number;
};

type Props = {
  title?: string;
  items: DeptRow[];
  emptyMessage?: string;
};

/**
 * Resolution-rate bars per department. Bar color reflects performance:
 *   ≥ 60% good (green), 40–59% warn (amber), < 40% bad (red).
 */
export default function DepartmentResolution({
  title = "Resolution by Department",
  items,
  emptyMessage = "No data yet.",
}: Props) {
  return (
    <section className="panel dept-panel">
      <header className="dept-heading">
        <span className="heading-main">{title}</span>
        <span className="heading-sub">% resolved</span>
      </header>

      {items.length === 0 ? (
        <div className="dept-empty">{emptyMessage}</div>
      ) : (
        <ul className="dept-list">
          {items.map((d) => {
            const pct = Math.max(0, Math.min(100, d.resolvedPct));
            const tone =
              pct >= 60 ? "good" : pct >= 40 ? "warn" : "bad";
            return (
              <li key={d.dept} className="dept-row">
                <span className="label">{d.label}</span>
                <span className={`pct tone-${tone} num`}>{pct}%</span>
                <span className="total num">{d.total.toLocaleString("en-IN")}</span>
                <span className="bar" aria-hidden="true">
                  <span className={`bar-fill tone-${tone}`} style={{ width: `${Math.max(3, pct)}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <style>{`
        .dept-panel { display: flex; flex-direction: column; min-height: 0; }
        .dept-heading {
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
        .dept-list {
          list-style: none;
          margin: 0;
          padding: 0;
          overflow-y: auto;
          flex: 1;
        }
        .dept-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: baseline;
          gap: 10px;
          padding: 9px 14px;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .dept-row:last-child { border-bottom: 0; }
        .label {
          font-weight: 600;
          color: var(--ink-0);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pct {
          font-weight: 700;
          font-size: 13px;
        }
        .pct.tone-good { color: var(--ok); }
        .pct.tone-warn { color: var(--warn); }
        .pct.tone-bad  { color: var(--alarm); }
        .total {
          font-size: 11px;
          color: var(--ink-muted);
          font-weight: 500;
        }
        .bar {
          grid-column: 1 / -1;
          display: block;
          height: 2px;
          background: var(--grid-line);
          margin-top: 6px;
          overflow: hidden;
        }
        .bar-fill { display: block; height: 100%; transition: width 0.4s ease; }
        .bar-fill.tone-good { background: var(--ok); }
        .bar-fill.tone-warn { background: var(--warn); }
        .bar-fill.tone-bad  { background: var(--alarm); }
        .dept-empty { padding: 20px 14px; color: var(--ink-muted); font-size: 12px; }
      `}</style>
    </section>
  );
}
