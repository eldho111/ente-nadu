"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "ente-nadu-theme";

/**
 * Two-button pill: sun (light) / moon (dark).
 * - Respects `localStorage` first, then `prefers-color-scheme`, else dark.
 * - Persists on click.
 * - Stamps `data-theme` on <html>.
 * - Dispatches a `theme-change` CustomEvent so map/charts can re-theme live.
 *
 * The no-FOUC boot script in app/layout.tsx has already set the attribute
 * on first paint — this component just syncs React state to that value and
 * handles user-initiated changes.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setTheme(current);
    setMounted(true);
  }, []);

  const apply = (next: Theme) => {
    if (next === theme) return;
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage disabled; non-fatal */
    }
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: next } }));
  };

  // Avoid hydration mismatch flash — render the button frame immediately,
  // but don't show a specific active state until we've synced.
  const activeLight = mounted && theme === "light";
  const activeDark = mounted && theme === "dark";

  return (
    <div
      role="group"
      aria-label="Theme"
      style={{
        display: "inline-flex",
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 999,
        padding: 2,
        gap: 2,
      }}
    >
      <button
        type="button"
        onClick={() => apply("light")}
        aria-pressed={activeLight}
        aria-label="Light theme"
        title="Light"
        style={buttonStyle(activeLight)}
      >
        <SunIcon />
      </button>
      <button
        type="button"
        onClick={() => apply("dark")}
        aria-pressed={activeDark}
        aria-label="Dark theme"
        title="Dark"
        style={buttonStyle(activeDark)}
      >
        <MoonIcon />
      </button>
    </div>
  );
}

function buttonStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: active ? "var(--bg-surface)" : "transparent",
    color: active ? "var(--ink-0)" : "var(--ink-muted)",
    boxShadow: active ? "var(--shadow-sm)" : "none",
    transition: "background-color 0.12s ease, color 0.12s ease",
    padding: 0,
    fontFamily: "inherit",
  };
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
