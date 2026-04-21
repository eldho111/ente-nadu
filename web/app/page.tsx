import dynamic from "next/dynamic";
import Link from "next/link";

import MobileAppRedirect from "@/components/MobileAppRedirect";
import KeralaEmptyState from "@/components/KeralaEmptyState";
import { fetchReports } from "@/lib/api";
import { getMessages } from "@/lib/i18n";
import { STATUS_COLORS, STATUS_LABELS, CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/reportConstants";
import { getServerLocale } from "@/lib/server-locale";

const PublicMap = dynamic(() => import("@/components/PublicMap"), { ssr: false });

const CATEGORY_FILTERS = [
  "", "pothole", "waterlogging", "garbage_dumping", "streetlight_outage",
  "traffic_hotspot", "illegal_parking", "footpath_obstruction", "signal_malfunction",
  "open_manhole", "construction_debris", "canal_blockage", "stray_animal_menace",
  "tree_fall_risk", "flood_drainage", "public_toilet", "other",
];
const STATUS_FILTERS = ["", "open", "acknowledged", "in_progress", "fixed"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { category?: string; status?: string };
}) {
  const locale = getServerLocale();
  const messages = getMessages(locale);
  const category = searchParams?.category || "";
  const status = searchParams?.status || "";
  const reports = await fetchReports({
    category: category || undefined,
    status: status || undefined,
  });

  const totalReports = reports.length;
  const openReports = reports.filter((r) => r.status === "open").length;
  const fixedReports = reports.filter((r) => r.status === "fixed").length;

  return (
    <main>
      <MobileAppRedirect />

      {/* ── Hero Section: kasavu-bordered letterhead ── */}
      <section
        className="kasavu-border animate-in"
        style={{
          padding: "28px 26px 24px",
          margin: "0 0 4px",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 10,
        }}>
          <img
            src="/icons/logo.svg"
            alt=""
            width="84"
            height="84"
            style={{ flexShrink: 0, filter: "drop-shadow(0 4px 10px rgba(184,134,11,0.25))" }}
          />
          <div>
            <h1 style={{
              margin: 0,
              fontSize: "clamp(1.7rem, 4.8vw, 2.6rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}>
              <span style={{
                display: "block",
                fontFamily: "var(--font-ml-display), var(--font-ml), serif",
                color: "var(--mural-red)",
                fontSize: "1.1em",
                fontWeight: 700,
                lineHeight: 1.1,
              }}>എന്റെ നാട്</span>
              <span style={{
                display: "block",
                fontFamily: "var(--font-display), serif",
                fontSize: "0.56em",
                fontWeight: 700,
                color: "var(--mural-green-deep)",
                letterSpacing: "0.14em",
                marginTop: 6,
                textTransform: "uppercase",
              }}>· Ente Nadu ·</span>
            </h1>
          </div>
        </div>
        <span className="kerala-ribbon ml" style={{ alignSelf: "flex-start", marginBottom: 6, background: "linear-gradient(90deg, #f5e0a8, #d4a84a)", color: "#7a2410", borderColor: "#b8860b" }}>
          കേരളം • Kerala • केरल
        </span>
        <p className="ml" style={{ margin: "10px 0 16px", color: "var(--ink-1)", maxWidth: "58ch", lineHeight: 1.7, fontSize: 15 }}>
          {messages.homeSubtitle}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/report" className="button saffron">
            <span>📸</span> {messages.homeReportCta}
          </Link>
          <Link href="/accountability" className="button">
            <span>🏛️</span> Accountability
          </Link>
          <Link href="/app" className="button secondary">
            <span>📱</span> App Mode
          </Link>
        </div>
      </section>

      {/* ── Lotus divider between letterhead and feed ── */}
      <div className="lotus-divider" aria-hidden="true">
        <img src="/icons/motifs/lotus-divider.svg" alt="" className="lotus" />
      </div>

      {/* ── Stats Banner: pookalam centerpiece flanked by stat chips ── */}
      <section style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 14,
        padding: "18px 16px",
        marginBottom: 20,
        background: "var(--kasavu-surface)",
        border: "1px solid var(--kasavu-gold-light)",
        borderRadius: 10,
        boxShadow: "inset 0 0 0 4px var(--kasavu-cream), inset 0 0 0 5px var(--kasavu-gold-light), var(--shadow-sm)",
      }}>
        {/* Left pair */}
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { value: totalReports, label: "TOTAL · ആകെ", color: "var(--mural-green-deep)", border: "var(--mural-green)" },
            { value: openReports, label: "OPEN · പരിഹരിക്കാത്തവ", color: "var(--mural-red-deep)", border: "var(--mural-red)" },
          ].map((stat) => (
            <div key={stat.label} style={{
              display: "flex", alignItems: "baseline", justifyContent: "flex-end",
              gap: 10, padding: "4px 10px",
              borderRight: `3px solid ${stat.border}`,
            }}>
              <div style={{ fontSize: 11, fontFamily: "var(--font-stamp), monospace", fontWeight: 700, color: "var(--ink-soft)", letterSpacing: "0.08em", textAlign: "right" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, lineHeight: 1, fontFamily: "var(--font-display), serif" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Center pookalam */}
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <img src="/icons/motifs/pookalam-ring.svg" alt="" width="120" height="120" />
        </div>

        {/* Right pair */}
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { value: fixedReports, label: "FIXED · പരിഹരിച്ചു", color: "var(--mural-green-deep)", border: "var(--mural-green)" },
            { value: 20, label: "MPs TRACKED · എംപിമാർ", color: "var(--kasavu-gold-dark)", border: "var(--kasavu-gold)" },
          ].map((stat) => (
            <div key={stat.label} style={{
              display: "flex", alignItems: "baseline", justifyContent: "flex-start",
              gap: 10, padding: "4px 10px",
              borderLeft: `3px solid ${stat.border}`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, lineHeight: 1, fontFamily: "var(--font-display), serif" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-stamp), monospace", fontWeight: 700, color: "var(--ink-soft)", letterSpacing: "0.08em" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Map + Filters ── */}
      <section className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
        {/* Category filters — scrollable */}
        <div style={{
          padding: "12px 14px", borderBottom: "1.5px solid #d9c9a8",
          background: "#fffbf0",
          overflowX: "auto", WebkitOverflowScrolling: "touch",
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: "max-content" }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4, color: "#7a8878" }}>
              Category
            </span>
            {CATEGORY_FILTERS.map((item) => {
              const isActive = category === item;
              const icon = item ? (CATEGORY_ICONS[item] || "") : "";
              const label = item ? (CATEGORY_LABELS[item] || item.replaceAll("_", " ")) : "All";
              return (
                <Link
                  key={item || "all-cat"}
                  href={`/?category=${item}&status=${status}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    textDecoration: "none", whiteSpace: "nowrap",
                    background: isActive ? "#0f7056" : "#fffdf7",
                    color: isActive ? "#fff" : "#4a5a48",
                    border: isActive ? "1.5px solid #0a4d3c" : "1.5px solid #d9c9a8",
                    boxShadow: isActive ? "0 2px 6px rgba(15, 112, 86, 0.3)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Status filters */}
        <div style={{ padding: "10px 14px", borderBottom: "1.5px solid #d9c9a8", background: "#fffbf0" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4, color: "#7a8878" }}>
              Status
            </span>
            {STATUS_FILTERS.map((item) => {
              const isActive = status === item;
              const sColor = item ? (STATUS_COLORS[item] || "#7a8878") : "#7a8878";
              return (
                <Link
                  key={item || "all-status"}
                  href={`/?category=${category}&status=${item}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    textDecoration: "none",
                    background: isActive ? sColor : "#fffdf7",
                    color: isActive ? "#fff" : sColor,
                    border: `1.5px solid ${isActive ? sColor : "#d9c9a8"}`,
                    boxShadow: isActive ? `0 2px 6px ${sColor}40` : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {item && (
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: isActive ? "#fff" : sColor, display: "inline-block",
                    }} />
                  )}
                  {item ? (STATUS_LABELS[item] || item) : "All"}
                </Link>
              );
            })}
          </div>
        </div>

        <PublicMap reports={reports} />
      </section>

      {/* ── Report Cards Grid ── */}
      <section>
        <h2 style={{
          fontSize: 18, margin: "0 0 14px",
          color: "var(--mural-green-deep)",
          padding: "10px 16px",
          background: "var(--kasavu-surface)",
          border: "1px solid var(--kasavu-gold-light)",
          borderLeft: "4px solid var(--mural-red)",
          borderRadius: 8,
          fontWeight: 700,
          fontFamily: "var(--font-display), serif",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontFamily: "var(--font-ml-display), var(--font-ml), serif", color: "var(--mural-red)" }}>പുതിയ പരാതികൾ</span>
          <span style={{ color: "var(--kasavu-gold-dark)", fontWeight: 600 }}>·</span>
          <span>Recent Reports</span>
        </h2>
        <div className="reportGrid">
          {reports.slice(0, 18).map((report) => {
            const icon = CATEGORY_ICONS[report.category] || "\u{1F4CB}";
            const catLabel = CATEGORY_LABELS[report.category] || report.category.replaceAll("_", " ");
            const sColor = STATUS_COLORS[report.status] || "#7a8878";
            const sLabel = STATUS_LABELS[report.status] || report.status;
            return (
              <Link key={report.id} href={`/reports/${report.public_id}`} className="reportCard">
                {/* Category + Status row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 12, fontWeight: 600, color: "#0a4d3c",
                    background: "#d4e8dd", padding: "3px 10px", borderRadius: 999,
                    border: "1px solid #0f7056",
                  }}>
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    {catLabel}
                  </span>
                  <span
                    className={`stamp-chip ${report.status === "fixed" ? "fixed" : report.status === "open" ? "open" : "progress"}`}
                    style={{ transform: "rotate(-4deg)" }}
                  >
                    {sLabel}
                  </span>
                </div>
                {/* ID + Time */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  paddingTop: 8, borderTop: "1px dashed #d9c9a8",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1f", fontFamily: "monospace" }}>
                    {report.public_id}
                  </span>
                  <span style={{ fontSize: 11, color: "#7a8878", fontWeight: 500 }}>
                    {timeAgo(report.created_at)}
                  </span>
                </div>
                {/* Ward info */}
                {report.ward_id && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#4a5a48" }}>
                    {"\u{1F4CD}"} Ward: <b>{report.ward_id}</b>
                  </p>
                )}
              </Link>
            );
          })}
        </div>
        {reports.length === 0 && (
          <KeralaEmptyState
            variant="nilavilakku"
            titleMl="ആദ്യ പരാതി നിങ്ങളുടേതാകട്ടെ"
            title="Be the first to report an issue in Kerala"
            description="Kerala's first public civic ledger is still taking shape. Light the first lamp — take a photo of a pothole, garbage pile, or broken streetlight near you."
            cta={{ href: "/report", label: "📸 Report an Issue" }}
          />
        )}
      </section>
    </main>
  );
}
