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

  const openReports = initialReports.filter((r) => r.status === "open").length;
  const fixedReports = initialReports.filter((r) => r.status === "fixed").length;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {/* ── Greeting: kasavu letterhead strip with peacock-feather accent ── */}
      <div
        className="kasavu-border soft"
        style={{
          position: "relative",
          padding: "18px 20px 16px",
          overflow: "hidden",
        }}
      >
        {/* Peacock-feather in corner (inline SVG — single asset, under 1KB) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 80 120"
          width="54"
          height="80"
          style={{ position: "absolute", top: 6, right: 6, opacity: 0.75 }}
        >
          {/* Feather stem */}
          <path d="M40 118 Q42 70, 40 20" stroke="#063a28" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
          {/* Outer frond (green) */}
          <path
            d="M40 20 C24 22, 14 40, 18 62 C22 82, 34 96, 40 104 C46 96, 58 82, 62 62 C66 40, 56 22, 40 20 Z"
            fill="#0e6b47" opacity="0.85"
          />
          {/* Mid band (gold) */}
          <path
            d="M40 28 C30 30, 24 44, 26 60 C28 76, 36 88, 40 94 C44 88, 52 76, 54 60 C56 44, 50 30, 40 28 Z"
            fill="#b8860b" opacity="0.85"
          />
          {/* Eye disc (kasavu cream + chayilyam center) */}
          <ellipse cx="40" cy="56" rx="10" ry="14" fill="#fffdf5"/>
          <ellipse cx="40" cy="56" rx="7" ry="10" fill="#a8321e"/>
          <ellipse cx="40" cy="56" rx="4" ry="6" fill="#063a28"/>
          <circle cx="40" cy="54" r="1.6" fill="#fffdf5"/>
        </svg>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 10, fontWeight: 700,
          fontFamily: "var(--font-stamp), monospace",
          color: "var(--mural-red)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: 6,
          padding: "3px 8px",
          background: "var(--kasavu-cream)",
          border: "1px solid var(--kasavu-gold-light)",
          borderRadius: 999,
        }}>
          <span>◉</span>
          <span style={{ fontFamily: "var(--font-ml), serif" }}>നിങ്ങളുടെ പ്രദേശം</span>
          <span>·</span>
          <span>Your area</span>
        </div>
        <h1 style={{
          margin: "0 0 4px",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--mural-green-deep)",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          fontFamily: "var(--font-ml-display), var(--font-ml), var(--font-display), serif",
        }}>
          {messages.appNearbyTitle}
        </h1>
        <p style={{
          margin: 0,
          fontSize: 13,
          color: "var(--ink-1)",
          lineHeight: 1.55,
          fontFamily: "var(--font-ml), serif",
        }}>
          {messages.appNearbySubtitle}
        </p>
      </div>

      {/* ── Quick stats chips — mural-palette kasavu cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { value: initialReports.length, label: "TOTAL", ml: "ആകെ", color: "var(--mural-green-deep)", edge: "var(--mural-green)" },
          { value: openReports, label: "OPEN", ml: "പരിഹരിക്കാത്തത്", color: "var(--mural-red-deep)", edge: "var(--mural-red)" },
          { value: fixedReports, label: "FIXED", ml: "പരിഹരിച്ചു", color: "var(--mural-green-deep)", edge: "var(--mural-green)" },
        ].map((s) => (
          <div key={s.label} style={{
            padding: "10px 8px",
            background: "var(--kasavu-surface)",
            border: "1px solid var(--kasavu-gold-light)",
            borderLeft: `3px solid ${s.edge}`,
            borderRadius: 8,
            textAlign: "center",
            boxShadow: "inset 0 0 0 3px var(--kasavu-cream)",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: "var(--font-display), serif" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-soft)", letterSpacing: "0.08em", marginTop: 3, fontFamily: "var(--font-stamp), monospace" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "var(--kasavu-gold-dark)", marginTop: 1, fontFamily: "var(--font-ml), serif" }}>
              {s.ml}
            </div>
          </div>
        ))}
      </div>

      {/* ── Safe mode banner ── */}
      {safeMode && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px",
          background: "#fef3c7", borderRadius: 10,
          border: "1.5px solid #c89728",
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1, fontSize: 12, color: "#8f6b15", fontWeight: 600 }}>
            Safe mode — map disabled
          </div>
          <a href="/app?safe=0" style={{
            fontSize: 11, fontWeight: 700, color: "#fff",
            background: "#c89728", padding: "6px 12px", borderRadius: 999,
            textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Full Map →
          </a>
        </div>
      )}

      <AppMapFeedClient locale={locale} initialReports={initialReports} safeMode={safeMode} />
    </section>
  );
}
