"use client";

import Link from "next/link";

export type Hotspot = {
  ward: string;
  count: number;
  href?: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  items: Hotspot[];
  emptyMessage?: string;
};

/**
 * Ranked vertical list with inline mini bars — one row per ward, sorted
 * descending by count. Each row's bar is drawn as a percentage of the
 * leader's count, which makes the distribution legible at a glance.
 *
 * Column: left sidebar of the ops dashboard.
 */
export default function HotspotList({
  title = "Hotspots by Ward",
  subtitle = "Open reports",
  items,
  emptyMessage = "No hotspots yet.",
}: Props) {
  const max = items.length ? items[0].count : 0;

  return (
    <section className="panel hotspot-panel">
      <header className="hotspot-heading">
        <span className="heading-main">{title}</span>
        <span className="heading-sub">{subtitle}</span>
      </header>

      {items.length === 0 ? (
        <div className="hotspot-empty">{emptyMessage}</div>
      ) : (
        <ol className="hotspot-list" aria-label={title}>
          {items.map((h, idx) => {
            const pct = max === 0 ? 0 : Math.max(4, Math.round((h.count / max) * 100));
            const content = (
              <>
                <span className="rank num">{String(idx + 1).padStart(2, "0")}</span>
                <span className="ward">{h.ward}</span>
                <span className="count num">{h.count.toLocaleString("en-IN")}</span>
                <span className="bar" aria-hidden="true">
                  <span className="bar-fill" style={{ width: `${pct}%` }} />
                </span>
              </>
            );
            return (
              <li key={`${h.ward}-${idx}`} className="hotspot-row">
                {h.href ? (
                  <Link href={h.href} className="row-link">{content}</Link>
                ) : (
                  <div className="row-static">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <style>{`
        .hotspot-panel {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .hotspot-heading {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          gap: 8px;
        }
        .heading-main {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-0);
        }
        .heading-sub {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-muted);
          font-weight: 400;
        }
        .hotspot-list {
          list-style: none;
          margin: 0;
          padding: 0;
          overflow-y: auto;
          flex: 1;
        }
        .hotspot-row {
          border-bottom: 1px solid var(--border);
        }
        .hotspot-row:last-child { border-bottom: 0; }
        .row-link, .row-static {
          position: relative;
          display: grid;
          grid-template-columns: 22px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 11px 18px;
          color: var(--ink-0);
          text-decoration: none;
          font-size: 13px;
          transition: background-color 0.15s ease;
        }
        .row-link:hover { background: var(--bg-elev); text-decoration: none; }
        .rank {
          font-size: 10px;
          color: var(--ink-muted);
          font-weight: 400;
          letter-spacing: 0.06em;
          font-variant-numeric: tabular-nums;
        }
        .ward {
          font-weight: 500;
          color: var(--ink-0);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .count {
          font-weight: 500;
          color: var(--alarm);
          font-size: 13px;
          letter-spacing: 0.02em;
        }
        .bar {
          grid-column: 2 / -1;
          display: block;
          height: 1px;
          background: var(--grid-line);
          margin-top: 8px;
          overflow: hidden;
        }
        .bar-fill {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, var(--alarm), var(--alarm-deep));
          box-shadow: 0 0 8px var(--alarm-glow);
          transition: width 0.4s ease;
        }
        .hotspot-empty {
          padding: 20px 14px;
          color: var(--ink-muted);
          font-size: 12px;
        }
      `}</style>
    </section>
  );
}
