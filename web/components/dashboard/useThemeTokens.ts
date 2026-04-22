"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to the current design-token values so theme-sensitive
 * third-party components (Recharts, MapLibre markers) can restyle
 * live when the user flips themes.
 *
 * The values returned are resolved from CSS custom properties on
 * <html> at the moment this hook reads them, which means any change
 * to [data-theme] re-triggers the hook via the `theme-change` event
 * dispatched by ThemeToggle.
 */
export type ThemeTokens = {
  theme: "light" | "dark";
  bg0: string;
  bgSurface: string;
  bgSunken: string;
  ink0: string;
  ink1: string;
  inkMuted: string;
  border: string;
  gridLine: string;
  alarm: string;
  warn: string;
  ok: string;
  info: string;
};

const DEFAULT_DARK: ThemeTokens = {
  theme: "dark",
  bg0: "#0b0b0d",
  bgSurface: "#16171a",
  bgSunken: "#070708",
  ink0: "#f1f3f5",
  ink1: "#b8bcc2",
  inkMuted: "#6b7078",
  border: "#2a2d33",
  gridLine: "#1f2126",
  alarm: "#e63946",
  warn: "#f59e0b",
  ok: "#22c55e",
  info: "#3b82f6",
};

function readTokens(): ThemeTokens {
  if (typeof window === "undefined") return DEFAULT_DARK;
  const el = document.documentElement;
  const styles = getComputedStyle(el);
  const pick = (name: string, fallback: string) => {
    const v = styles.getPropertyValue(name).trim();
    return v || fallback;
  };
  const theme = (el.getAttribute("data-theme") as "light" | "dark") || "dark";
  return {
    theme,
    bg0:        pick("--bg-0", DEFAULT_DARK.bg0),
    bgSurface:  pick("--bg-surface", DEFAULT_DARK.bgSurface),
    bgSunken:   pick("--bg-sunken", DEFAULT_DARK.bgSunken),
    ink0:       pick("--ink-0", DEFAULT_DARK.ink0),
    ink1:       pick("--ink-1", DEFAULT_DARK.ink1),
    inkMuted:   pick("--ink-muted", DEFAULT_DARK.inkMuted),
    border:     pick("--border", DEFAULT_DARK.border),
    gridLine:   pick("--grid-line", DEFAULT_DARK.gridLine),
    alarm:      pick("--alarm", DEFAULT_DARK.alarm),
    warn:       pick("--warn", DEFAULT_DARK.warn),
    ok:         pick("--ok", DEFAULT_DARK.ok),
    info:       pick("--info", DEFAULT_DARK.info),
  };
}

export function useThemeTokens(): ThemeTokens {
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_DARK);

  useEffect(() => {
    setTokens(readTokens());
    const handler = () => setTokens(readTokens());
    window.addEventListener("theme-change", handler);
    // Also listen for system-preference changes when the user has no override.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", handler);
    return () => {
      window.removeEventListener("theme-change", handler);
      mq.removeEventListener?.("change", handler);
    };
  }, []);

  return tokens;
}
