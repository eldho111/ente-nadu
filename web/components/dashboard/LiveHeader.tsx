"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ThemeToggle from "./ThemeToggle";
import { LOCALE_LABELS, Locale, getMessages, resolveLocale } from "@/lib/i18n";

type NavItem = { href: string; label: string };

/**
 * Thin institutional header for the civic-ops dashboard.
 * - Red dot + "ENTE NADU" wordmark (no pictorial logo).
 * - Tiny Malayalam subtitle "എന്റെ നാട്" — single concession to brand identity.
 * - Live dot + clock on the right.
 * - Nav + locale select + theme toggle.
 *
 * Hidden on /app routes — the mobile app mode uses its own AppTopBar.
 */
export default function LiveHeader() {
  const pathname = usePathname();
  const isAppRoute = pathname?.startsWith("/app") ?? false;

  const [locale, setLocale] = useState<Locale>("en");
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    if (isAppRoute) return;
    // Load locale preference
    let stored: string | null = null;
    try { stored = localStorage.getItem("locale"); } catch { /* noop */ }
    if (stored) {
      setLocale(resolveLocale(stored));
    } else {
      const cookieValue = document.cookie
        .split(";")
        .map((chunk) => chunk.trim())
        .find((chunk) => chunk.startsWith("locale="))
        ?.split("=")[1];
      setLocale(resolveLocale(cookieValue));
    }
  }, [isAppRoute]);

  // Tick the live clock every 30s. IST (GMT+5:30) — app's audience.
  useEffect(() => {
    const render = () => {
      const d = new Date();
      const fmt = d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      });
      setNow(fmt);
    };
    render();
    const id = window.setInterval(render, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);
  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/", label: "Map" },
      { href: "/accountability", label: "Accountability" },
      { href: "/report", label: "Report" },
    ],
    [],
  );

  const handleLocaleChange = (value: string) => {
    const nextLocale = resolveLocale(value);
    setLocale(nextLocale);
    try { localStorage.setItem("locale", nextLocale); } catch { /* noop */ }
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; SameSite=Lax${secure}`;
    window.location.reload();
  };

  if (isAppRoute) return null;

  return (
    <header className="liveHeader">
      <div className="liveHeaderInner">
        <Link href="/" className="wordmark" aria-label="Ente Nadu home">
          <span className="brandDot" aria-hidden="true" />
          <span className="brandName">
            <span className="brandEn">ENTE NADU</span>
            <span className="brandMl">എന്റെ നാട്</span>
          </span>
          <span className="brandDivider" aria-hidden="true" />
          <span className="brandTag">CIVIC&nbsp;OPS · KERALA</span>
        </Link>

        <nav className="mainNav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`navLink ${pathname === item.href ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="rightGroup">
          <div className="liveClock num" title="Live · Indian Standard Time">
            <span className="live-dot" aria-hidden="true" />
            <span className="liveText">LIVE</span>
            <span className="sep">·</span>
            <span>{now || "—"}</span>
            <span className="tz">IST</span>
          </div>

          <select
            className="localeSelect"
            aria-label="Language"
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value)}
          >
            {(Object.keys(LOCALE_LABELS) as Locale[]).map((item) => (
              <option key={item} value={item}>
                {LOCALE_LABELS[item]}
              </option>
            ))}
          </select>

          <ThemeToggle />
        </div>
      </div>

      <style>{`
        .liveHeader {
          background: var(--bg-0);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(8px) saturate(120%);
          -webkit-backdrop-filter: blur(8px) saturate(120%);
        }
        .liveHeaderInner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          min-height: 64px;
        }

        .wordmark {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--ink-0);
          padding: 6px 2px;
        }
        .wordmark:hover {
          text-decoration: none;
        }
        .brandDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow);
          animation: liveBreath 2.6s ease-in-out infinite;
          display: inline-block;
        }
        .brandName {
          display: inline-flex;
          flex-direction: column;
          line-height: 1;
          gap: 3px;
        }
        .brandEn {
          font-family: var(--font-display);
          font-weight: 500;
          letter-spacing: 0.22em;
          font-size: 13px;
          color: var(--ink-0);
          text-transform: uppercase;
        }
        .brandMl {
          font-size: 9px;
          color: var(--ink-muted);
          letter-spacing: 0.04em;
          font-weight: 400;
        }
        .brandDivider {
          width: 1px;
          height: 20px;
          background: var(--border);
        }
        .brandTag {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.24em;
          color: var(--ink-muted);
          text-transform: uppercase;
        }

        .mainNav {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-left: auto;
        }
        .navLink {
          padding: 7px 14px;
          border-radius: var(--r-sm);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--ink-1);
          border-bottom: 1px solid transparent;
          transition: color 0.18s ease, border-color 0.18s ease;
        }
        .navLink:hover {
          color: var(--accent);
          text-decoration: none;
        }
        .navLink.active {
          color: var(--ink-0);
          border-bottom-color: var(--accent);
        }

        .rightGroup {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .liveClock {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-1);
          letter-spacing: 0.14em;
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          text-transform: uppercase;
        }
        .liveText {
          color: var(--accent);
          font-weight: 600;
          letter-spacing: 0.2em;
        }
        .sep { color: var(--ink-muted); opacity: 0.6; }
        .tz {
          color: var(--ink-muted);
          margin-left: 2px;
          font-weight: 500;
        }

        .localeSelect {
          appearance: none;
          height: 32px;
          min-height: 32px;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          background: transparent;
          color: var(--ink-1);
          padding: 0 12px;
          padding-right: 24px;
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.08em;
          cursor: pointer;
          background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
                            linear-gradient(135deg, currentColor 50%, transparent 50%);
          background-position: calc(100% - 14px) 14px, calc(100% - 9px) 14px;
          background-size: 5px 5px, 5px 5px;
          background-repeat: no-repeat;
          text-transform: uppercase;
        }
        .localeSelect:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        @media (max-width: 900px) {
          .brandDivider, .brandTag { display: none; }
        }
        @media (max-width: 760px) {
          .liveHeaderInner { padding: 0 14px; gap: 10px; min-height: 56px; }
          .liveClock { display: none; }
          .navLink { padding: 5px 10px; font-size: 10px; }
          .brandEn { font-size: 12px; letter-spacing: 0.18em; }
        }
        @media (max-width: 480px) {
          .mainNav { display: none; }
        }
      `}</style>
    </header>
  );
}
