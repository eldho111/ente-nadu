import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import BootMarker from "@/components/BootMarker";
import PwaBoot from "@/components/PwaBoot";
import { getServerLocale } from "@/lib/server-locale";

// Single variable sans-serif — covers 100–900 weight + tabular numerics.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  // Dark brand bar color; the actual page background swaps per theme.
  themeColor: "#0b0b0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ente Nadu — Civic Operations",
  description:
    "Live civic-reporting dashboard for Kerala. Photo evidence, AI classification, and public accountability of elected representatives.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ente Nadu",
  },
};

// No-FOUC theme script — runs synchronously before React hydrates.
// Reads localStorage → system preference → falls back to dark, then
// stamps the chosen theme on <html> so first paint has the right colors.
const themeBootScript = `
(function () {
  try {
    var stored = localStorage.getItem('ente-nadu-theme');
    var theme = stored;
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Theme must be applied BEFORE first paint to avoid FOUC. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
      </head>
      <body className={inter.variable}>
        <div
          id="cp-boot-fallback"
          style={{
            margin: "12px",
            padding: "10px 12px",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--bg-surface)",
            color: "var(--ink-0)",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          Ente Nadu is starting. If this screen stays blank, open{" "}
          <a href="/doctor/runtime">runtime doctor</a>.
        </div>
        <Header />
        {children}
        <BootMarker />
        <PwaBoot />
      </body>
    </html>
  );
}
