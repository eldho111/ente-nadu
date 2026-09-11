"use client";

/**
 * Countdown — a live-ticking days / hours / minutes / seconds timer to
 * a target date. Handles empty and past dates gracefully:
 *  - No date set → prompts the family to fill it in Settings.
 *  - Date in the past → flips to a soft "X days ago" note without any
 *    ticker (there is nothing left to count down to).
 *
 * The ticker updates every second, but only when the tab is visible —
 * a hidden tab does not need a running interval.
 */

import { useEffect, useMemo, useState } from "react";

type Tone = "sage" | "gold";

function targetTime(dateISO: string): number | null {
  if (!dateISO) return null;
  // Interpret the date as local midnight so IST users don't see a
  // one-day drift the way `new Date("2026-10-10")` (UTC midnight) would
  // give them. Splitting parts and constructing locally avoids that.
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function useTicker(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let id: number | undefined;
    let visible = typeof document === "undefined" || !document.hidden;
    const tick = () => setNow(Date.now());
    const start = () => {
      if (id === undefined) id = window.setInterval(tick, 1000) as unknown as number;
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    if (visible) start();
    const onVis = () => {
      visible = !document.hidden;
      if (visible) {
        // Immediate tick so the display isn't stale after the tab wakes.
        setNow(Date.now());
        start();
      } else {
        stop();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);
  return now;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function Countdown({
  label,
  dateISO,
  tone = "sage",
}: {
  label: string;
  dateISO: string;
  tone?: Tone;
}) {
  const target = useMemo(() => targetTime(dateISO), [dateISO]);
  const active = target !== null && target > Date.now();
  const now = useTicker(active);

  if (target === null) {
    return (
      <div className={`wCd wCd-${tone} wCd-empty`}>
        <div className="wCdLabel">{label}</div>
        <div className="wCdEmpty">Set a date in Settings to start the countdown</div>
      </div>
    );
  }

  const diff = target - now;
  if (diff <= 0) {
    // Same-day + past
    const daysPast = Math.max(0, Math.round(-diff / (1000 * 60 * 60 * 24)));
    const past = daysPast === 0 ? "Today" : `${daysPast} day${daysPast === 1 ? "" : "s"} ago`;
    return (
      <div className={`wCd wCd-${tone} wCd-past`}>
        <div className="wCdLabel">{label}</div>
        <div className="wCdPast">{past}</div>
        <div className="wCdDate">
          {new Date(target).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>
    );
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className={`wCd wCd-${tone}`}>
      <div className="wCdLabel">{label}</div>
      <div className="wCdGrid" role="timer" aria-live="off">
        <div className="wCdCell">
          <div className="wCdNum">{days}</div>
          <div className="wCdUnit">days</div>
        </div>
        <div className="wCdCell">
          <div className="wCdNum">{pad(hours)}</div>
          <div className="wCdUnit">hours</div>
        </div>
        <div className="wCdCell">
          <div className="wCdNum">{pad(minutes)}</div>
          <div className="wCdUnit">min</div>
        </div>
        <div className="wCdCell">
          <div className="wCdNum">{pad(seconds)}</div>
          <div className="wCdUnit">sec</div>
        </div>
      </div>
      <div className="wCdDate">
        {new Date(target).toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
    </div>
  );
}
