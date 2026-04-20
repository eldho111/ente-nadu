import ReportFlow from "@/components/ReportFlow";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";

export default function MobileAppReportPage() {
  const locale = getServerLocale();
  const messages = getMessages(locale);

  return (
    <section style={{ display: "grid", gap: 10 }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>{messages.navReport}</h1>
      <p className="muted" style={{ margin: 0 }}>
        {messages.reportSubtitle}
      </p>
      <ReportFlow />
    </section>
  );
}
