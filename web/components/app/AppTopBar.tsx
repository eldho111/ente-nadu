import Link from "next/link";

import ThemeToggle from "@/components/dashboard/ThemeToggle";

type Props = {
  title: string;
  subtitle?: string;
};

/**
 * Mobile app-mode top bar. Dark institutional chrome to match the
 * civic-ops dashboard on desktop. Single red live dot, minimalist
 * wordmark, theme toggle on the right.
 */
export default function AppTopBar({ title, subtitle }: Props) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "var(--bg-0)",
        color: "var(--ink-0)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "var(--ink-0)",
            flex: 1,
          }}
          aria-label={title}
        >
          <span className="live-dot" aria-hidden="true" />
          <span style={{ display: "grid", gap: 1, lineHeight: 1.05 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.08em",
                color: "var(--ink-0)",
              }}
            >
              ENTE NADU
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              Civic Ops · Kerala
            </span>
          </span>
        </Link>

        <ThemeToggle />
      </div>

      {subtitle ? (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "5px 14px 6px",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </header>
  );
}
