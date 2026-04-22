import AppMapFeedClient from "@/components/app/AppMapFeedClient";
import KPIRow, { type KPIItem } from "@/components/dashboard/KPIRow";
import { fetchReports } from "@/lib/api";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";

export default async function MobileAppHomePage({
  searchParams,
}: {
  searchParams?: { safe?: string };
}) {
  const locale = getServerLocale();
  const messages = getMessages(locale);
  const initialReports = await fetchReports({ page_size: 120 });
  const safeMode = searchParams?.safe !== "0";

  const total = initialReports.length;
  const open = initialReports.filter((r) => r.status === "open").length;
  const fixed = initialReports.filter((r) => r.status === "fixed").length;

  const kpis: KPIItem[] = [
    { key: "total", value: total, label: "Total", variant: "default" },
    { key: "open",  value: open,  label: "Open",  variant: "open" },
    { key: "fixed", value: fixed, label: "Fixed", variant: "fixed" },
  ];

  return (
    <section style={{ display: "grid", gap: 10 }}>
      {/* ── Greeting strip ── */}
      <div
        style={{
          padding: "10px 12px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)",
          display: "grid",
          gap: 3,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--alarm)",
            fontFamily: "var(--font-body)",
          }}
        >
          <span className="live-dot" aria-hidden="true" />
          <span>Your Area · Kerala</span>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: "var(--ink-0)",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {messages.appNearbyTitle}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--ink-1)",
            lineHeight: 1.5,
          }}
        >
          {messages.appNearbySubtitle}
        </p>
      </div>

      {/* ── KPI mini-row ── */}
      <KPIRow items={kpis} />

      {/* ── Safe-mode banner ── */}
      {safeMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            background: "var(--bg-surface)",
            border: "1px solid var(--warn)",
            borderRadius: "var(--r-sm)",
            color: "var(--warn)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "2px 6px",
              border: "1px solid currentColor",
              borderRadius: "var(--r-sm)",
            }}
          >
            Safe
          </span>
          <div style={{ flex: 1, fontSize: 12, color: "var(--ink-1)", fontWeight: 500 }}>
            Map disabled for low-end devices.
          </div>
          <a
            href="/app?safe=0"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#ffffff",
              background: "var(--warn)",
              padding: "5px 10px",
              borderRadius: "var(--r-sm)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Full map →
          </a>
        </div>
      )}

      <AppMapFeedClient locale={locale} initialReports={initialReports} safeMode={safeMode} />
    </section>
  );
}
