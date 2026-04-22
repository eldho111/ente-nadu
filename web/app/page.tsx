import dynamic from "next/dynamic";

import MobileAppRedirect from "@/components/MobileAppRedirect";
import KPIRow, { type KPIItem } from "@/components/dashboard/KPIRow";
import HotspotList, { type Hotspot } from "@/components/dashboard/HotspotList";
import CategoryBars, { type CategoryRow } from "@/components/dashboard/CategoryBars";
import DepartmentResolution, { type DeptRow } from "@/components/dashboard/DepartmentResolution";
import TimeSeriesStrip, { type DailyBucket } from "@/components/dashboard/TimeSeriesStrip";
import ReportTable, { type ReportRow } from "@/components/dashboard/ReportTable";

import { fetchReports, type ReportCard } from "@/lib/api";
import { STATUS_LABELS, CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/reportConstants";

const PublicMap = dynamic(() => import("@/components/PublicMap"), { ssr: false });

// ── Kerala department routing (matches infra/seed-routing-rules-kerala.json) ──
// Used to aggregate resolution rate per-department on the client. Lightweight
// approximation — replace with a /v1/department-metrics endpoint once the data
// service grows beyond ~5k reports.
const CATEGORY_TO_DEPT: Record<string, { code: string; label: string }> = {
  pothole:             { code: "PWD",   label: "PWD · Roads" },
  waterlogging:        { code: "LSGD",  label: "LSGD · Drainage" },
  flood_drainage:      { code: "LSGD",  label: "LSGD · Drainage" },
  canal_blockage:      { code: "IRRIG", label: "Irrigation" },
  streetlight_outage:  { code: "KSEB",  label: "KSEB · Streetlights" },
  signal_malfunction:  { code: "TRAFF", label: "Traffic Police" },
  traffic_hotspot:     { code: "TRAFF", label: "Traffic Police" },
  illegal_parking:     { code: "TRAFF", label: "Traffic Police" },
  footpath_obstruction:{ code: "LSGD",  label: "LSGD · Footpaths" },
  open_manhole:        { code: "KWA",   label: "KWA · Water" },
  construction_debris: { code: "LSGD",  label: "LSGD · Sanitation" },
  garbage_dumping:     { code: "SCHT",  label: "Suchitwa Mission" },
  public_toilet:       { code: "LSGD",  label: "LSGD · Sanitation" },
  stray_animal_menace: { code: "HEALTH",label: "Health Dept" },
  tree_fall_risk:      { code: "FOREST",label: "Forest Dept" },
  other:               { code: "LSGD",  label: "LSGD · General" },
};

export default async function HomePage() {
  // 200 is enough for the full dashboard composition: the panels are all
  // counts/aggregates, the map clusters, and the report table shows only the
  // most recent 20. Going higher just bloats SSR and widens the failure blast
  // radius when the API is slow.
  const reports = await fetchReports({ page_size: 200 });

  const totals = summarize(reports);
  const hotspots = topHotspots(reports, 10);
  const categories = topCategories(reports, 8);
  const deptStats = deptResolution(reports);
  const daily = dailyBuckets(reports, 30);
  const tableRows = toTableRows(reports, 20);

  const kpis: KPIItem[] = [
    {
      key: "total",
      value: totals.total,
      label: "Total Reports",
      variant: "default",
      sublabel: "All-time",
    },
    {
      key: "open",
      value: totals.open,
      label: "Open",
      variant: "open",
      trendPct: pctOfTotal(totals.open, totals.total),
      trendLabel: "of total",
    },
    {
      key: "progress",
      value: totals.progress,
      label: "In Progress",
      variant: "progress",
      trendPct: pctOfTotal(totals.progress, totals.total),
      trendLabel: "of total",
    },
    {
      key: "fixed",
      value: totals.fixed,
      label: "Fixed",
      variant: "fixed",
      trendPct: pctOfTotal(totals.fixed, totals.total),
      trendLabel: "of total",
    },
    {
      key: "today",
      value: totals.today,
      label: "Filed Today",
      variant: "info",
      sublabel: "Last 24h",
    },
  ];

  return (
    <main>
      <MobileAppRedirect />

      {/* ── KPI ROW ── */}
      <section style={{ marginBottom: 12 }}>
        <KPIRow items={kpis} />
      </section>

      {/* ── 3-COLUMN GRID: hotspots | map | category+dept ── */}
      <section className="dash-grid">
        <div className="col col-left">
          <HotspotList items={hotspots} />
        </div>

        <div className="col col-center">
          <div className="mapShell">
            <PublicMap reports={reports} />
          </div>
        </div>

        <div className="col col-right">
          <CategoryBars items={categories} />
          <DepartmentResolution items={deptStats} />
        </div>
      </section>

      {/* ── TIME SERIES STRIP ── */}
      <section style={{ marginTop: 10 }}>
        <TimeSeriesStrip buckets={daily} />
      </section>

      {/* ── REPORT TABLE ── */}
      <section style={{ marginTop: 10 }}>
        <ReportTable rows={tableRows} />
      </section>

      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr) 320px;
          gap: 10px;
          align-items: stretch;
        }
        .col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .col-center { min-height: 520px; }
        .col-center .mapShell { flex: 1; min-height: 520px; }
        .col-center .mapFrame { min-height: 520px; }

        @media (max-width: 1100px) {
          .dash-grid { grid-template-columns: 1fr 1fr; }
          .col-center { grid-column: 1 / -1; }
        }
        @media (max-width: 640px) {
          .dash-grid { grid-template-columns: 1fr; }
          .col-center { min-height: 360px; }
          .col-center .mapShell,
          .col-center .mapFrame { min-height: 360px; }
        }
      `}</style>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════
// CLIENT-SIDE AGGREGATIONS
// ═══════════════════════════════════════════════════════════

function summarize(reports: ReportCard[]) {
  const total = reports.length;
  let open = 0;
  let progress = 0;
  let fixed = 0;
  let today = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const r of reports) {
    if (r.status === "open") open++;
    else if (r.status === "fixed") fixed++;
    else if (r.status === "acknowledged" || r.status === "in_progress") progress++;
    const created = new Date(r.created_at).getTime();
    if (Number.isFinite(created) && now - created < dayMs) today++;
  }
  return { total, open, progress, fixed, today };
}

function topHotspots(reports: ReportCard[], n: number): Hotspot[] {
  const counts: Record<string, number> = {};
  for (const r of reports) {
    if (r.status !== "open") continue;
    const key = (r.ward_id || r.zone_id || "unassigned").trim();
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([ward, count]) => ({ ward: beautifyWard(ward), count }));
}

function beautifyWard(w: string): string {
  if (!w || w === "unassigned") return "Unassigned";
  // "KL-EKM-W42" → "EKM-W42", etc. — keep last meaningful chunk.
  const chunks = w.split(/[-_]/).filter(Boolean);
  if (chunks.length <= 1) return w;
  return chunks.slice(-2).join("-");
}

function topCategories(reports: ReportCard[], n: number): CategoryRow[] {
  const counts: Record<string, number> = {};
  for (const r of reports) {
    counts[r.category] = (counts[r.category] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category, count]) => ({
      category,
      label: CATEGORY_LABELS[category] || category.replaceAll("_", " "),
      count,
    }));
}

function deptResolution(reports: ReportCard[]): DeptRow[] {
  // Bucket reports by department; compute resolved % per bucket.
  type Bucket = { total: number; fixed: number; label: string; code: string };
  const buckets: Record<string, Bucket> = {};
  for (const r of reports) {
    const dept = CATEGORY_TO_DEPT[r.category] || { code: "OTHER", label: "Other" };
    const b = buckets[dept.code] || (buckets[dept.code] = { total: 0, fixed: 0, label: dept.label, code: dept.code });
    b.total += 1;
    if (r.status === "fixed") b.fixed += 1;
  }
  return Object.values(buckets)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map((b) => ({
      dept: b.code,
      label: b.label,
      resolvedPct: b.total === 0 ? 0 : Math.round((b.fixed / b.total) * 100),
      total: b.total,
    }));
}

function dailyBuckets(reports: ReportCard[], days: number): DailyBucket[] {
  const now = new Date();
  const buckets: DailyBucket[] = [];
  const map: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    map[key] = 0;
    buckets.push({ date: key, count: 0 });
  }
  for (const r of reports) {
    const key = r.created_at.slice(0, 10);
    if (map[key] !== undefined) {
      map[key] += 1;
    }
  }
  for (const b of buckets) b.count = map[b.date] || 0;
  return buckets;
}

function toTableRows(reports: ReportCard[], n: number): ReportRow[] {
  return reports
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, n)
    .map((r) => ({
      publicId: r.public_id,
      category: r.category,
      categoryLabel: CATEGORY_LABELS[r.category] || r.category.replaceAll("_", " "),
      categoryIcon: CATEGORY_ICONS[r.category],
      status: r.status,
      statusLabel: STATUS_LABELS[r.status] || r.status,
      ward: r.ward_id ? beautifyWard(r.ward_id) : null,
      createdAt: r.created_at,
    }));
}

function pctOfTotal(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}
