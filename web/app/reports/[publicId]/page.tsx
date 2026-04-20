import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import CheckInButton from "@/components/CheckInButton";
import NotifyActions from "@/components/NotifyActions";
import { fetchReportByPublicId } from "@/lib/api";
import { STATUS_COLORS, STATUS_LABELS, CATEGORY_ICONS, EVENT_LABELS } from "@/lib/reportConstants";

const ReportLocationMap = dynamic(() => import("@/components/ReportLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="skeleton" style={{ width: "100%", height: 200, borderRadius: 12 }} />
  ),
});

export default async function ReportPage({ params }: { params: { publicId: string } }) {
  const report = await fetchReportByPublicId(params.publicId);
  if (!report) {
    notFound();
  }

  const categoryLabel = report.category_final.replaceAll("_", " ");
  const categoryIcon = CATEGORY_ICONS[report.category_final] || "\u{1F4CB}";
  const statusColor = STATUS_COLORS[report.status] || "#868e96";
  const statusLabel = STATUS_LABELS[report.status] || report.status;

  return (
    <main>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 12 }}>
        <Link href="/" className="backLink">
          &larr; All Reports
        </Link>
      </nav>

      <section className="hero">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "2rem" }}>{categoryIcon}</span>
          <div>
            <h1 style={{ marginBottom: 4 }}>{categoryLabel}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {report.locality ?? "Unknown locality"}
              {report.address_text && ` \u2014 ${report.address_text}`}
            </p>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Report {report.public_id}
            </p>
          </div>
        </div>
      </section>

      <div className="reportDetailGrid">
        {/* Main content */}
        <section className="card detail" style={{ padding: 20 }}>
          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              className="chip"
              style={{
                background: `color-mix(in srgb, ${statusColor} 10%, transparent)`,
                color: statusColor,
                border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)`,
                fontSize: 13,
                padding: "5px 12px",
              }}
            >
              {statusLabel}
            </span>
            {report.moderation_state !== "clean" && (
              <span className="chip" style={{ background: "#fff3bf", color: "#e67700" }}>
                {report.moderation_state}
              </span>
            )}
          </div>

          {/* Summary */}
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: "12px 0" }}>
            {report.description_ai || report.description_user || "No description available."}
          </p>

          {/* Details grid */}
          <div className="detailMeta">
            <div className="metaItem">
              <span className="metaLabel">Category</span>
              <span className="metaValue">{categoryIcon} {categoryLabel}</span>
            </div>
            <div className="metaItem">
              <span className="metaLabel">Ward / Zone</span>
              <span className="metaValue">{report.ward_name ?? "Unknown"} / {report.zone_name ?? "Unknown"}</span>
            </div>
            <div className="metaItem">
              <span className="metaLabel">AI Confidence</span>
              <span className="metaValue">{report.confidence ? `${(report.confidence * 100).toFixed(0)}%` : "N/A"}</span>
            </div>
            <div className="metaItem">
              <span className="metaLabel">Severity</span>
              <span className="metaValue">{report.severity_ai ?? "N/A"} / 5</span>
            </div>
            <div className="metaItem">
              <span className="metaLabel">Location</span>
              <span className="metaValue">{report.public_lat.toFixed(4)}, {report.public_lon.toFixed(4)}</span>
            </div>
            <div className="metaItem">
              <span className="metaLabel">Reported</span>
              <span className="metaValue">{new Date(report.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {/* Community check-in */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <CheckInButton publicId={report.public_id} initialCount={report.checkin_count ?? 0} />
            {report.last_checkin_at && (
              <span className="muted" style={{ fontSize: 12 }}>
                Last verified: {new Date(report.last_checkin_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="actions" style={{ marginTop: 16 }}>
            <NotifyActions publicId={report.public_id} />
          </div>
        </section>

        {/* Sidebar: media + map + timeline */}
        <div className="reportDetailSidebar">
          {/* Media gallery */}
          {report.media.length > 0 && (
            <section className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Evidence</h3>
              <div className="mediaGallery">
                {report.media.map((item) => (
                  <div key={item.id} className="mediaItem">
                    {item.public_url ? (
                      item.media_type === "image" ? (
                        <Image
                          src={item.public_url}
                          alt={`Evidence for report ${report.public_id}`}
                          width={400}
                          height={300}
                          style={{ width: "100%", height: "auto", borderRadius: 10, display: "block" }}
                        />
                      ) : (
                        <a href={item.public_url} target="_blank" rel="noreferrer" className="button secondary">
                          Open {item.media_type}
                        </a>
                      )
                    ) : (
                      <div className="mediaPending">
                        <span style={{ fontSize: 24 }}>{"\u{23F3}"}</span>
                        <span className="muted">Media processing...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Location map */}
          <section className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Location</h3>
            <ReportLocationMap lat={report.public_lat} lng={report.public_lon} />
          </section>

          {/* Event timeline */}
          {report.events && report.events.length > 0 && (
            <section className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Timeline</h3>
              <div className="timeline">
                {report.events.map((event, idx) => (
                  <div key={event.id} className="timelineItem">
                    <div className="timelineDot" />
                    {idx < report.events.length - 1 && <div className="timelineLine" />}
                    <div className="timelineContent">
                      <span className="timelineEvent">
                        {EVENT_LABELS[event.event_type] ??
                          event.event_type.replace("report.", "").replaceAll(".", " ").replaceAll("_", " ")}
                      </span>
                      <span className="timelineDate">
                        {new Date(event.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {event.actor && (
                        <span className="timelineActor">by {event.actor}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
