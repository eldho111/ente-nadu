"use client";

/**
 * Wedding planner — audit log.
 *
 * Every mutation to the plan writes an entry here: who made the change,
 * when it happened, and (when the caller supplies one) a short human
 * description. Entries live alongside the plan itself in localStorage.
 *
 * This gives the family a running history of edits — useful when three
 * people are updating the guest list on their own phones and someone
 * asks "who added Uncle Thomas last week?". It's also a soft safety net
 * against accidental overwrites: even if the state gets nuked, the log
 * remembers what happened.
 *
 * Not synced across browsers. Each device keeps its own log of changes
 * made from that device. Export/import backs up the log too.
 */

const AUDIT_KEY = "enteNadu.wedding.audit";
const AUTHOR_KEY = "enteNadu.wedding.author";
const MAX_ENTRIES = 500;

export type AuditEntry = {
  id: number;
  ts: string;      // ISO timestamp
  who: string;
  action: string;  // short description ("Added guest", "Updated budget line", "Signed in")
  detail?: string; // optional longer note ("Uncle Thomas, +2 pax")
};

/** Read the current signed-in author name from localStorage. */
export function getAuthor(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(AUTHOR_KEY) || "";
  } catch {
    return "";
  }
}

export function setAuthor(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  try {
    if (trimmed) window.localStorage.setItem(AUTHOR_KEY, trimmed);
    else window.localStorage.removeItem(AUTHOR_KEY);
  } catch {
    /* storage blocked */
  }
}

export function clearAuthor(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTHOR_KEY);
  } catch {
    /* noop */
  }
}

export function readAudit(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AuditEntry[];
  } catch {
    return [];
  }
}

function writeAudit(entries: AuditEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const capped = entries.slice(-MAX_ENTRIES);
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(capped));
  } catch {
    /* quota exceeded — drop silently */
  }
}

let nextId = 0;
function allocId(): number {
  // Start from the highest id already present so we don't collide after
  // a page refresh reads back a prior log.
  if (nextId === 0) {
    const existing = readAudit();
    nextId = existing.reduce((m, e) => Math.max(m, e.id), 0) + 1;
  }
  return nextId++;
}

/** Append a new audit entry. Silently no-ops during SSR. */
export function logChange(action: string, detail?: string): AuditEntry | null {
  if (typeof window === "undefined") return null;
  const who = getAuthor() || "Unknown";
  const entry: AuditEntry = {
    id: allocId(),
    ts: new Date().toISOString(),
    who,
    action,
    detail: detail?.trim() || undefined,
  };
  const current = readAudit();
  writeAudit([...current, entry]);
  return entry;
}

export function clearAudit(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUDIT_KEY);
  } catch {
    /* noop */
  }
}

/** For the export/import flow — merge an imported log with the local one. */
export function mergeAudit(incoming: AuditEntry[]): void {
  const seen = new Set(readAudit().map((e) => `${e.ts}|${e.who}|${e.action}`));
  const additions = incoming.filter((e) => !seen.has(`${e.ts}|${e.who}|${e.action}`));
  if (additions.length === 0) return;
  const combined = [...readAudit(), ...additions].sort((a, b) => a.ts.localeCompare(b.ts));
  writeAudit(combined);
}
