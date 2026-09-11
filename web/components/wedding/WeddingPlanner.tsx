"use client";

/**
 * Wedding planner shell — section nav plus the shared stylesheet.
 *
 * Desktop gets a horizontal section rail; below 840px it collapses to a
 * fixed bottom tab bar (four primary sections plus a More sheet), which is
 * the pattern the rest of the /app routes use.
 */
import { useEffect, useMemo, useState } from "react";

import { getAuthor } from "@/lib/wedding/audit";
import { runEngine } from "@/lib/wedding/engine";
import { useWeddingStore } from "@/lib/wedding/store";

import History from "./History";
import { Budget, Dashboard, SettingsPanel } from "./SectionsMoney";
import { Contacts, Guests, Vendors } from "./SectionsPeople";
import { Church, Runsheets, Shopping, Tasks } from "./SectionsPlan";
import WeddingLanding, { type LandingId } from "./WeddingLanding";

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
  | "history"
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
  { id: "history", icon: "⌛", label: "History & Sign-in", short: "History" },
  { id: "settings", icon: "⚙", label: "Settings & Backup", short: "Settings" },
];

const PRIMARY: SectionId[] = ["dash", "budget", "guests", "tasks"];

export default function WeddingPlanner() {
  const { state, update, replace, reset, locked, unlock, save, cancel } = useWeddingStore();
  // "view" is the top-level: the tile grid (landing) or a specific section.
  // Users land on the grid, click a tile to descend, and can back out to
  // it any time. Every section reachable this way maps 1:1 to a LandingId.
  const [view, setView] = useState<"landing" | "section">("landing");
  const [section, setSection] = useState<SectionId>("dash");
  const [moreOpen, setMoreOpen] = useState(false);
  const [author, setAuthor] = useState("");

  const engine = useMemo(() => (state ? runEngine(state) : null), [state]);

  // Confirm before discarding buffered edits — clicking Cancel is the
  // one destructive action on this page and warrants an extra click.
  const askAndCancel = () => {
    if (!confirm("Discard the changes you just made and go back to the last saved state?")) return;
    cancel();
  };

  // Read the signed-in author name once mounted and re-read whenever we
  // switch to the History section (where the user can change it).
  useEffect(() => {
    setAuthor(getAuthor());
  }, [section]);

  // Keep the wedding pages on light theme regardless of the site-wide
  // toggle — this section is a family document, and it reads better bright.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const prior = html.getAttribute("data-theme");
    html.setAttribute("data-theme", "light");
    return () => {
      if (prior === null) html.removeAttribute("data-theme");
      else html.setAttribute("data-theme", prior);
    };
  }, []);

  const go = (id: SectionId) => {
    setSection(id);
    setView("section");
    setMoreOpen(false);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  const backToLanding = () => {
    setView("landing");
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
        <div className="wHeadActions">
          {author ? (
            <button
              type="button"
              className="wSignedChip"
              onClick={() => go("history")}
              title="View change history — click to open"
            >
              <span className="wSignedChipDot" aria-hidden="true" />
              <span>
                Signed in as <strong>{author}</strong>
              </span>
            </button>
          ) : null}
          {/* Edit / Save / Cancel — the single source of "am I in edit mode?"
              in the UI. All input interaction below is gated on `locked`. */}
          {locked ? (
            <button type="button" className="wEditBtn" onClick={unlock}>
              <span aria-hidden="true">✎</span> Edit
            </button>
          ) : (
            <div className="wEditActions" role="group" aria-label="Edit mode actions">
              <span className="wEditPill">Editing</span>
              <button type="button" className="wCancelBtn" onClick={askAndCancel}>
                Cancel
              </button>
              <button type="button" className="wSaveBtn" onClick={save}>
                Save
              </button>
            </div>
          )}
        </div>
      </header>

      {view === "landing" ? (
        <WeddingLanding
          engine={engine}
          contactsCount={state.contacts.length}
          shoppingBought={state.shopping.filter((s) => s.bought).length}
          shoppingTotal={state.shopping.length}
          vendorsBooked={state.vendors.filter((v) => v.status === "Booked").length}
          vendorsShortlisted={state.vendors.filter((v) => v.status === "Shortlisted").length}
          onOpen={(id) => go(id as SectionId)}
        />
      ) : null}

      {view === "section" ? (
        <>
          <div className="wSectionBar">
            <button
              type="button"
              className="wBackChip"
              onClick={backToLanding}
              aria-label="Back to sections"
            >
              <span aria-hidden="true">←</span> Sections
            </button>
            <div className="wSectionTitle">{active?.label}</div>
            <div aria-hidden="true" />
          </div>

          {/* aria-disabled guides screen readers around the disabled surface when
              locked; the pointer-events: none in CSS blocks mouse + touch.
              History (name / audit log) stays interactive when locked — those
              controls only touch the log, not the plan itself. Settings
              contains reset() and mutating fields, so it is lock-gated too. */}
          <main
            className={`wBody ${locked && section !== "history" ? "wLocked" : "wUnlocked"}`}
            aria-disabled={locked && section !== "history"}
          >
        {section === "dash" && <Dashboard state={state} engine={engine} />}
        {section === "budget" && <Budget state={state} engine={engine} update={update} />}
        {section === "guests" && <Guests state={state} engine={engine} update={update} />}
        {section === "tasks" && <Tasks state={state} engine={engine} update={update} />}
        {section === "vendors" && <Vendors state={state} engine={engine} update={update} />}
        {section === "contacts" && <Contacts state={state} update={update} />}
        {section === "runsheets" && <Runsheets state={state} update={update} />}
        {section === "shopping" && <Shopping state={state} update={update} />}
        {section === "church" && <Church />}
        {section === "history" && <History />}
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
        </>
      ) : null}

      {/* Mobile bottom bar — Home tile + four primary sections + More.
          Home takes the user back to the landing grid. */}
      <nav className="wTabs" aria-label="Planner sections (mobile)">
        <button
          type="button"
          className={view === "landing" ? "active" : ""}
          onClick={backToLanding}
          aria-label="Home — section tiles"
        >
          <span className="wTabIcon">◱</span>
          <span>Home</span>
        </button>
        {SECTIONS.filter((s) => PRIMARY.includes(s.id) && s.id !== "dash").map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === "section" && item.id === section ? "active" : ""}
            onClick={() => go(item.id)}
          >
            <span className="wTabIcon">{item.icon}</span>
            <span>{item.short}</span>
          </button>
        ))}
        <button
          type="button"
          className={view === "section" && !PRIMARY.includes(section) ? "active" : ""}
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
                  className={view === "section" && item.id === section ? "active" : ""}
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

        .wHead {
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .wHeadActions {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }
        /* ── Edit / Save / Cancel toolbar ────────────────────────────── */
        .wEditBtn, .wSaveBtn, .wCancelBtn {
          appearance: none;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding: 8px 16px;
          border-radius: 999px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .wEditBtn {
          background: var(--accent);
          color: #fff;
          border: 1px solid var(--accent);
        }
        .wEditBtn:hover { background: var(--accent-deep); border-color: var(--accent-deep); }
        .wEditActions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .wEditPill {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 5px 10px;
          border-radius: 999px;
          background: var(--gold-soft);
          color: var(--gold-deep, var(--gold));
          border: 1px solid var(--gold);
          margin-right: 4px;
        }
        .wSaveBtn {
          background: var(--accent);
          color: #fff;
          border: 1px solid var(--accent);
        }
        .wSaveBtn:hover { background: var(--accent-deep); }
        .wCancelBtn {
          background: transparent;
          color: var(--ink-1);
          border: 1px solid var(--border-strong);
        }
        .wCancelBtn:hover {
          border-color: var(--alarm);
          color: var(--alarm);
        }
        /* ── Locked body — fields visibly fixed, no interaction ─────── */
        .wLocked {
          position: relative;
        }
        .wLocked > * {
          pointer-events: none;
          user-select: text;   /* still let the user select+copy fixed values */
        }
        .wLocked input,
        .wLocked textarea,
        .wLocked select,
        .wLocked button {
          background: var(--bg-elev) !important;
          color: var(--ink-1) !important;
          border-color: var(--border) !important;
          cursor: default !important;
        }
        .wLocked input:disabled,
        .wLocked textarea:disabled,
        .wLocked select:disabled { opacity: 1; }
        .wLocked button {
          opacity: 0.55;
        }
        .wUnlocked { /* editing — no visual change; the "Editing" pill in the header conveys mode */ }
        .wSignedChip {
          appearance: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 11px;
          color: var(--ink-1);
          cursor: pointer;
          font-family: inherit;
          letter-spacing: 0.02em;
          white-space: nowrap;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .wSignedChip:hover { border-color: var(--accent); color: var(--accent); }
        .wSignedChip strong { color: var(--ink-0); font-weight: 600; }
        .wSignedChip:hover strong { color: var(--accent); }
        .wSignedChipDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
        }
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

        /* Old desktop rail retired in favour of the tile landing.
           Kept the .wSectionTitle rule below because the mobile media
           query still uses it as the sole section-name affordance. */

        /* Bar shown above every section: Back-to-tiles chip + section title. */
        .wSectionBar {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 18px;
        }
        .wBackChip {
          appearance: none;
          background: transparent;
          border: 1px solid var(--border-strong);
          color: var(--ink-1);
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding: 6px 12px;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: color 0.15s ease, border-color 0.15s ease;
        }
        .wBackChip:hover { color: var(--accent); border-color: var(--accent); }
        .wSectionTitle {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--ink-0);
          text-align: center;
        }

        /* ── Alerts ───────────────────────────────────────────── */
        /* ── Countdown cards ─────────────────────────────────────
           Two large event countdown blocks — engagement (gold) and
           wedding (sage). Live tick down to the day, hour, minute,
           second. Sit above the alerts on the dashboard. */
        .wCountdowns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }
        .wCd {
          border-radius: 18px;
          padding: 18px 20px 16px;
          display: grid;
          gap: 12px;
          border: 1px solid transparent;
          position: relative;
          overflow: hidden;
        }
        .wCd-sage {
          background: linear-gradient(135deg, rgba(62, 104, 92, 0.14), rgba(255, 255, 255, 0.65));
          border-color: rgba(62, 104, 92, 0.28);
        }
        .wCd-gold {
          background: linear-gradient(135deg, rgba(138, 106, 56, 0.18), rgba(255, 255, 255, 0.65));
          border-color: rgba(138, 106, 56, 0.32);
        }
        .wCdLabel {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .wCd-sage .wCdLabel { color: var(--accent-deep, var(--accent)); }
        .wCd-gold .wCdLabel { color: var(--gold-deep, var(--gold)); }
        .wCdGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .wCdCell {
          text-align: center;
          padding: 8px 4px 6px;
          background: rgba(255, 255, 255, 0.55);
          border-radius: 12px;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
        }
        .wCdNum {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink-0);
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .wCdUnit {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: var(--ink-muted);
          text-transform: uppercase;
          margin-top: 4px;
        }
        .wCdDate {
          font-size: 12px;
          color: var(--ink-1);
        }
        .wCdEmpty {
          font-size: 12px;
          color: var(--ink-muted);
          font-style: italic;
        }
        .wCdPast {
          font-size: 22px;
          font-weight: 600;
          color: var(--ink-0);
          letter-spacing: -0.01em;
        }
        @media (max-width: 700px) {
          .wCountdowns { grid-template-columns: 1fr; }
          .wCdNum { font-size: 22px; }
        }

        /* ── Weather card ─────────────────────────────────────────
           Venue forecast (Kodencherry). Glass card style matching the
           countdowns. When far out from the wedding, shows a Kerala
           season hint instead of a specific forecast. */
        .wWeather {
          border-radius: 18px;
          padding: 18px 20px 16px;
          margin-bottom: 18px;
          background: linear-gradient(135deg, rgba(76, 119, 132, 0.14), rgba(255, 255, 255, 0.68));
          border: 1px solid rgba(76, 119, 132, 0.28);
          display: grid;
          gap: 14px;
        }
        .wWeatherHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .wWeatherRegion { font-size: 11px; color: var(--ink-muted); }
        .wWeatherMain {
          display: grid;
          grid-template-columns: 72px 1fr;
          align-items: center;
          gap: 14px;
        }
        .wWeatherIcon {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 42px;
          background: rgba(255, 255, 255, 0.7);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 4px 10px rgba(15, 23, 42, 0.06);
          line-height: 1;
        }
        .wTone-sun    { background: linear-gradient(135deg, #ffe4a1, #ffb84a); }
        .wTone-cloud  { background: linear-gradient(135deg, #e2e8f0, #b4bfd0); }
        .wTone-rain   { background: linear-gradient(135deg, #a9c9e6, #4c7784); }
        .wTone-storm  { background: linear-gradient(135deg, #6d7cad, #34395c); color: #fff; }
        .wTone-fog    { background: linear-gradient(135deg, #edeff2, #c2c8d2); }
        .wWeatherHeadline {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink-0);
          margin-bottom: 4px;
        }
        .wWeatherTemps {
          font-size: 26px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--ink-0);
          letter-spacing: -0.02em;
          display: inline-flex;
          gap: 6px;
          align-items: baseline;
        }
        .wWeatherHigh { color: var(--alarm); }
        .wWeatherLow { color: var(--accent); font-size: 18px; }
        .wWeatherSep { color: var(--ink-muted); font-weight: 400; }
        .wWeatherStats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .wWeatherStats > div {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 12px;
          padding: 8px 10px;
          display: grid;
          gap: 3px;
        }
        .wWeatherStatLabel {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: var(--ink-muted);
          text-transform: uppercase;
        }
        .wWeatherStatValue {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink-0);
          font-variant-numeric: tabular-nums;
        }
        .wWeatherAdvice {
          font-size: 12.5px;
          padding: 8px 12px;
          border-radius: 10px;
          line-height: 1.5;
        }
        .wWeatherAdvice-ok   { background: rgba(62, 104, 92, 0.14); color: var(--accent-deep, var(--accent)); }
        .wWeatherAdvice-warn { background: rgba(138, 106, 56, 0.16); color: var(--gold-deep, var(--gold)); }
        .wWeatherAdvice-rain { background: rgba(176, 66, 80, 0.14); color: var(--alarm); font-weight: 500; }
        .wWeatherMuted { font-size: 12.5px; color: var(--ink-muted); font-style: italic; }
        .wWeatherSeason { display: grid; gap: 6px; }
        .wWeatherSeasonHead {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink-0);
        }
        .wWeatherSeasonNote { font-size: 12.5px; color: var(--ink-1); line-height: 1.55; }
        .wWeatherFineprint { font-size: 11px; color: var(--ink-muted); margin-top: 2px; }
        @media (max-width: 560px) {
          .wWeatherMain { grid-template-columns: 60px 1fr; }
          .wWeatherIcon { width: 60px; height: 60px; font-size: 34px; }
          .wWeatherStats { grid-template-columns: 1fr 1fr 1fr; }
        }

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
        /* ── Phone-with-call cell ─────────────────────────────────
           Input + tap-to-call round button, laid out inline. The call
           button stays interactive even when the section is locked
           thanks to pointer-events:auto inline on the anchor. */
        .wPhoneCell {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .wPhoneCell .wCellInput { min-width: 132px; }
        .wCallBtn {
          display: inline-grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: var(--accent);
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          line-height: 1;
          flex-shrink: 0;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .wCallBtn:hover { background: var(--accent-deep, var(--accent)); transform: scale(1.05); }
        .wCallBtn:active { transform: scale(0.95); }
        .wCallBtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        /* Locked-section overrides applied to inputs would grey the call
           button too. Keep it saturated so it reads as actionable even
           when the surrounding row is muted. */
        .wLocked .wCallBtn {
          background: var(--accent) !important;
          color: #fff !important;
          opacity: 1 !important;
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
          .wHead { flex-direction: column; align-items: stretch; gap: 10px; }
          .wHeadActions {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
          .wHead h1 { font-size: 19px; }
          .wHead p { font-size: 12.5px; }
          .wRail { display: none; }
          /* Section bar shrinks to just the title on mobile — the bottom Home tab
             gives users a quicker way back to the landing than a back chip up top. */
          .wSectionBar {
            grid-template-columns: 1fr;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .wBackChip { display: none; }
          .wSectionTitle {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--ink-soft);
            text-align: left;
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
