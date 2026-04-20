import dynamic from "next/dynamic";
import Link from "next/link";

import MobileAppRedirect from "@/components/MobileAppRedirect";
import { fetchReports } from "@/lib/api";
import { getMessages } from "@/lib/i18n";
import { STATUS_COLORS, STATUS_LABELS, CATEGORY_ICONS } from "@/lib/reportConstants";
import { getServerLocale } from "@/lib/server-locale";

const PublicMap = dynamic(() => import("@/components/PublicMap"), { ssr: false });
const CATEGORY_FILTERS = [
  "",
  "pothole",
  "waterlogging",
  "garbage_dumping",
  "streetlight_outage",
  "traffic_hotspot",
];
const STATUS_FILTERS = ["", "open", "acknowledged", "in_progress", "fixed"];

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

  return (
    <main>
      <MobileAppRedirect />
      <section className="hero">
        <h1>{messages.homeTitle}</h1>
        <p>{messages.homeSubtitle}</p>
        <div className="actions">
          <Link href="/app" className="button secondary">
            Open App Mode
          </Link>
          <Link href="/report" className="button">
            {messages.homeReportCta}
          </Link>
          <Link href="/dashboard" className="button secondary">
            {messages.homeDashCta}
          </Link>
        </div>
      </section>

      <section className="card mapShell">
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #e5ddca", display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: 12 }}>Category:</span>
            {CATEGORY_FILTERS.map((item) => (
              <Link
                key={item || "all-categories"}
                href={`/?category=${item}&status=${status}`}
                className="chip"
                style={{ opacity: category === item ? 1 : 0.6 }}
              >
                {item || "all"}
              </Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: 12 }}>Status:</span>
            {STATUS_FILTERS.map((item) => (
              <Link
                key={item || "all-status"}
                href={`/?category=${category}&status=${item}`}
                className="chip"
                style={{ opacity: status === item ? 1 : 0.6 }}
              >
                {item || "all"}
              </Link>
            ))}
          </div>
        </div>
        <PublicMap reports={reports} />
      </section>

      <section className="reportGrid">
        {reports.slice(0, 18).map((report) => {
          const icon = CATEGORY_ICONS[report.category] || "\u{1F4CB}";
          const sColor = STATUS_COLORS[report.status] || "#868e96";
          const sLabel = STATUS_LABELS[report.status] || report.status;
          return (
            <Link key={report.id} href={`/reports/${report.public_id}`} className="reportCard">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span className="chip">{icon} {report.category.replaceAll("_", " ")}</span>
                <span
                  className="chip"
                  style={{
                    background: `color-mix(in srgb, ${sColor} 10%, transparent)`,
                    color: sColor,
                  }}
                >
                  {sLabel}
                </span>
              </div>
              <p className="muted" style={{ margin: "8px 0 4px" }}>
                Ward: {report.ward_id ?? "Unknown"}
              </p>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                {new Date(report.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </p>
            </Link>
          );
        })}
        {reports.length === 0 ? <p className="muted">No public reports yet.</p> : null}
      </section>
    </main>
  );
}
