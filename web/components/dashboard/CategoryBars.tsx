"use client";

export type CategoryRow = {
  category: string;
  label: string;
  count: number;
};

type Props = {
  title?: string;
  items: CategoryRow[];
  emptyMessage?: string;
  /** Optional accent color for bars. Defaults to alarm red. */
  color?: string;
};

/**
 * Horizontal-bar breakdown of reports by category. Simple CSS-drawn bars
 * (no chart library) — matches the Hotspot list visually and keeps bundle lean.
 */
export default function CategoryBars({
  title = "Category Breakdown",
  items,
  emptyMessage = "No data yet.",
  color = "var(--accent)",
}: Props) {
  const max = items.reduce((m, x) => Math.max(m, x.count), 0);

  return (
    <section className="panel category-panel">
      <header className="category-heading">
        <span className="heading-main">{title}</span>
        <span className="heading-sub">Total reports</span>
      </header>

      {items.length === 0 ? (
        <div className="category-empty">{emptyMessage}</div>
      ) : (
        <ul className="category-list">
          {items.map((c) => {
            const pct = max === 0 ? 0 : Math.max(3, Math.round((c.count / max) * 100));
            return (
              <li key={c.category} className="category-row">
                <span className="label">{c.label}</span>
                <span className="count num">{c.count.toLocaleString("en-IN")}</span>
                <span className="bar" aria-hidden="true">
                  <span
                    className="bar-fill"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <style>{`
        .category-panel { display: flex; flex-direction: column; min-height: 0; }
        .category-heading {
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
        .category-list {
          list-style: none;
          margin: 0;
          padding: 0;
          overflow-y: auto;
          flex: 1;
        }
        .category-row {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: baseline;
          gap: 12px;
          padding: 11px 18px;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .category-row:last-child { border-bottom: 0; }
        .label {
          font-weight: 500;
          color: var(--ink-0);
          text-transform: capitalize;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .count {
          font-weight: 500;
          color: var(--ink-0);
          letter-spacing: 0.02em;
        }
        .bar {
          grid-column: 1 / -1;
          display: block;
          height: 1px;
          background: var(--grid-line);
          margin-top: 8px;
          overflow: hidden;
        }
        .bar-fill {
          display: block;
          height: 100%;
          box-shadow: 0 0 8px var(--accent-glow);
          transition: width 0.4s ease;
        }
        .category-empty { padding: 20px 18px; color: var(--ink-muted); font-size: 12px; }
      `}</style>
    </section>
  );
}
