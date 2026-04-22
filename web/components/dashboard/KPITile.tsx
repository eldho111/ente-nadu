"use client";

import Link from "next/link";

type Variant = "default" | "open" | "progress" | "fixed" | "info";

type Props = {
  value: number | string;
  label: string;
  sublabel?: string;          // e.g. Malayalam subtitle or unit
  variant?: Variant;
  trendPct?: number;          // e.g. +12 for 12% up, -3 for 3% down
  trendLabel?: string;        // "vs last week" etc.
  href?: string;              // if set, tile is a link
};

/**
 * JHU-style big-number tile. Tabular numerics, small caps label,
 * thin colored top-border that hints at status. Zero decoration.
 *
 * For the OPEN variant, an "up" trend is colored red (bad — more open
 * reports is worse). For FIXED, an "up" trend is green. The `variant`
 * drives both the top-border color and the trend semantics.
 */
export default function KPITile({
  value,
  label,
  sublabel,
  variant = "default",
  trendPct,
  trendLabel,
  href,
}: Props) {
  const trend =
    typeof trendPct === "number" && !Number.isNaN(trendPct)
      ? {
          sign: trendPct > 0 ? "▲" : trendPct < 0 ? "▼" : "■",
          text: `${trendPct > 0 ? "+" : ""}${trendPct}%`,
          // For "open" tiles, UP means WORSE (red). For "fixed", UP means BETTER (green).
          // Default/info: neutral.
          tone:
            variant === "open"
              ? trendPct > 0
                ? "bad"
                : trendPct < 0
                  ? "good"
                  : "neutral"
              : variant === "fixed"
                ? trendPct > 0
                  ? "good"
                  : trendPct < 0
                    ? "bad"
                    : "neutral"
                : "neutral",
        }
      : null;

  const body = (
    <>
      <div className="kpi-label">
        <span>{label}</span>
        {sublabel ? <span className="kpi-sublabel">{sublabel}</span> : null}
      </div>
      <div className="kpi-value num">{formatValue(value)}</div>
      {trend ? (
        <div className={`kpi-trend tone-${trend.tone} num`}>
          <span className="kpi-trend-arrow">{trend.sign}</span>
          <span>{trend.text}</span>
          {trendLabel ? <span className="kpi-trend-label">{trendLabel}</span> : null}
        </div>
      ) : (
        <div className="kpi-trend" aria-hidden="true">&nbsp;</div>
      )}

      <style>{`
        .kpi-tile-inner {
          position: relative;
          isolation: isolate;
          display: grid;
          gap: 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          padding: 20px 22px 22px;
          border-radius: var(--r-sm);
          min-height: 138px;
          text-decoration: none;
          color: var(--ink-0);
          overflow: hidden;
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }
        .kpi-tile-inner::before {
          content: "";
          position: absolute;
          top: 45%;
          left: 55%;
          width: 180px;
          height: 180px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, var(--glow-color, var(--accent-glow)) 0%, transparent 70%);
          opacity: 0.45;
          pointer-events: none;
          z-index: 0;
          transition: opacity 0.3s ease;
        }
        .kpi-tile-inner > * {
          position: relative;
          z-index: 1;
        }
        .kpi-tile-inner.has-link:hover {
          border-color: var(--accent);
          text-decoration: none;
        }
        .kpi-tile-inner.has-link:hover::before {
          opacity: 0.75;
        }
        .kpi-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ink-muted);
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }
        .kpi-sublabel {
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: none;
          font-size: 10px;
          color: var(--ink-muted);
        }
        .kpi-value {
          font-size: clamp(40px, 5.4vw, 64px);
          font-weight: 300;
          line-height: 1;
          letter-spacing: -0.035em;
          color: var(--value-color, var(--ink-0));
        }
        .kpi-trend {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          display: flex;
          align-items: baseline;
          gap: 6px;
          min-height: 14px;
        }
        .kpi-trend-arrow {
          font-size: 9px;
        }
        .kpi-trend-label {
          color: var(--ink-muted);
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .kpi-trend.tone-bad    { color: var(--alarm); }
        .kpi-trend.tone-good   { color: var(--gold); }
        .kpi-trend.tone-neutral{ color: var(--ink-1); }
      `}</style>
    </>
  );

  // Per-variant value color + glow color. Neutral/info default to cyan wash.
  const tileStyle: React.CSSProperties = {
    ["--value-color" as string]:
      variant === "open"
        ? "var(--alarm)"
        : variant === "fixed"
          ? "var(--gold)"
          : variant === "progress" || variant === "info"
            ? "var(--accent)"
            : "var(--ink-0)",
    ["--glow-color" as string]:
      variant === "open"
        ? "var(--alarm-glow)"
        : variant === "fixed"
          ? "var(--gold-glow)"
          : "var(--accent-glow)",
  };

  if (href) {
    return (
      <Link href={href} className="kpi-tile-inner has-link" style={tileStyle}>
        {body}
      </Link>
    );
  }
  return (
    <div className="kpi-tile-inner" style={tileStyle}>
      {body}
    </div>
  );
}

function formatValue(v: number | string): string {
  if (typeof v === "string") return v;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-IN");
}
