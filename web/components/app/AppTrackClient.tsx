"use client";

import { useEffect, useState } from "react";

import { getPublicApiBase } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import { Locale } from "@/lib/i18n";

type NotificationRow = {
  id: string;
  report_id: string;
  channel: string;
  status: string;
  message: string | null;
  created_at: string;
  read_at: string | null;
};

const API_BASE = getPublicApiBase();

const TEXT: Record<Locale, { loading: string; latest: string; empty: string; unavailable: string; report: string; channel: string }> = {
  en: {
    loading: "Loading updates...",
    latest: "Latest updates",
    empty: "No updates yet",
    unavailable: "Unable to load updates right now.",
    report: "Report",
    channel: "Channel",
  },
  kn: {
    loading: "ಅಪ್‌ಡೇಟ್‌ಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    latest: "ಇತ್ತೀಚಿನ ಅಪ್‌ಡೇಟ್‌ಗಳು",
    empty: "ಇನ್ನೂ ಅಪ್‌ಡೇಟ್‌ಗಳಿಲ್ಲ",
    unavailable: "ಈಗ ಅಪ್‌ಡೇಟ್‌ಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ಆಗಲಿಲ್ಲ.",
    report: "ವರದಿ",
    channel: "ಚಾನಲ್",
  },
  ml: {
    loading: "അപ്‌ഡേറ്റുകൾ ലോഡ് ചെയ്യുന്നു...",
    latest: "പുതിയ അപ്‌ഡേറ്റുകൾ",
    empty: "ഇനിയും അപ്‌ഡേറ്റുകളില്ല",
    unavailable: "ഇപ്പോൾ അപ്‌ഡേറ്റുകൾ ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല.",
    report: "റിപ്പോർട്ട്",
    channel: "ചാനൽ",
  },
};

type Props = {
  locale: Locale;
};

export default function AppTrackClient({ locale }: Props) {
  const text = TEXT[locale] || TEXT.en;
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [status, setStatus] = useState(text.loading);

  useEffect(() => {
    const load = async () => {
      const deviceId = getDeviceId();
      try {
        const response = await fetch(`${API_BASE}/v1/notifications?device_id=${encodeURIComponent(deviceId)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Could not load notifications");
        }
        const payload = await response.json();
        setRows(payload.items || []);
        setStatus((payload.items || []).length ? text.latest : text.empty);
      } catch {
        setStatus(text.unavailable);
      }
    };
    load();
  }, [text.empty, text.latest, text.unavailable]);

  const loaded = status !== text.loading;
  const hasRows = rows.length > 0;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <span className="muted" style={{ fontSize: 12 }}>{status}</span>
      {rows.map((item) => (
        <article key={item.id} className="reportCard" style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 14 }}>
            {text.report} {item.report_id.slice(0, 8)}
          </strong>
          <span className="chip">{item.status}</span>
          <p className="muted" style={{ margin: 0 }}>
            {item.message || `${text.channel}: ${item.channel}`}
          </p>
          <span className="muted" style={{ fontSize: 12 }}>
            {new Date(item.created_at).toLocaleString("en-IN")}
          </span>
        </article>
      ))}
      {loaded && !hasRows && (
        <div
          className="kasavu-border soft"
          style={{
            padding: "24px 18px",
            textAlign: "center",
            display: "grid",
            justifyItems: "center",
            gap: 10,
          }}
        >
          <img
            src="/icons/motifs/snake-boat.svg"
            alt=""
            width={220}
            height={110}
            style={{ opacity: 0.9 }}
          />
          <div
            style={{
              fontFamily: "var(--font-ml-display), var(--font-ml), serif",
              fontSize: 18,
              color: "var(--mural-red)",
              fontWeight: 700,
            }}
          >
            ഇനിയും അപ്‌ഡേറ്റുകളില്ല
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-1)", maxWidth: "38ch" }}>
            Your journey starts here. Submit your first report from the Report tab
            and progress updates will appear in this palm-leaf.
          </p>
        </div>
      )}
    </div>
  );
}
