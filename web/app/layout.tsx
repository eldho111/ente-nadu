import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Fraunces, Noto_Sans_Malayalam } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import BootMarker from "@/components/BootMarker";
import PwaBoot from "@/components/PwaBoot";
import { getServerLocale } from "@/lib/server-locale";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });
const malayalam = Noto_Sans_Malayalam({ subsets: ["malayalam"], variable: "--font-ml", weight: ["400", "600", "700"] });

export const viewport: Viewport = {
  themeColor: "#0a4d3c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ente Nadu — എന്റെ നാട്",
  description: "Kerala civic reporting platform. Report issues with photo evidence, AI classification, and track your elected representatives' accountability.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ente Nadu",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();
  return (
    <html lang={locale}>
      <body className={`${display.variable} ${body.variable} ${malayalam.variable}`}>
        <div
          id="cp-boot-fallback"
          style={{
            margin: "12px",
            padding: "10px 12px",
            border: "1px solid #d7d1bf",
            borderRadius: 8,
            background: "#fff",
            color: "#102120",
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          Ente Nadu is starting. If this screen stays blank, open <a href="/doctor/runtime">runtime doctor</a>.
        </div>
        <Header />
        {children}
        <BootMarker />
        <PwaBoot />
      </body>
    </html>
  );
}
