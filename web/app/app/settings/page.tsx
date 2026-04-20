import AppSettingsClient from "@/components/app/AppSettingsClient";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";

export default function MobileAppSettingsPage() {
  const locale = getServerLocale();
  const messages = getMessages(locale);

  return (
    <section style={{ display: "grid", gap: 10 }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>{messages.appSettingsTitle}</h1>
      <p className="muted" style={{ margin: 0 }}>
        {messages.appSettingsSubtitle}
      </p>
      <AppSettingsClient locale={locale} />
    </section>
  );
}
