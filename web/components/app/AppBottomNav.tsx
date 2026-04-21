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

export default function AppBottomNav({ labels }: Props) {
  const pathname = usePathname();
  const items = [
    { href: "/app", label: labels.map, icon: "/icons/nav/map.svg" },
    { href: "/app/report", label: labels.report, icon: "/icons/nav/report.svg", highlight: true },
    { href: "/app/track", label: labels.track, icon: "/icons/nav/track.svg" },
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
        background: "linear-gradient(180deg, var(--kasavu-surface) 0%, var(--kasavu-cream) 100%)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        boxShadow: "0 -4px 16px rgba(26, 18, 8, 0.12)",
      }}
    >
      {/* Kasavu double-rule at the top edge (the gold thread) */}
      <div
        aria-hidden="true"
        style={{
          height: 6,
          background:
            "linear-gradient(to bottom," +
            " var(--kasavu-gold) 0 1px," +
            " var(--kasavu-cream) 1px 3px," +
            " var(--kasavu-gold-light) 3px 4px," +
            " transparent 4px 100%)",
        }}
      />

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
            // Saffron FAB — chayilyam gradient with a thin zari gold ring
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
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    background: active
                      ? "linear-gradient(135deg, #7a2410, #4a1608)"
                      : "linear-gradient(135deg, #d4a017, #a8321e)",
                    display: "grid",
                    placeItems: "center",
                    border: "3px solid var(--kasavu-surface)",
                    boxShadow:
                      "0 0 0 1px var(--kasavu-gold), 0 4px 16px rgba(168, 50, 30, 0.45)",
                    zIndex: 2,
                    color: "#fffdf5",
                  }}
                >
                  <img
                    src={item.icon}
                    alt=""
                    width="26"
                    height="26"
                    style={{
                      filter: "brightness(0) invert(1)",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--mural-red-deep)",
                    marginTop: 40,
                    letterSpacing: "0.06em",
                    fontFamily: "var(--font-stamp), monospace",
                    textTransform: "uppercase",
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
                color: active ? "var(--mural-green-deep)" : "var(--ink-soft)",
                textDecoration: "none",
                fontWeight: active ? 700 : 600,
                fontSize: 10,
                position: "relative",
                minHeight: 56,
              }}
            >
              {/* Active tab marker — zari gold drop */}
              {active && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "30%",
                    right: "30%",
                    height: 3,
                    background:
                      "linear-gradient(to right, transparent, var(--kasavu-gold) 30%, var(--mural-red) 50%, var(--kasavu-gold) 70%, transparent)",
                    borderRadius: "0 0 6px 6px",
                  }}
                />
              )}
              <img
                src={item.icon}
                alt=""
                width="24"
                height="24"
                style={{
                  opacity: active ? 1 : 0.7,
                  // Tint the line-art via CSS filter: currentColor-ish
                  filter: active
                    ? "brightness(0) saturate(100%) invert(22%) sepia(45%) saturate(700%) hue-rotate(120deg) brightness(60%)"
                    : "brightness(0) saturate(100%) invert(40%) sepia(10%) saturate(500%) hue-rotate(10deg) brightness(70%)",
                }}
              />
              <span
                style={{
                  letterSpacing: "0.05em",
                  fontFamily: "var(--font-stamp), monospace",
                  textTransform: "uppercase",
                  fontSize: 9,
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
