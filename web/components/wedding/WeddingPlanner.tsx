"use client";

/**
 * Wedding planner shell — section nav plus the shared stylesheet.
 *
 * Desktop gets a horizontal section rail; below 840px it collapses to a
 * fixed bottom tab bar (four primary sections plus a More sheet), which is
 * the pattern the rest of the /app routes use.
 */
import { useMemo, useState } from "react";

import { runEngine } from "@/lib/wedding/engine";
import { useWeddingStore } from "@/lib/wedding/store";

import { Budget, Dashboard, SettingsPanel } from "./SectionsMoney";
import { Contacts, Guests, Vendors } from "./SectionsPeople";
import { Church, Runsheets, Shopping, Tasks } from "./SectionsPlan";

type SectionId =
  | "dash"
  | "budget"
  | "guests"
  | "tasks"
  | "vendors"
  | "contacts"
  | "runsheets"
  | "shopping"
  | "church"
  | "settings";

const SECTIONS: { id: SectionId; icon: string; label: string; short: string }[] = [
  { id: "dash", icon: "◈", label: "Dashboard", short: "Home" },
  { id: "budget", icon: "₹", label: "Budget & Finance", short: "Budget" },
  { id: "guests", icon: "◉", label: "Guest List", short: "Guests" },
  { id: "tasks", icon: "✓", label: "Timeline & Tasks", short: "Tasks" },
  { id: "vendors", icon: "▤", label: "Vendors", short: "Vendors" },
  { id: "contacts", icon: "☎", label: "Contacts", short: "Contacts" },
  { id: "runsheets", icon: "◷", label: "Event Runsheets", short: "Runsheet" },
  { id: "shopping", icon: "◇", label: "Shopping", short: "Shopping" },
  { id: "church", icon: "✝", label: "Church Formalities", short: "Church" },
  { id: "settings", icon: "⚙", label: "Settings & Backup", short: "Settings" },
];

const PRIMARY: SectionId[] = ["dash", "budget", "guests", "tasks"];

