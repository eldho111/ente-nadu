"use client";

import { useEffect, useState } from "react";

import { Locale, LOCALE_LABELS, resolveLocale } from "@/lib/i18n";
import { getPublicApiBase } from "@/lib/api";

const API_BASE = getPublicApiBase();

type Branding = {
  app_name: string;
  region_label: string;
  locales: Locale[];
};

const TEXT: Record<Locale, { language: string; languageNote: string; about: string; installTip: string }> = {
  en: {
    language: "Language",
    languageNote: "Applies immediately to the whole app.",
    about: "About",
    installTip: "Tip: use your browser menu and choose “Install app” to add this to your home screen.",
  },
  kn: {
    language: "ಭಾಷೆ",
    languageNote: "ಸಂಪೂರ್ಣ ಆ್ಯಪ್‌ಗೆ ತಕ್ಷಣ ಅನ್ವಯಿಸುತ್ತದೆ.",
    about: "ಬಗ್ಗೆ",
    installTip: "ಸೂಚನೆ: ಬ್ರೌಸರ್ ಮೆನುವಿನಲ್ಲಿ “Install app” ಆಯ್ಕೆ ಮಾಡಿ ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ಗೆ ಸೇರಿಸಿ.",
  },
  ml: {
    language: "ഭാഷ",
    languageNote: "ആപ്പിലുടനീളം ഉടൻ പ്രയോഗിക്കും.",
    about: "കുറിച്ച്",
    installTip: "സൂചന: ബ്രൗസർ മെനുവിൽ “Install app” ഉപയോഗിച്ച് ഹോം സ്ക്രീനിലേക്ക് ചേർക്കുക.",
  },
};

type Props = {
  locale: Locale;
};

export default function AppSettingsClient({ locale: serverLocale }: Props) {
  const [locale, setLocale] = useState<Locale>(serverLocale);
  const [branding, setBranding] = useState<Branding | null>(null);
  const text = TEXT[locale] || TEXT.en;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("locale");
      if (stored) {
        setLocale(resolveLocale(stored));
      }
    } catch {
      // storage may be blocked
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/v1/meta/branding`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setBranding(data);
        }
      })
      .catch(() => {
        // best-effort
      });
  }, []);

  // Language change → persist, set cookie, reload the whole app immediately.
  // Previously this required a separate "Apply" button most users missed.
  const changeLocale = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    try {
      localStorage.setItem("locale", next);
    } catch {
      // storage blocked
    }
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax${secure}`;
    // Reload so server-rendered strings in every component re-resolve.
    window.location.reload();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section className="card" style={{ padding: 14, display: "grid", gap: 8 }}>
        <strong style={{ fontSize: 13, letterSpacing: "0.02em" }}>{text.language}</strong>
        <select
          value={locale}
          onChange={(event) => changeLocale(event.target.value as Locale)}
          style={{
            minHeight: 42,
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-sm)",
            padding: "0 12px",
            background: "var(--bg-surface)",
            color: "var(--ink-0)",
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {(Object.keys(LOCALE_LABELS) as Locale[]).map((code) => (
            <option value={code} key={code}>
              {LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "var(--ink-muted)", letterSpacing: "0.02em" }}>
          {text.languageNote}
        </span>
      </section>

      <section className="card" style={{ padding: 14, display: "grid", gap: 6 }}>
        <strong style={{ fontSize: 13, letterSpacing: "0.02em" }}>{text.about}</strong>
        <span className="muted">
          {branding ? `${branding.app_name} · ${branding.region_label}` : "Ente Nadu · Kerala"}
        </span>
        <span className="muted" style={{ fontSize: 12, lineHeight: 1.55 }}>
          {text.installTip}
        </span>
      </section>
    </div>
  );
}
