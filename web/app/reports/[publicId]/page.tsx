import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import CheckInButton from "@/components/CheckInButton";
import NotifyActions from "@/components/NotifyActions";
import RepresentativeCard from "@/components/RepresentativeCard";
import ResponsibilityTree from "@/components/ResponsibilityTree";
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

  // Classification is async — the worker may still be processing this report.
  // Distinguish genuine "missing" data from "not yet populated" by comparing
  // created_at to a grace window.
  const createdAt = new Date(report.created_at).getTime();
  const ageMinutes = (Date.now() - createdAt) / 60_000;
  const classifyPending =
    !report.description_ai && !report.description_user && ageMinutes < 10;
  const classifyStuck =
    !report.description_ai && !report.description_user && ageMinutes >= 10;

  // Same logic for media — treat < 10 min old null public_url as "processing"
  // and anything older as "stuck".
  const hasLiveMedia = report.media.some((m) => m.public_url);
  const mediaPending = !hasLiveMedia && report.media.length > 0 && ageMinutes < 10;
  const mediaStuck = !hasLiveMedia && report.media.length > 0 && ageMinutes >= 10;

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

          {/* Summary / description.
              When AI hasn't populated description_ai yet, fall back in order:
              user-typed note → clear "classification pending" state →
              "classification stuck" diagnostic hint. Never leave the user
              staring at an ambiguous "No description available." */}
          {report.description_ai || report.description_user ? (
            <p style={{ fontSize: 15, lineHeight: 1.6, margin: "12px 0", color: "var(--ink-0)" }}>
              {report.description_ai || report.description_user}
            </p>
          ) : classifyPending ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                margin: "12px 0",
                background: "var(--accent-soft)",
                border: "1px solid var(--border)",
                borderLeft: "2px solid var(--accent)",
                borderRadius: "var(--r-sm)",
                fontSize: 13,
                color: "var(--ink-1)",
                lineHeight: 1.55,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  boxShadow: "0 0 8px var(--accent-glow)",
                  flexShrink: 0,
                }}
              />
              <span>
                <strong style={{ color: "var(--accent)", fontWeight: 600 }}>AI classification in progress.</strong>
                {" "}Filed {Math.round(ageMinutes)} min ago · refresh in a minute for the auto-generated summary.
              </span>
            </div>
          ) : classifyStuck ? (
            <div
              style={{
                padding: "10px 14px",
                margin: "12px 0",
                background: "var(--alarm-soft)",
                border: "1px solid var(--border)",
                borderLeft: "2px solid var(--alarm)",
                borderRadius: "var(--r-sm)",
                fontSize: 13,
                color: "var(--ink-1)",
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: "var(--alarm)", fontWeight: 600 }}>
                AI classification hasn&apos;t run for this report.
              </strong>
              {" "}
              Filed {Math.round(ageMinutes)} min ago — the background worker may be offline.
              The report itself is saved and visible publicly. User-selected category:{" "}
              <strong style={{ color: "var(--ink-0)" }}>{categoryLabel}</strong>.
            </div>
          ) : null}

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
          {/* Evidence gallery.
              Handles three states:
              1. Media with a public_url — render it.
              2. Media < 10 min old with no URL yet — "processing" (expected
                 while the background worker blurs + publishes to public bucket).
              3. Media >= 10 min old with no URL — "stuck" (worker likely down). */}
          {report.media.length > 0 && (
            <section className="card" style={{ padding: 20 }}>
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--ink-0)",
                }}
              >
                Evidence
              </h3>
              {mediaStuck && (
                <div
                  style={{
                    padding: "8px 12px",
                    marginBottom: 12,
                    background: "var(--alarm-soft)",
                    border: "1px solid var(--border)",
                    borderLeft: "2px solid var(--alarm)",
                    borderRadius: "var(--r-sm)",
                    fontSize: 12,
                    color: "var(--ink-1)",
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: "var(--alarm)", fontWeight: 600 }}>
                    Media processing is stuck.
                  </strong>
                  {" "}The background worker hasn&apos;t blurred + published this image.
                  Reload once the worker service is healthy.
                </div>
              )}
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
                          style={{ width: "100%", height: "auto", borderRadius: "var(--r-sm)", display: "block", border: "1px solid var(--border)" }}
                        />
                      ) : (
                        <a href={item.public_url} target="_blank" rel="noreferrer" className="button secondary">
                          Open {item.media_type}
                        </a>
                      )
                    ) : (
                      <div
                        className="mediaPending"
                        style={{
                          background: "var(--bg-elev)",
                          border: "1px dashed var(--border-strong)",
                          borderRadius: "var(--r-sm)",
                          padding: "20px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: mediaPending ? "var(--accent)" : "var(--alarm)",
                            boxShadow: mediaPending
                              ? "0 0 8px var(--accent-glow)"
                              : "0 0 8px var(--alarm-glow)",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--ink-1)",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {mediaPending ? "Processing media — refresh in a minute" : "Not yet processed"}
                        </span>
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

          {/* Responsibility tree — who handles this type of issue */}
          <ResponsibilityTree category={report.category_final} />

          {/* Elected representatives for this ward */}
          {report.elected_representatives && report.elected_representatives.length > 0 && (
            <RepresentativeCard representatives={report.elected_representatives} />
          )}
        </div>
      </div>
    </main>
  );
}
