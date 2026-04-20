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

const TEXT: Record<Locale, { language: string; apply: string; about: string; installTip: string }> = {
  en: {
    language: "Language",
    apply: "Apply",
    about: "About",
    installTip: "Tip: use browser menu and choose Install app to add this to your home screen.",
  },
  kn: {
    language: "ಭಾಷೆ",
    apply: "ಅನ್ವಯಿಸು",
    about: "ಬಗ್ಗೆ",
    installTip: "ಸೂಚನೆ: ಬ್ರೌಸರ್ ಮೆನುದಲ್ಲಿ Install app ಆಯ್ಕೆ ಮಾಡಿ ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ಗೆ ಸೇರಿಸಿ.",
  },
  ml: {
    language: "ഭാഷ",
    apply: "പ്രയോഗിക്കുക",
    about: "കുറിച്ച്",
    installTip: "സൂചന: ബ്രൗസർ മെനുവിൽ Install app ഉപയോഗിച്ച് ഹോം സ്ക്രീനിലേക്ക് ചേർക്കുക.",
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

  const updateLocale = (next: Locale) => {
    setLocale(next);
    try {
      localStorage.setItem("locale", next);
    } catch {
      // storage may be blocked
    }
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax${secure}`;
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section className="card" style={{ padding: 14, display: "grid", gap: 8 }}>
        <strong>{text.language}</strong>
        <select
          value={locale}
          onChange={(event) => updateLocale(event.target.value as Locale)}
          style={{ minHeight: 38, border: "1px solid #d5ccb7", borderRadius: 8, padding: "0 10px" }}
        >
          {(Object.keys(LOCALE_LABELS) as Locale[]).map((code) => (
            <option value={code} key={code}>
              {LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
        <button className="button" onClick={() => window.location.reload()}>
          {text.apply}
        </button>
      </section>

      <section className="card" style={{ padding: 14, display: "grid", gap: 6 }}>
        <strong>{text.about}</strong>
        <span className="muted">
          {branding ? `${branding.app_name} - ${branding.region_label}` : "Ente Nadu"}
        </span>
        <span className="muted" style={{ fontSize: 12 }}>
          {text.installTip}
        </span>
      </section>
    </div>
  );
}