export default function WeddingPlanner() {
  const { state, update, replace, reset } = useWeddingStore();
  const [section, setSection] = useState<SectionId>("dash");
  const [moreOpen, setMoreOpen] = useState(false);

  const engine = useMemo(() => (state ? runEngine(state) : null), [state]);

  const go = (id: SectionId) => {
    setSection(id);
    setMoreOpen(false);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  if (!state || !engine) {
    return <div className="wLoading">Loading the plan…</div>;
  }

  const active = SECTIONS.find((s) => s.id === section);

  return (
    <div className="wWrap">
      <header className="wHead">
        <div>
          <div className="wKicker">PRIVATE · FAMILY PLANNER</div>
          <h1>
            {state.settings.groomName}
            {state.settings.brideName ? ` & ${state.settings.brideName}` : ""} — Wedding
          </h1>
          <p>
            Syrian Orthodox marriage in Kerala: engagement, madhuram veppu at home the night before,
            and the church wedding with reception.
          </p>
        </div>
      </header>

      <nav className="wRail" aria-label="Planner sections">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === section ? "active" : ""}
            onClick={() => go(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="wSectionTitle">{active?.label}</div>

      <main className="wBody">
        {section === "dash" && <Dashboard state={state} engine={engine} />}
        {section === "budget" && <Budget state={state} engine={engine} update={update} />}
        {section === "guests" && <Guests state={state} engine={engine} update={update} />}
        {section === "tasks" && <Tasks state={state} engine={engine} update={update} />}
        {section === "vendors" && <Vendors state={state} engine={engine} update={update} />}
        {section === "contacts" && <Contacts state={state} update={update} />}
        {section === "runsheets" && <Runsheets state={state} update={update} />}
        {section === "shopping" && <Shopping state={state} update={update} />}
        {section === "church" && <Church />}
        {section === "settings" && (
          <SettingsPanel
            state={state}
            engine={engine}
            update={update}
            replace={replace}
            reset={reset}
          />
        )}
      </main>

      {/* Mobile bottom bar — four primary sections plus More. */}
      <nav className="wTabs" aria-label="Planner sections (mobile)">
        {SECTIONS.filter((s) => PRIMARY.includes(s.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === section ? "active" : ""}
            onClick={() => go(item.id)}
          >
            <span className="wTabIcon">{item.icon}</span>
            <span>{item.short}</span>
          </button>
        ))}
        <button
          type="button"
          className={!PRIMARY.includes(section) ? "active" : ""}
          onClick={() => setMoreOpen(true)}
        >
          <span className="wTabIcon">⋯</span>
          <span>More</span>
        </button>
      </nav>

      {moreOpen ? (
        <div
          className="wSheetOverlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoreOpen(false);
          }}
        >
          <div className="wSheet">
            <div className="wSheetTitle">All sections</div>
            <div className="wSheetGrid">
              {SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === section ? "active" : ""}
                  onClick={() => go(item.id)}
                >
                  <span className="wTabIcon">{item.icon}</span>
                  <span>{item.short}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .wLoading { padding: 18vh 0; text-align: center; color: var(--ink-muted); font-size: 13px; }

        .wWrap {
          max-width: 1440px;
          margin: 0 auto;
          padding: 26px 24px 40px;
        }

        .wHead { margin-bottom: 18px; }
        .wKicker {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: var(--ink-soft);
          margin-bottom: 8px;
        }
        .wHead h1 {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--ink-0);
          margin: 0 0 6px;
        }
        .wHead p {
          font-size: 13px;
          color: var(--ink-1);
          line-height: 1.55;
          margin: 0;
          max-width: 70ch;
        }

        .wRail {
          display: flex;
          gap: 2px;
          overflow-x: auto;
          border-bottom: 1px solid var(--border);
          margin-bottom: 18px;
          scrollbar-width: thin;
        }
        .wRail button {
          flex: 0 0 auto;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--ink-1);
          font-family: inherit;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          padding: 10px 14px;
          cursor: pointer;
          transition: color 0.16s ease, border-color 0.16s ease;
        }
        .wRail button:hover { color: var(--accent); }
        .wRail button.active { color: var(--ink-0); border-bottom-color: var(--accent); }

        .wSectionTitle { display: none; }

        /* ── Alerts ───────────────────────────────────────────── */
        .wAlerts { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
        .wAlert {
          font-size: 13px;
          line-height: 1.5;
          padding: 11px 14px;
          border-radius: var(--r-md);
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--ink-1);
          border-left-width: 3px;
        }
        .wAlert-bad  { border-left-color: var(--alarm); background: var(--alarm-soft); color: var(--ink-0); }
        .wAlert-warn { border-left-color: var(--gold);  background: var(--gold-soft);  color: var(--ink-0); }
        .wAlert-ok   { border-left-color: var(--accent); background: var(--accent-soft); color: var(--ink-0); }
        .wAlert-info { border-left-color: var(--border-strong); }

        /* ── Stats ────────────────────────────────────────────── */
        .wStats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }
        .wStat {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          padding: 14px 16px;
          box-shadow: var(--shadow-sm);
        }
        .wStatLabel {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .wStatValue {
          font-size: 22px;
          font-weight: 600;
          color: var(--ink-0);
          margin-top: 6px;
          font-variant-numeric: tabular-nums;
        }
        .wStatDanger { color: var(--alarm); }
        .wStatSub { font-size: 11.5px; color: var(--ink-1); margin-top: 4px; line-height: 1.5; }
        .wBar {
          height: 4px;
          background: var(--bg-elev);
          border-radius: 2px;
          margin-top: 10px;
          overflow: hidden;
        }
        .wBar i { display: block; height: 100%; background: var(--accent); }
        .wBar i.over { background: var(--alarm); }

        /* ── Panels ───────────────────────────────────────────── */
        .wPanel {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          box-shadow: var(--shadow-sm);
          margin-bottom: 16px;
          overflow: hidden;
        }
        .wPanelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-soft);
          padding: 13px 16px;
          border-bottom: 1px solid var(--border);
        }
        .wPanelBody { padding: 4px 0 0; }
        .wHint {
          font-size: 12.5px;
          color: var(--ink-1);
          line-height: 1.55;
          padding: 12px 16px 4px;
          margin: 0;
          max-width: 92ch;
        }
        .wFoot {
          font-size: 11.5px;
          color: var(--ink-muted);
          line-height: 1.55;
          padding: 10px 16px 14px;
          margin: 0;
        }

        /* ── Tables ───────────────────────────────────────────── */
        .wTableWrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .wTable { width: 100%; border-collapse: collapse; font-size: 13px; }
        .wTable th {
          text-align: left;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-soft);
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .wTable td {
          padding: 4px 12px;
          border-bottom: 1px solid var(--grid-line);
          color: var(--ink-0);
          vertical-align: middle;
        }
        .wTable tr:last-child td { border-bottom: none; }
        .wTable .wNum { text-align: right; font-variant-numeric: tabular-nums; }
        .wCenter { text-align: center; }
        .wMuted { color: var(--ink-muted); font-size: 12px; }
        .wGrand td {
          background: var(--bg-elev);
          font-weight: 600;
          color: var(--ink-0);
          border-top: 1px solid var(--border-strong);
        }
        .wDerived td { background: var(--accent-soft); }
        .wDone td { opacity: 0.55; }
        .wDone input[type="text"] { text-decoration: line-through; }

        .wCellInput {
          width: 100%;
          min-width: 90px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--r-sm);
          color: var(--ink-0);
          font-family: inherit;
          font-size: 13px;
          padding: 7px 8px;
        }
        .wCellInput::placeholder { color: var(--ink-soft); }
        .wCellInput:hover { border-color: var(--border); background: var(--bg-elev); }
        .wCellInput:focus {
          outline: none;
          border-color: var(--accent);
          background: var(--bg-0);
        }
        .wCellInput.wNum { text-align: right; font-variant-numeric: tabular-nums; }
        select.wCellInput { min-width: 104px; cursor: pointer; }

        .wCheck { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }

        .wStatusCell { display: flex; align-items: center; gap: 8px; }
        .wPhone {
          display: block;
          font-size: 11px;
          color: var(--accent);
          text-decoration: none;
          padding: 0 8px;
        }

        .wDel {
          background: none;
          border: none;
          color: var(--ink-soft);
          font-size: 14px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: var(--r-sm);
          line-height: 1;
        }
        .wDel:hover { color: var(--alarm); background: var(--alarm-soft); }

        .wAdd {
          background: transparent;
          border: 1px solid var(--border-strong);
          border-radius: var(--r-sm);
          color: var(--ink-1);
          font-family: inherit;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 6px 11px;
          cursor: pointer;
          white-space: nowrap;
        }
        .wAdd:hover { border-color: var(--accent); color: var(--accent); }

        .wChip {
          display: inline-block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding: 3px 8px;
          border-radius: var(--r-pill);
          white-space: nowrap;
        }
        .wChip-ok   { background: var(--accent-soft); color: var(--accent); }
        .wChip-warn { background: var(--gold-soft);   color: var(--gold); }
        .wChip-bad  { background: var(--alarm-soft);  color: var(--alarm); }
        .wChip-mute { background: var(--bg-elev);     color: var(--ink-muted); }

        /* ── Forms ────────────────────────────────────────────── */
        .wForm {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
          padding: 16px;
        }
        .wForm label { display: flex; flex-direction: column; gap: 6px; }
        .wForm label span { font-size: 11px; color: var(--ink-1); line-height: 1.4; }
        .wForm input {
          height: 40px;
          border: 1px solid var(--border-strong);
          border-radius: var(--r-md);
          background: var(--bg-0);
          color: var(--ink-0);
          padding: 0 12px;
          font-family: inherit;
          font-size: 14px;
        }
        .wForm input:focus { outline: none; border-color: var(--accent); }

        .wBtnRow { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 16px 8px; }
        .wBtn {
          min-height: 38px;
          padding: 9px 15px;
          border: 1px solid var(--border-strong);
          border-radius: var(--r-md);
          background: var(--bg-surface);
          color: var(--ink-0);
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }
        .wBtn:hover { border-color: var(--accent); color: var(--accent); }
        .wBtnPrimary { background: var(--accent); border-color: var(--accent); color: #fff; }
        .wBtnPrimary:hover { background: var(--accent-deep); color: #fff; }
        .wBtnDanger { color: var(--alarm); border-color: var(--alarm); }
        .wBtnDanger:hover { background: var(--alarm-soft); color: var(--alarm); }

        /* ── Church steps ─────────────────────────────────────── */
        .wSteps { list-style: none; margin: 0; padding: 8px 16px 4px; }
        .wSteps li { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--grid-line); }
        .wSteps li:last-child { border-bottom: none; }
        .wStepNum {
          flex: 0 0 auto;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
          padding-top: 2px;
          font-variant-numeric: tabular-nums;
        }
        .wSteps strong { display: block; font-size: 13.5px; color: var(--ink-0); margin-bottom: 3px; }
        .wSteps p { margin: 0; font-size: 12.5px; color: var(--ink-1); line-height: 1.55; }

        /* ── Mobile tab bar ───────────────────────────────────── */
        .wTabs { display: none; }
        .wSheetOverlay { display: none; }

        @media (max-width: 840px) {
          .wWrap { padding: 16px 12px calc(78px + env(safe-area-inset-bottom)); }
          .wHead h1 { font-size: 19px; }
          .wHead p { font-size: 12.5px; }
          .wRail { display: none; }

          .wSectionTitle {
            display: block;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--ink-soft);
            padding: 4px 2px 12px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 16px;
          }

          .wStats { grid-template-columns: 1fr 1fr; gap: 10px; }
          .wStatValue { font-size: 18px; }

          /* 16px inputs stop iOS zooming the page on focus. */
          .wCellInput { font-size: 16px; min-width: 132px; }
          .wCellInput.wNum { min-width: 92px; }
          select.wCellInput { min-width: 96px; }
          .wForm { grid-template-columns: 1fr; }
          .wForm input { font-size: 16px; height: 44px; }

          .wTabs {
            display: flex;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 90;
            background: var(--bg-surface);
            border-top: 1px solid var(--border);
            padding-bottom: env(safe-area-inset-bottom);
            box-shadow: 0 -2px 14px rgba(0, 0, 0, 0.28);
          }
          .wTabs button {
            flex: 1 1 0;
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            background: none;
            border: none;
            border-top: 2px solid transparent;
            color: var(--ink-muted);
            font-family: inherit;
            font-size: 9.5px;
            letter-spacing: 0.06em;
            padding: 9px 4px 8px;
            cursor: pointer;
          }
          .wTabs button.active { color: var(--accent); border-top-color: var(--accent); }
          .wTabIcon { font-size: 17px; line-height: 1; }

          .wSheetOverlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 95;
            background: rgba(0, 0, 0, 0.55);
          }
          .wSheet {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--bg-surface);
            border-top: 1px solid var(--border);
            border-radius: 14px 14px 0 0;
            padding: 16px 12px calc(20px + env(safe-area-inset-bottom));
          }
          .wSheetTitle {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--ink-soft);
            padding: 0 4px 12px;
          }
          .wSheetGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .wSheetGrid button {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 7px;
            background: var(--bg-0);
            border: 1px solid var(--border);
            border-radius: var(--r-md);
            color: var(--ink-1);
            font-family: inherit;
            font-size: 11px;
            padding: 14px 4px;
            cursor: pointer;
          }
          .wSheetGrid button.active {
            border-color: var(--accent);
            background: var(--accent-soft);
            color: var(--accent);
          }
        }
      `}</style>
    </div>
  );
}
