import Link from "next/link";

import { fetchWardMetrics } from "@/lib/api";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";

export default async function DashboardPage() {
  const locale = getServerLocale();
  const messages = getMessages(locale);
  const metrics = await fetchWardMetrics();

  return (
    <main>
      <section className="hero">
        <h1>{messages.dashboardTitle}</h1>
        <p>{messages.dashboardSubtitle}</p>
      </section>

      <section className="reportGrid">
        {metrics.map((item) => (
          <article className="reportCard" key={`${item.ward_id ?? 'unknown-ward'}-${item.zone_id ?? 'unknown-zone'}`}>
            <h3>{item.ward_id ?? "Unknown Ward"}</h3>
            <p className="muted">Zone: {item.zone_id ?? "Unknown"}</p>
            <p>Total reports: {item.total_reports}</p>
            <p>Open reports: {item.open_reports}</p>
            <p>Notify actions: {item.notify_events}</p>
          </article>
        ))}
      </section>

      <p style={{ marginTop: "18px" }}>
        <Link href="/" className="button secondary">
          Back to map
        </Link>
      </p>
    </main>
  );
}
