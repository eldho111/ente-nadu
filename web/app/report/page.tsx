import ReportFlow from "@/components/ReportFlow";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";

export const metadata = { title: "Report an Issue - Civic Pulse" };

export default function ReportPage() {
  const locale = getServerLocale();
  const messages = getMessages(locale);

  return (
    <main>
      <section className="hero">
        <h1>{messages.reportTitle}</h1>
        <p>{messages.reportSubtitle}</p>
      </section>
      <ReportFlow />
    </main>
  );
}
