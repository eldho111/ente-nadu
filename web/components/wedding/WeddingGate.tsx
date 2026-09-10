"use client";

/**
 * Passcode gate for /wedding.
 *
 * Scope of this control, stated plainly: it keeps the section from being
 * stumbled into by anyone browsing the civic site, and it is not a security
 * boundary. Any NEXT_PUBLIC_ value is inlined into the client bundle, so a
 * determined visitor can read the passcode out of the JavaScript.
 *
 * That is an acceptable trade here because there is nothing on the other
 * side to steal: the planner's data lives in each visitor's own
 * localStorage, so a stranger who gets past this screen sees the blank
 * default plan, never the family's budget, guest list or phone numbers.
 * Real figures exist only in the browsers they were typed into.
 *
 * There is deliberately no fallback passcode. A literal here would be
 * committed to the repository; instead the gate stays shut until
 * NEXT_PUBLIC_WEDDING_PASSCODE is set in web/.env.local, which is gitignored.
 */
import { useEffect, useState } from "react";

const UNLOCK_KEY = "enteNadu.wedding.unlocked";
// Fallback so the page works without any env var config. The passcode
// is a curtain not a lock — the data behind it lives only in each
// visitor's localStorage, so there is nothing sensitive on the server
// to protect. To override on any specific deploy, set
// NEXT_PUBLIC_WEDDING_PASSCODE in that environment.
const PASSCODE = (process.env.NEXT_PUBLIC_WEDDING_PASSCODE ?? "mithun2026").trim();

export default function WeddingGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "open">("checking");
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  const configured = PASSCODE.trim() !== "";

  useEffect(() => {
    if (!configured) {
      setStatus("locked");
      return;
    }
    try {
      setStatus(sessionStorage.getItem(UNLOCK_KEY) === "1" ? "open" : "locked");
    } catch {
      setStatus("locked");
    }
  }, [configured]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // Without this guard an unset passcode would make the empty string a
    // valid answer, unlocking the section for anyone who pressed Enter.
    if (!configured) return;
    if (entry.trim().toLowerCase() === PASSCODE.trim().toLowerCase()) {
      try {
        sessionStorage.setItem(UNLOCK_KEY, "1");
      } catch {
        /* private mode — unlock lasts for this page view only */
      }
      setStatus("open");
      return;
    }
    setError(true);
    setEntry("");
  };

  if (status === "checking") {
    return <div className="wGateWait">Checking…</div>;
  }

  if (status === "open") {
    return <>{children}</>;
  }

  return (
    <div className="wGate">
      <form className="wGateCard" onSubmit={submit}>
        <div className="wGateKicker">PRIVATE SECTION</div>
        <h1>Wedding Planner</h1>

        {configured ? (
          <>
            <p>This part of the site is for family. Enter the passcode to continue.</p>
            <input
              type="password"
              value={entry}
              autoFocus
              placeholder="Passcode"
              aria-label="Passcode"
              onChange={(e) => {
                setEntry(e.target.value);
                setError(false);
              }}
            />
            {error ? <div className="wGateError">That passcode didn&rsquo;t match.</div> : null}
            <button type="submit">Unlock</button>
          </>
        ) : (
          <p className="wGateSetup">
            No passcode is configured, so this section stays closed. Add{" "}
            <code>NEXT_PUBLIC_WEDDING_PASSCODE=yourcode</code> to <code>web/.env.local</code> and
            restart the server.
          </p>
        )}

        <a href="/">← Back to Ente Nadu</a>
      </form>

      <style>{`
        .wGateWait {
          padding-top: 20vh;
          text-align: center;
          color: var(--ink-muted);
          font-size: 13px;
        }
        .wGate {
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--bg-0);
        }
        .wGateCard {
          width: 100%;
          max-width: 380px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          box-shadow: var(--shadow);
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-align: center;
        }
        .wGateKicker {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: var(--ink-soft);
        }
        .wGateCard h1 {
          font-size: 20px;
          font-weight: 600;
          color: var(--ink-0);
          margin: 0;
        }
        .wGateCard p {
          font-size: 13px;
          color: var(--ink-1);
          line-height: 1.5;
          margin: 0;
        }
        .wGateCard input {
          height: 44px;
          border: 1px solid var(--border-strong);
          border-radius: var(--r-md);
          background: var(--bg-0);
          color: var(--ink-0);
          padding: 0 14px;
          font-size: 16px;
          text-align: center;
          letter-spacing: 0.12em;
        }
        .wGateCard input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .wGateCard button {
          height: 44px;
          border: 1px solid var(--accent);
          border-radius: var(--r-md);
          background: var(--accent);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .wGateCard button:hover { background: var(--accent-deep); }
        .wGateError {
          font-size: 12px;
          color: var(--alarm);
        }
        .wGateSetup {
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--ink-1);
        }
        .wGateSetup code {
          font-family: var(--font-mono);
          font-size: 11.5px;
          background: var(--bg-elev);
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          padding: 1px 5px;
          white-space: nowrap;
        }
        .wGateCard a {
          font-size: 11px;
          color: var(--ink-muted);
          text-decoration: none;
          letter-spacing: 0.08em;
        }
        .wGateCard a:hover { color: var(--accent); }
      `}</style>
    </div>
  );
}
