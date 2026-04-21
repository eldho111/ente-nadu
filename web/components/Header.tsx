"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LOCALE_LABELS, Locale, getMessages, resolveLocale } from "@/lib/i18n";

type NavItem = { href: string; label: string };

export default function Header() {
  const pathname = usePathname();
  const isAppRoute = pathname?.startsWith("/app") ?? false;
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    if (isAppRoute) {
      return;
    }
    let fromStorage: string | null = null;
    if (typeof window !== "undefined") {
      try {
        fromStorage = localStorage.getItem("locale");
      } catch {
        fromStorage = null;
      }
    }
    if (fromStorage) {
      setLocale(resolveLocale(fromStorage));
      return;
    }
    const cookieValue = document.cookie
      .split(";")
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith("locale="))
      ?.split("=")[1];
    setLocale(resolveLocale(cookieValue));
  }, [isAppRoute]);

  const messages = useMemo(() => getMessages(locale), [locale]);
  const navItems = useMemo<NavItem[]>(
    () => [
      { href: "/", label: messages.navMap },
      { href: "/report", label: messages.navReport },
      { href: "/accountability", label: messages.navAccountability || "Accountability" },
      { href: "/dashboard", label: messages.navDashboard },
    ],
    [messages],
  );

  const handleLocaleChange = (value: string) => {
    const nextLocale = resolveLocale(value);
    setLocale(nextLocale);
    try {
      localStorage.setItem("locale", nextLocale);
    } catch {
      // storage may be blocked
    }
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; SameSite=Lax${secure}`;
    window.location.reload();
  };

  if (isAppRoute) {
    return null;
  }

  return (
    <header className="siteHeader">
      <div className="headerInner">
        <Link href="/" className="logoLink" aria-label="Ente Nadu home">
          <img src="/icons/logo-mark.svg" alt="" className="logoMark" width="38" height="38" />
          <span className="logoTextGroup">
            <span className="logoTextMl">എന്റെ നാട്</span>
            <span className="logoTextEn">Ente Nadu</span>
          </span>
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
          <select
            className="localeSelect"
            aria-label="Language"
            value={locale}
            onChange={(event) => handleLocaleChange(event.target.value)}
          >
            {(Object.keys(LOCALE_LABELS) as Locale[]).map((item) => (
              <option key={item} value={item}>
                {LOCALE_LABELS[item]}
              </option>
            ))}
          </select>
        </nav>
      </div>

      <style>{`
        .siteHeader {
          background: linear-gradient(180deg, #fffbf0 0%, #faf5eb 100%);
          border-bottom: 2px solid #b8a37d;
          box-shadow: 0 2px 8px rgba(74, 45, 10, 0.08);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .headerInner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 60px;
          gap: 16px;
        }
        .logoLink {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--ink-0);
          flex-shrink: 0;
          padding: 6px 14px 6px 8px;
          border: 1.5px solid #c9b48a;
          background: linear-gradient(135deg, #fffbf0 0%, #fdf5e2 100%);
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(61, 42, 13, 0.1);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .logoLink:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(61, 42, 13, 0.15);
        }
        .logoMark {
          flex-shrink: 0;
          width: 38px;
          height: 38px;
        }
        .logoTextGroup {
          display: flex;
          flex-direction: column;
          line-height: 1;
          gap: 2px;
        }
        .logoTextMl {
          font-family: var(--font-ml), var(--font-display), serif;
          font-size: 16px;
          font-weight: 700;
          color: #c85a1f;
          letter-spacing: 0;
          line-height: 1.1;
        }
        .logoTextEn {
          font-family: var(--font-display), serif;
          font-size: 13px;
          font-weight: 600;
          color: #0a4d3c;
          letter-spacing: 0.03em;
          line-height: 1;
        }
        .mainNav {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .navLink {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          color: #4a5a48;
          border: 1.5px solid transparent;
          transition: all 0.15s;
        }
        .navLink:hover {
          background: #d4e8dd;
          color: #0a4d3c;
          border-color: #0f7056;
        }
        .navLink.active {
          background: #0f7056;
          color: #fff;
          border-color: #0a4d3c;
          box-shadow: 0 2px 6px rgba(15, 112, 86, 0.3);
        }
        .localeSelect {
          height: 36px;
          border: 1.5px solid #b8a37d;
          border-radius: 8px;
          background: #fffdf7;
          color: #1a2e1f;
          padding: 0 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .localeSelect:hover {
          border-color: #0f7056;
        }
        @media (max-width: 760px) {
          .headerInner {
            padding: 8px 12px;
            gap: 8px;
            min-height: 56px;
          }
          .logoLink {
            padding: 4px 10px 4px 6px;
            gap: 8px;
          }
          .logoMark {
            width: 32px;
            height: 32px;
          }
          .logoTextMl {
            font-size: 14px;
          }
          .logoTextEn {
            font-size: 11px;
          }
          .navLink {
            padding: 6px 10px;
            font-size: 13px;
          }
          .localeSelect {
            height: 34px;
            font-size: 13px;
            padding: 0 8px;
          }
        }
        @media (max-width: 480px) {
          .logoTextEn {
            display: none;
          }
          .logoTextMl {
            font-size: 15px;
          }
          .navLink {
            padding: 6px 8px;
            font-size: 12px;
          }
        }
        @media (max-width: 380px) {
          .headerInner {
            flex-wrap: wrap;
          }
          .mainNav {
            width: 100%;
            justify-content: center;
            gap: 4px;
          }
        }
      `}</style>
    </header>
  );
}
