/**
 * Admin section — bare layout, no public Header / nav. Inherits the
 * <html><body> from the root layout in app/layout.tsx but renders
 * children directly without the citizen-facing chrome.
 */

export const metadata = {
  title: "Ente Nadu · Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "32px 20px 64px",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {children}
    </main>
  );
}
