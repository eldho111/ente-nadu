"use client";

/**
 * History section for the wedding planner.
 *
 * Renders the audit log — every change to the plan with who made it and
 * when. Also lets a signed-in user change their name (in case someone else
 * takes over from this browser) and, at the bottom, wipe the log if it
 * gets too noisy. Actual plan data is untouched by anything on this page.
 */

import { useEffect, useState } from "react";

import { clearAudit, getAuthor, readAudit, setAuthor, type AuditEntry } from "@/lib/wedding/audit";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function History() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [author, setAuthorLocal] = useState("");
  const [newName, setNewName] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setEntries(readAudit());
    setAuthorLocal(getAuthor());
  }, []);

  const refresh = () => setEntries(readAudit());

  const saveName = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAuthor(trimmed);
    setAuthorLocal(trimmed);
    setNewName("");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  const wipe = () => {
    if (!confirm("Clear the entire change log? Plan data is untouched.")) return;
    clearAudit();
    setEntries([]);
  };

  const grouped = entries.slice().reverse();

  return (
    <div className="wHistory">
      {/* ── Signed-in-as card ── */}
      <div className="wCard">
        <div className="wCardHead">
          <strong>Signed in as</strong>
          <span className="wMuted">{entries.length} logged changes</span>
        </div>
        <div className="wSignedRow">
          <div className="wSignedName">{author || "Unknown"}</div>
          <button type="button" className="wBtnGhost" onClick={refresh}>
            Refresh
          </button>
        </div>
        <div className="wRenameRow">
          <input
            type="text"
            placeholder="Change name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="Change name"
          />
          <button
            type="button"
            className="wBtn"
            onClick={saveName}
            disabled={!newName.trim()}
          >
            Save name
          </button>
        </div>
        {savedFlash ? <div className="wFlash">Saved — future changes will be signed with your new name.</div> : null}
      </div>

      {/* ── Audit log ── */}
      <div className="wCard">
        <div className="wCardHead">
          <strong>Change log</strong>
          <span className="wMuted">Most recent first</span>
        </div>
        {grouped.length === 0 ? (
          <div className="wEmpty">No changes recorded yet.</div>
        ) : (
          <ul className="wLog">
            {grouped.map((e) => (
              <li key={e.id} className="wLogRow">
                <div className="wLogWhen">{formatWhen(e.ts)}</div>
                <div className="wLogBody">
                  <div className="wLogAction">{e.action}</div>
                  <div className="wLogWho">{e.who}</div>
                  {e.detail ? <div className="wLogDetail">{e.detail}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Danger zone ── */}
      <div className="wCard">
        <div className="wCardHead">
          <strong>Danger zone</strong>
          <span className="wMuted">Log only — plan is safe</span>
        </div>
        <button type="button" className="wBtnDanger" onClick={wipe} disabled={entries.length === 0}>
          Clear change log
        </button>
        <p className="wDangerNote">
          This deletes the audit history on this device. The plan itself (guests, budget, vendors,
          runsheets, everything) is untouched.
        </p>
      </div>

      <style>{`
        .wHistory { display: grid; gap: 16px; }
        .wCard {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          padding: 16px;
          display: grid;
          gap: 12px;
        }
        .wCardHead {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
        }
        .wCardHead strong {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-0);
        }
        .wMuted {
          font-size: 11px;
          color: var(--ink-muted);
        }
        .wSignedRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-elev);
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
        }
        .wSignedName {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink-0);
        }
        .wRenameRow {
          display: flex;
          gap: 8px;
        }
        .wRenameRow input {
          flex: 1;
          min-height: 38px;
          border: 1px solid var(--border-strong);
          border-radius: var(--r-sm);
          padding: 0 10px;
          background: var(--bg-0);
          color: var(--ink-0);
          font-size: 13px;
        }
        .wRenameRow input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .wBtn, .wBtnGhost, .wBtnDanger {
          min-height: 36px;
          padding: 0 14px;
          border-radius: var(--r-sm);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
        }
        .wBtn {
          background: var(--accent);
          color: #fff;
          border: 1px solid var(--accent);
        }
        .wBtn:disabled { opacity: 0.5; cursor: not-allowed; }
        .wBtn:hover:not(:disabled) { background: var(--accent-deep); }
        .wBtnGhost {
          background: transparent;
          color: var(--ink-1);
          border: 1px solid var(--border-strong);
        }
        .wBtnGhost:hover { border-color: var(--accent); color: var(--accent); }
        .wBtnDanger {
          background: transparent;
          color: var(--alarm);
          border: 1px solid var(--alarm);
        }
        .wBtnDanger:disabled { opacity: 0.4; cursor: not-allowed; }
        .wBtnDanger:hover:not(:disabled) {
          background: var(--alarm);
          color: #fff;
        }
        .wFlash {
          font-size: 11px;
          color: var(--accent);
          background: var(--accent-soft);
          border: 1px solid var(--accent);
          border-radius: var(--r-sm);
          padding: 6px 10px;
        }
        .wEmpty {
          padding: 24px 12px;
          text-align: center;
          color: var(--ink-muted);
          font-size: 13px;
        }
        .wLog {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
          max-height: 560px;
          overflow-y: auto;
        }
        .wLogRow {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-0);
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
        }
        .wLogWhen {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--ink-muted);
          letter-spacing: 0.02em;
        }
        .wLogBody { display: grid; gap: 2px; }
        .wLogAction {
          font-size: 13px;
          font-weight: 500;
          color: var(--ink-0);
        }
        .wLogWho {
          font-size: 11px;
          color: var(--accent);
          font-weight: 600;
        }
        .wLogDetail {
          font-size: 11px;
          color: var(--ink-1);
          padding-top: 3px;
        }
        .wDangerNote {
          font-size: 11px;
          color: var(--ink-muted);
          margin: 4px 0 0;
          line-height: 1.5;
        }
        @media (max-width: 560px) {
          .wLogRow { grid-template-columns: 1fr; }
          .wLogWhen { padding-bottom: 4px; border-bottom: 1px solid var(--border); }
        }
      `}</style>
    </div>
  );
}
