import dynamic from "next/dynamic";
import Link from "next/link";

import MobileAppRedirect from "@/components/MobileAppRedirect";
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

      {/* ── Hero Section ── */}
      <section style={{
        background: "linear-gradient(135deg, #fffdf7 0%, #faf5eb 50%, #f3ead6 100%)",
        borderRadius: 14, padding: "28px 24px", marginBottom: 20,
        border: "2px solid #d9c9a8",
        borderLeft: "6px solid #0f7056",
        boxShadow: "0 2px 4px rgba(74, 45, 10, 0.08), 0 4px 12px rgba(74, 45, 10, 0.06)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 16, right: 20,
          fontSize: 11, fontWeight: 700, color: "#c85a1f",
          background: "#fde6d4", padding: "4px 10px", borderRadius: 999,
          border: "1px solid #c85a1f", letterSpacing: "0.05em",
        }}>
          KERALA • केरळ • കേരളം
        </div>
        <h1 style={{
          margin: 0, fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
          background: "linear-gradient(135deg, #0a4d3c, #c85a1f)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          lineHeight: 1.1, letterSpacing: "-0.02em",
        }}>
          {messages.homeTitle}
        </h1>
        <p style={{ margin: "10px 0 16px", color: "#4a5a48", maxWidth: "58ch", lineHeight: 1.6, fontSize: 15 }}>
          {messages.homeSubtitle}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/report" className="button">{messages.homeReportCta}</Link>
          <Link href="/accountability" className="button secondary">Accountability</Link>
          <Link href="/app" className="button secondary">Open App Mode</Link>
        </div>
      </section>

      {/* ── Stats Banner ── */}
      <section style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10, marginBottom: 20,
      }}>
        {[
          { value: totalReports, label: "Total Reports", color: "#0f7056", icon: "\u{1F4CA}", border: "#0f7056" },
          { value: openReports, label: "Open Issues", color: "#b91c1c", icon: "\u{1F534}", border: "#b91c1c" },
          { value: fixedReports, label: "Fixed", color: "#15803d", icon: "\u2705", border: "#15803d" },
          { value: 20, label: "MPs Tracked", color: "#c85a1f", icon: "\u{1F3DB}", border: "#c85a1f" },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
            background: "#fffdf7", borderRadius: 12,
            border: "1.5px solid #d9c9a8",
            borderLeft: `4px solid ${stat.border}`,
            boxShadow: "0 2px 4px rgba(74, 45, 10, 0.08), 0 4px 12px rgba(74, 45, 10, 0.06)",
          }}>
            <span style={{ fontSize: 26 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: "#4a5a48", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
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
          fontSize: 18, margin: "0 0 14px", color: "#0a4d3c",
          padding: "10px 14px",
          background: "#fffdf7", border: "1.5px solid #d9c9a8", borderLeft: "4px solid #c85a1f",
          borderRadius: 10, fontWeight: 700,
        }}>
          {"\u{1F4CC}"} Recent Reports
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
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 11, fontWeight: 700, color: sColor,
                    textTransform: "uppercase", letterSpacing: "0.03em",
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", background: sColor,
                      display: "inline-block",
                      boxShadow: report.status === "open" ? `0 0 0 2px #fff, 0 0 6px ${sColor}` : `0 0 0 2px #fff`,
                    }} />
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
          <div className="card" style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
              No reports yet. Be the first to report a civic issue in Kerala!
            </p>
            <Link href="/report" className="button" style={{ marginTop: 12, display: "inline-block" }}>
              Report an Issue
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
