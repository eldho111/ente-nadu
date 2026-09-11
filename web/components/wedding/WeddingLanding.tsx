"use client";

/**
 * Wedding planner landing — a grid of large "glass" tiles that act as
 * entry points into each section. Replaces the tab rail at the top for
 * a more visual, focused-one-at-a-time UX.
 *
 * Each tile carries the section's icon, its title, and a live subtitle
 * pulled from the engine so the landing itself is a scannable status
 * board (₹X planned · Y guests confirmed · Z tasks overdue) rather than
 * a purely decorative index.
 */

import type { EngineResult } from "@/lib/wedding/types";
import { readAudit } from "@/lib/wedding/audit";
import { useEffect, useState } from "react";

export type LandingId =
  | "dash"
  | "budget"
  | "guests"
  | "tasks"
  | "vendors"
  | "contacts"
  | "runsheets"
  | "shopping"
  | "church"
  | "history"
  | "settings";

type Props = {
  engine: EngineResult;
  contactsCount: number;
  shoppingBought: number;
  shoppingTotal: number;
  vendorsBooked: number;
  vendorsShortlisted: number;
  groupTitle?: (id: LandingId) => string | undefined;
  onOpen: (id: LandingId) => void;
};

function currency(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${Math.round(n / 1_000)}k`;
  return `₹${Math.round(n)}`;
}

export default function WeddingLanding({
  engine,
  contactsCount,
  shoppingBought,
  shoppingTotal,
  vendorsBooked,
  vendorsShortlisted,
  onOpen,
}: Props) {
  const [logCount, setLogCount] = useState<number>(0);
  useEffect(() => {
    setLogCount(readAudit().length);
  }, []);

  const daysText =
    engine.daysTo == null
      ? "Set the wedding date"
      : engine.daysTo < 0
        ? `${Math.abs(engine.daysTo)} days ago`
        : engine.daysTo === 0
          ? "Today"
          : `${engine.daysTo} days to go`;

  const tiles: {
    id: LandingId;
    icon: string;
    title: string;
    subtitle: string;
    tone: "primary" | "money" | "people" | "plan" | "quiet";
    span?: 1 | 2;
  }[] = [
    {
      id: "dash",
      icon: "◈",
      title: "Overview",
      subtitle: `${currency(engine.planned)} planned · ${daysText}`,
      tone: "primary",
      span: 2,
    },
    {
      id: "budget",
      icon: "₹",
      title: "Budget & finance",
      subtitle: `${currency(engine.spent)} spent · ${currency(engine.advance)} advance · ${currency(engine.funds)} in`,
      tone: "money",
    },
    {
      id: "shopping",
      icon: "◇",
      title: "Shopping",
      subtitle:
        shoppingTotal === 0
          ? "No items yet"
          : `${shoppingBought} / ${shoppingTotal} bought`,
      tone: "money",
    },
    {
      id: "guests",
      icon: "◉",
      title: "Guest list",
      subtitle: `${engine.guests.invited} invited · ${engine.guests.confirmed} yes · ${engine.guests.pax} pax`,
      tone: "people",
    },
    {
      id: "vendors",
      icon: "▤",
      title: "Vendors",
      subtitle: `${vendorsBooked} booked · ${vendorsShortlisted} shortlisted`,
      tone: "people",
    },
    {
      id: "contacts",
      icon: "☎",
      title: "Contacts",
      subtitle:
        contactsCount === 0
          ? "No contacts yet"
          : `${contactsCount} people saved`,
      tone: "people",
    },
    {
      id: "tasks",
      icon: "✓",
      title: "Timeline & tasks",
      subtitle:
        engine.overdue.length > 0
          ? `${engine.tasksDone} done · ${engine.overdue.length} overdue`
          : `${engine.tasksDone} done`,
      tone: "plan",
    },
    {
      id: "runsheets",
      icon: "◷",
      title: "Event runsheets",
      subtitle: "Engagement · Madhuram · Wedding day",
      tone: "plan",
    },
    {
      id: "church",
      icon: "✝",
      title: "Church formalities",
      subtitle: "Banns · certificates · registrar",
      tone: "plan",
    },
    {
      id: "history",
      icon: "⌛",
      title: "History",
      subtitle:
        logCount === 0
          ? "No changes yet"
          : `${logCount} change${logCount === 1 ? "" : "s"} logged`,
      tone: "quiet",
    },
    {
      id: "settings",
      icon: "⚙",
      title: "Settings & backup",
      subtitle: "Export · import · reset",
      tone: "quiet",
    },
  ];

  return (
    <div className="wLanding">
      <div className="wLandingGrid">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={`wTile wTile-${tile.tone} ${tile.span === 2 ? "wTileWide" : ""}`}
            onClick={() => onOpen(tile.id)}
            aria-label={`${tile.title} — ${tile.subtitle}`}
          >
            <span className="wTileIcon" aria-hidden="true">
              {tile.icon}
            </span>
            <span className="wTileBody">
              <span className="wTileTitle">{tile.title}</span>
              <span className="wTileSub">{tile.subtitle}</span>
            </span>
            <span className="wTileArrow" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>

      <style>{`
        .wLanding { display: grid; gap: 20px; }
        .wLandingGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .wTile {
          appearance: none;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          display: grid;
          grid-template-columns: 44px 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 18px 18px;
          min-height: 108px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.42) 100%);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 12px 24px rgba(15, 23, 42, 0.06),
            0 2px 4px rgba(15, 23, 42, 0.04);
          transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          color: var(--ink-0);
          position: relative;
          overflow: hidden;
        }
        .wTile::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(180deg, transparent 40%, rgba(255, 255, 255, 0.18) 100%);
        }
        .wTile:hover {
          transform: translateY(-2px);
          border-color: rgba(62, 104, 92, 0.65);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95) inset,
            0 18px 32px rgba(15, 23, 42, 0.10),
            0 4px 8px rgba(15, 23, 42, 0.05);
        }
        .wTile:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        .wTileWide { grid-column: span 2; }
        .wTileIcon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 22px;
          color: #fff;
          background: linear-gradient(135deg, #4a7a70, #3e685c);
          box-shadow: 0 6px 12px rgba(62, 104, 92, 0.28);
          font-family: system-ui, -apple-system, sans-serif;
        }
        .wTile-money .wTileIcon { background: linear-gradient(135deg, #a97e46, #8a6a38); box-shadow: 0 6px 12px rgba(138, 106, 56, 0.28); }
        .wTile-people .wTileIcon { background: linear-gradient(135deg, #6899a5, #4c7784); box-shadow: 0 6px 12px rgba(76, 119, 132, 0.28); }
        .wTile-plan .wTileIcon { background: linear-gradient(135deg, #6d7cad, #4f5f92); box-shadow: 0 6px 12px rgba(79, 95, 146, 0.28); }
        .wTile-quiet .wTileIcon { background: linear-gradient(135deg, #7a828f, #5b6172); box-shadow: 0 6px 12px rgba(91, 97, 114, 0.28); }
        .wTileBody { display: grid; gap: 5px; min-width: 0; }
        .wTileTitle {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--ink-0);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .wTileSub {
          font-size: 12px;
          color: var(--ink-1);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .wTileArrow {
          font-size: 18px;
          color: var(--ink-muted);
          opacity: 0.6;
          transition: transform 0.2s ease, opacity 0.2s ease, color 0.2s ease;
        }
        .wTile:hover .wTileArrow {
          transform: translateX(3px);
          opacity: 1;
          color: var(--accent);
        }
        .wTile-primary {
          background:
            linear-gradient(135deg, rgba(62, 104, 92, 0.14) 0%, rgba(255, 255, 255, 0.55) 100%);
          border-color: rgba(62, 104, 92, 0.32);
        }
        .wTile-primary .wTileTitle { color: var(--accent-deep, var(--accent)); }

        @media (max-width: 960px) {
          .wLandingGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .wTileWide { grid-column: span 2; }
        }
        @media (max-width: 560px) {
          .wLandingGrid { grid-template-columns: 1fr; gap: 10px; }
          .wTileWide { grid-column: span 1; }
          .wTile {
            min-height: 88px;
            padding: 14px 14px;
            border-radius: 14px;
          }
          .wTileIcon { width: 38px; height: 38px; font-size: 18px; }
          .wTileTitle { font-size: 14px; white-space: normal; }
          .wTileSub { font-size: 11.5px; white-space: normal; }
        }
      `}</style>
    </div>
  );
}
