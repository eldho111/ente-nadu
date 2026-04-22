"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useThemeTokens } from "./useThemeTokens";

export type DailyBucket = {
  date: string;  // ISO yyyy-mm-dd
  count: number;
};

type Props = {
  title?: string;
  subtitle?: string;
  buckets: DailyBucket[];
  height?: number;
};

/**
 * Full-width bottom strip — daily report volume. Recharts BarChart
 * recolors with the active theme via `useThemeTokens()`.
 */
export default function TimeSeriesStrip({
  title = "Reports per Day",
  subtitle = "Last 30 days",
  buckets,
  height = 120,
}: Props) {
  const t = useThemeTokens();

  // Format date labels: "Apr 14" → ticks every ~5 days
  const data = buckets.map((b) => ({
    date: b.date,
    tick: formatTick(b.date),
    count: b.count,
  }));

  const total = buckets.reduce((s, b) => s + b.count, 0);
  const avg = buckets.length ? Math.round(total / buckets.length) : 0;

  return (
    <section className="panel ts-panel">
      <header className="ts-heading">
        <div className="heading-text">
          <span className="heading-main">{title}</span>
          <span className="heading-sub">{subtitle}</span>
        </div>
        <div className="heading-stats num">
          <span>
            <span className="s-label">TOTAL</span>
            <span className="s-value">{total.toLocaleString("en-IN")}</span>
          </span>
          <span>
            <span className="s-label">AVG/DAY</span>
            <span className="s-value">{avg.toLocaleString("en-IN")}</span>
          </span>
        </div>
      </header>

      {buckets.length === 0 ? (
        <div className="ts-empty">No activity in the last 30 days.</div>
      ) : (
        <div style={{ width: "100%", height, padding: "8px 10px 4px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                stroke={t.gridLine}
                strokeDasharray="0"
              />
              <XAxis
                dataKey="tick"
                tick={{ fill: t.inkMuted, fontSize: 10, fontFamily: "inherit" }}
                axisLine={{ stroke: t.gridLine }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: t.inkMuted, fontSize: 10, fontFamily: "inherit" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ fill: t.theme === "dark" ? "#ffffff10" : "#0b0b0d08" }}
                contentStyle={{
                  background: t.bgSurface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 4,
                  fontSize: 11,
                  color: t.ink0,
                  padding: "6px 10px",
                  fontFamily: "inherit",
                }}
                labelFormatter={(v) => String(v ?? "")}
                formatter={(val) => {
                  const n = typeof val === "number" ? val : Number(val) || 0;
                  return [n.toLocaleString("en-IN"), "Reports"];
                }}
              />
              <Bar dataKey="count" fill={t.alarm} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <style>{`
        .ts-panel { display: flex; flex-direction: column; }
        .ts-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
        }
        .heading-text {
          display: flex;
          align-items: baseline;
          gap: 10px;
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
        .heading-stats {
          display: flex;
          gap: 16px;
          font-size: 11px;
        }
        .heading-stats > span {
          display: inline-flex;
          flex-direction: column;
          gap: 1px;
          align-items: flex-end;
        }
        .s-label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-muted);
          font-weight: 700;
        }
        .s-value {
          font-size: 14px;
          font-weight: 800;
          color: var(--ink-0);
          letter-spacing: -0.01em;
        }
        .ts-empty {
          padding: 24px 14px;
          color: var(--ink-muted);
          font-size: 12px;
          text-align: center;
        }
      `}</style>
    </section>
  );
}

function formatTick(isoDate: string): string {
  // "2026-04-14" → "Apr 14"
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
