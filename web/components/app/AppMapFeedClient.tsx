"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { ReportCard, getPublicApiBase } from "@/lib/api";
import { Locale } from "@/lib/i18n";

const CACHE_KEY = "app_reports_cache_v2";
const CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const API_BASE = getPublicApiBase();
const PublicMap = dynamic(() => import("@/components/PublicMap"), {
  ssr: false,
  loading: () => (
    <div className="mapFrame" style={{ display: "grid", placeItems: "center", color: "#31413f" }}>
      Loading map...
    </div>
  ),
});

const TEXT: Record<Locale, { loading: string; live: string; offline: string; noCache: string; statusLabel: string }> = {
  en: {
    loading: "Loading reports...",
    live: "Live data",
    offline: "Offline data",
    noCache: "Offline and no cached reports available.",
    statusLabel: "Status",
  },
  kn: {
    loading: "ವರದಿಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    live: "ಲೈವ್ ಡೇಟಾ",
    offline: "ಆಫ್‌ಲೈನ್ ಡೇಟಾ",
    noCache: "ಆಫ್‌ಲೈನ್ ಮತ್ತು ಕ್ಯಾಶ್ ವರದಿಗಳು ಲಭ್ಯವಿಲ್ಲ.",
    statusLabel: "ಸ್ಥಿತಿ",
  },
  ml: {
    loading: "റിപ്പോർട്ടുകൾ ലോഡ് ചെയ്യുന്നു...",
    live: "തത്സമയ ഡാറ്റ",
    offline: "ഓഫ്‌ലൈൻ ഡാറ്റ",
    noCache: "ഓഫ്‌ലൈൻ, കാഷ് ചെയ്ത റിപ്പോർട്ടുകളൊന്നുമില്ല.",
    statusLabel: "സ്ഥിതി",
  },
};

type Props = {
  locale: Locale;
  initialReports: ReportCard[];
  safeMode?: boolean;
};

function readCachedReports(): ReportCard[] | null {
  try {
    const cached = window.localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { ts: number; data: ReportCard[] };
    if (!parsed.ts || Date.now() - parsed.ts > CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedReports(rows: ReportCard[]): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: rows }));
  } catch {
    // storage might be blocked by browser privacy settings
  }
}

export default function AppMapFeedClient({ locale, initialReports, safeMode = false }: Props) {
  const text = TEXT[locale] || TEXT.en;
  const [reports, setReports] = useState<ReportCard[]>(initialReports);
  const [status, setStatus] = useState(
    initialReports.length > 0 ? `${text.live}: ${initialReports.length}` : `${text.live}: 0`,
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/v1/reports?page_size=120`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("API unavailable");
        }
        const payload = await response.json();
        const rows = (payload.items || []) as ReportCard[];
        if (!cancelled) {
          setReports(rows);
          setStatus(`${text.live}: ${rows.length}`);
          writeCachedReports(rows);
        }
      } catch {
        const cachedRows = readCachedReports();
        if (cachedRows) {
          if (!cancelled) {
            setReports(cachedRows);
            setStatus(`${text.offline}: ${cachedRows.length}`);
            return;
          }
        }
        if (!cancelled) {
          setReports([]);
          setStatus(text.noCache);
        }
      } finally {
        clearTimeout(timeout);
      }
    };
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [text.live, text.noCache, text.offline]);

  const cards = useMemo(() => reports.slice(0, 16), [reports]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <span className="muted" style={{ fontSize: 12 }}>{status}</span>
      {safeMode ? (
        <section className="card" style={{ padding: 14 }}>
          <p className="muted" style={{ margin: 0 }}>
            Map is disabled in safe mode. This confirms whether map rendering is causing a blank screen.
          </p>
        </section>
      ) : (
        <section className="card mapShell">
          <PublicMap reports={reports} />
        </section>
      )}
      <section style={{ display: "grid", gap: 8 }}>
        {cards.map((report) => (
          <a key={report.id} href={`/reports/${report.public_id}`} className="reportCard">
            <span className="chip">{report.category.replaceAll("_", " ")}</span>
            <h3 style={{ marginBottom: 4 }}>{report.public_id}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {text.statusLabel}: {report.status}
            </p>
          </a>
        ))}
        {cards.length === 0 ? (
          <article className="reportCard" style={{ display: "grid", gap: 6 }}>
            <strong style={{ fontSize: 14 }}>No reports to show yet.</strong>
            <p className="muted" style={{ margin: 0 }}>
              If this page is still unstable, open <a href="/doctor/runtime">runtime doctor</a> or launch
              {" "}
              <a href="/app?safe=1">safe mode</a>.
            </p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
