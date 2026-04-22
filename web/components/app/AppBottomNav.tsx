"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  labels: {
    map: string;
    report: string;
    track: string;
    settings: string;
  };
};

/**
 * Dark institutional bottom nav. SVG icons (line art) tinted with
 * currentColor so they re-theme automatically. Center Report tab stays
 * a saturated-red FAB — the single "take action now" moment.
 */
export default function AppBottomNav({ labels }: Props) {
  const pathname = usePathname();
  const items = [
    { href: "/app",          label: labels.map,      icon: "/icons/nav/map.svg" },
    { href: "/app/report",   label: labels.report,   icon: "/icons/nav/report.svg", highlight: true },
    { href: "/app/track",    label: labels.track,    icon: "/icons/nav/track.svg" },
    { href: "/app/settings", label: labels.settings, icon: "/icons/nav/settings.svg" },
  ];

  return (
    <nav
      aria-label="App navigation"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        background: "var(--bg-0)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          position: "relative",
        }}
      >
        {items.map((item) => {
          const active = pathname === item.href;
          const isReport = item.highlight;

          if (isReport) {
            // Saturated-red FAB, elevated 20px above the bar.
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: "8px 4px",
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -20,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: active ? "var(--alarm-deep)" : "var(--alarm)",
                    display: "grid",
                    placeItems: "center",
                    border: "2px solid var(--bg-0)",
                    boxShadow: "0 4px 16px rgba(230, 57, 70, 0.45)",
                    zIndex: 2,
                    color: "#ffffff",
                  }}
                >
                  <img
                    src={item.icon}
                    alt=""
                    width="26"
                    height="26"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--alarm)",
                    marginTop: 40,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 4px 8px",
                display: "grid",
                placeItems: "center",
                gap: 3,
                color: active ? "var(--ink-0)" : "var(--ink-muted)",
                textDecoration: "none",
                fontSize: 9,
                fontWeight: 700,
                position: "relative",
                minHeight: 56,
              }}
            >
              {/* Thin red top-rail on active tab */}
              {active && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "25%",
                    right: "25%",
                    height: 2,
                    background: "var(--alarm)",
                  }}
                />
              )}
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 22,
                  height: 22,
                  background: "currentColor",
                  WebkitMaskImage: `url(${item.icon})`,
                  maskImage: `url(${item.icon})`,
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  opacity: active ? 1 : 0.75,
                }}
              />
              <span
                style={{
                  letterSpacing: "0.12em",
                  fontFamily: "var(--font-body)",
                  textTransform: "uppercase",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
