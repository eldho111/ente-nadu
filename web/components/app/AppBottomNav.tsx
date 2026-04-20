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
    { href: "/app", label: labels.map },
    { href: "/app/report", label: labels.report },
    { href: "/app/track", label: labels.track },
    { href: "/app/settings", label: labels.settings },
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
        background: "#fffdf8",
        borderTop: "1px solid #dfd5c0",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 4px",
                display: "grid",
                placeItems: "center",
                gap: 2,
                color: active ? "#0c7a5f" : "#4b5c5a",
                textDecoration: "none",
                fontWeight: active ? 700 : 500,
                fontSize: 12,
              }}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
