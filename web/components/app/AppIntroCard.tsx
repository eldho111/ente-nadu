"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * What-the-app-does intro card for mobile home.
 *
 * Shown on first visit, persists "dismissed" state in localStorage so
 * regulars don't see it every time. All copy is locale-driven (see
 * lib/i18n.ts — appIntro* keys).
 */
type Props = {
  eyebrow: string;
  title: string;
  body: string;
  step1: string;
  step2: string;
  step3: string;
  cta: string;
  dismiss: string;
};

const STORAGE_KEY = "ente-nadu.intro-dismissed";

export default function AppIntroCard({
  eyebrow,
  title,
  body,
  step1,
  step2,
  step3,
  cta,
  dismiss,
}: Props) {
  // Start hidden on SSR to avoid flash; reveal client-side if not dismissed.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  const hide = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // storage blocked — fine, they'll see it again next time
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      aria-labelledby="intro-title"
      style={{
        position: "relative",
        padding: "16px 16px 14px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--alarm)",
        borderRadius: "var(--r-sm)",
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--alarm)",
            fontFamily: "var(--font-body)",
          }}
        >
          {eyebrow}
        </span>
        <button
          type="button"
          onClick={hide}
          aria-label={dismiss}
          style={{
            appearance: "none",
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--ink-muted)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          {dismiss}
        </button>
      </div>

      <h2
        id="intro-title"
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.28,
          color: "var(--ink-0)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--ink-1)" }}>
        {body}
      </p>

      <ol
        style={{
          margin: "2px 0 0",
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 6,
          fontSize: 12,
          color: "var(--ink-1)",
          lineHeight: 1.45,
        }}
      >
        {[step1, step2, step3].map((s, i) => (
          <li
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "22px 1fr",
              gap: 8,
              alignItems: "start",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "var(--alarm)",
                textAlign: "center",
                padding: "2px 0",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <Link
        href="/app/report"
        style={{
          marginTop: 4,
          display: "inline-block",
          padding: "10px 14px",
          background: "var(--alarm)",
          color: "#ffffff",
          textDecoration: "none",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderRadius: "var(--r-sm)",
          textAlign: "center",
          fontFamily: "var(--font-body)",
        }}
      >
        {cta}
      </Link>
    </section>
  );
}
