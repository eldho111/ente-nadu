import AppMapFeedClient from "@/components/app/AppMapFeedClient";
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

  return (
    <section style={{ display: "grid", gap: 10 }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>{messages.appNearbyTitle}</h1>
      <p className="muted" style={{ margin: 0 }}>
        {messages.appNearbySubtitle}
      </p>
      {safeMode ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <p
            className="chip"
            style={{
              margin: 0,
              width: "fit-content",
              background: "#fff4d6",
              color: "#7a4d07",
            }}
          >
            Safe mode enabled: map rendering disabled for diagnostics.
          </p>
          <a href="/app?safe=0" className="button secondary" style={{ padding: "6px 10px" }}>
            Try Full Map
          </a>
        </div>
      ) : null}
      <AppMapFeedClient locale={locale} initialReports={initialReports} safeMode={safeMode} />
    </section>
  );
}
