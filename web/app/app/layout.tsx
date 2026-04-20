import AppBottomNav from "@/components/app/AppBottomNav";
import AppTopBar from "@/components/app/AppTopBar";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/server-locale";

export default function MobileAppLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();
  const messages = getMessages(locale);

  return (
    <>
      <AppTopBar title={messages.brand} subtitle={messages.appModeSubtitle} />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "14px 14px 86px" }}>{children}</main>
      <AppBottomNav
        labels={{
          map: messages.navMap,
          report: messages.navReport,
          track: messages.navTrack,
          settings: messages.navSettings,
        }}
      />
    </>
  );
}
