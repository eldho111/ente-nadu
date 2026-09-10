/**
 * Wedding planner — rules engine.
 *
 * A pure function over WeddingState. Deterministic: it derives totals and
 * raises alerts from fixed rules. It does not learn or adapt — every alert
 * below is a rule written by hand, so any surprise in the output is a
 * surprise in the data, not in the model.
 */
import { SEGMENTS } from "./types";
import type { EngineAlert, EngineResult, Segment, WeddingState } from "./types";

/** Indian-format currency, no decimals: 1171500 → "₹11,71,500". */
export function formatINR(value: number): string {
  const n = Math.round(Number.isFinite(value) ? value : 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Key vendor categories that must be locked in as the date approaches. */
const KEY_CATEGORIES = ["Auditorium", "Caterer", "Photographer / Video"];

/** Contingency buffer applied to the sum of all segments. */
const CONTINGENCY_RATE = 0.05;

/** Days out at which unbooked key vendors escalate to a hard alert. */
const BOOKING_PANIC_DAYS = 90;

/**
 * Parse a date-only string ("2026-10-10") as LOCAL midnight.
 *
 * `new Date("2026-10-10")` is parsed as UTC midnight, while a Date built from
 * "now" is local. Comparing the two silently shifts the countdown by a day in
 * any timezone ahead of UTC — India (+05:30) included, which is the entire
 * audience here. Building the date part-wise keeps both sides local.
 */
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function emptyTotals(): Record<Segment, number> {
  return {
    Engagement: 0,
    "Madhuram Veppu": 0,
    Wedding: 0,
    "Attire & Jewellery": 0,
  };
}

export function runEngine(state: WeddingState, now: Date = new Date()): EngineResult {
  const { settings } = state;

  // ── Money ────────────────────────────────────────────────────────────
  // Reception catering is derived, not a stored line: plates × rate. This
  // keeps the single biggest cost tied to the guest count.
  const cateringEst =
    (Number(settings.plannedPlates) || 0) * (Number(settings.cateringRate) || 0);

  const sub = emptyTotals();
  const subActual = emptyTotals();
  const subAdvance = emptyTotals();

  for (const line of state.budget) {
    sub[line.segment] += Number(line.est) || 0;
    subActual[line.segment] += Number(line.actual) || 0;
    subAdvance[line.segment] += Number(line.advance) || 0;
  }
  sub.Wedding += cateringEst;

  const base = SEGMENTS.reduce((total, seg) => total + sub[seg], 0);
  const contingency = Math.round((base * CONTINGENCY_RATE) / 1000) * 1000;
  const planned = base + contingency;
  const spent = SEGMENTS.reduce((total, seg) => total + subActual[seg], 0);
  const advance = SEGMENTS.reduce((total, seg) => total + subAdvance[seg], 0);
  const funds = state.funding.reduce((total, f) => total + (Number(f.amount) || 0), 0);

  // ── Guests ───────────────────────────────────────────────────────────
  const guests = { entries: 0, pax: 0, eng: 0, madh: 0, wed: 0, confirmed: 0, invited: 0 };
  for (const g of state.guests) {
    const pax = Number(g.pax) || 0;
    guests.entries += 1;
    guests.pax += pax;
    if (g.eng) guests.eng += pax;
    if (g.madh) guests.madh += pax;
    if (g.wed) guests.wed += pax;
    if (g.rsvp === "Yes") guests.confirmed += pax;
    if (g.invited) guests.invited += pax;
  }

  // ── Time ─────────────────────────────────────────────────────────────
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tasksDone = state.tasks.filter((t) => t.done).length;
  const overdue = state.tasks.filter((t) => {
    if (t.done || t.due === "") return false;
    const due = parseLocalDate(t.due);
    return due !== null && due.getTime() < today.getTime();
  });

  const weddingDay = settings.weddingDate ? parseLocalDate(settings.weddingDate) : null;
  const daysTo = weddingDay
    ? Math.round((weddingDay.getTime() - today.getTime()) / 86_400_000)
    : null;

  const bookedCategories = new Set(
    state.vendors.filter((v) => v.status === "Booked").map((v) => v.category),
  );

  // ── Rules ────────────────────────────────────────────────────────────
  const alerts: EngineAlert[] = [];
  const push = (level: EngineAlert["level"], message: string) => alerts.push({ level, message });

  if (!settings.weddingDate) {
    push("info", "Set the wedding date in Settings — the countdown, overdue tracking and booking rules switch on once it's set.");
  }

  if (planned > settings.budgetTarget) {
    push(
      "bad",
      `Planned budget ${formatINR(planned)} exceeds the target ${formatINR(settings.budgetTarget)} by ${formatINR(planned - settings.budgetTarget)}. The levers are guest count, per-plate rate, or agreeing a cost split with the bride's family.`,
    );
  } else {
    push(
      "ok",
      `Planned budget ${formatINR(planned)} is within the target ${formatINR(settings.budgetTarget)} — headroom ${formatINR(settings.budgetTarget - planned)}.`,
    );
  }

  if (funds < planned) {
    push(
      "warn",
      `Funding shortfall: sources total ${formatINR(funds)} against a plan of ${formatINR(planned)} — a gap of ${formatINR(planned - funds)}.`,
    );
  }

  if (guests.wed > (Number(settings.plannedPlates) || 0)) {
    push(
      "warn",
      `The wedding list (${guests.wed} pax) is above the plates planned (${settings.plannedPlates}). Raise the plate count in Settings or trim the list.`,
    );
  }

  if ((Number(settings.plannedPlates) || 0) > guests.wed * 1.3 && guests.wed > 100) {
    const over = Math.round((settings.plannedPlates / guests.wed) * 100 - 100);
    push(
      "info",
      `Plates planned (${settings.plannedPlates}) run ${over}% above the current wedding list (${guests.wed} pax). Fine while the list is still growing — tighten it before the caterer's final-count date.`,
    );
  }

  if (overdue.length > 0) {
    const names = overdue.slice(0, 3).map((t) => t.task).join("; ");
    push("bad", `${overdue.length} task${overdue.length > 1 ? "s" : ""} overdue: ${names}${overdue.length > 3 ? "…" : ""}`);
  }

  if (daysTo !== null && daysTo <= BOOKING_PANIC_DAYS) {
    for (const category of KEY_CATEGORIES) {
      if (!bookedCategories.has(category)) {
        push("bad", `${daysTo} days to go and no ${category} booked — this is a must-book-now item.`);
      }
    }
  }

  for (const line of state.budget) {
    const lineActual = Number(line.actual) || 0;
    const lineAdvance = Number(line.advance) || 0;
    if (lineAdvance > lineActual && lineActual > 0) {
      push(
        "warn",
        `Budget line "${line.item}": advance paid (${formatINR(lineAdvance)}) is more than the actual cost entered (${formatINR(lineActual)}) — worth checking.`,
      );
    }
  }

  if (
    guests.invited > 0 &&
    guests.confirmed / Math.max(guests.pax, 1) < 0.3 &&
    daysTo !== null &&
    daysTo < 30
  ) {
    push(
      "warn",
      `Only ${guests.confirmed} of ${guests.pax} pax have confirmed with ${daysTo} days left — start the confirmation calls; the caterer's count depends on it.`,
    );
  }

  return {
    cateringEst,
    sub,
    subActual,
    subAdvance,
    contingency,
    planned,
    spent,
    advance,
    funds,
    guests,
    tasksDone,
    overdue,
    daysTo,
    bookedCategories,
    keyCategories: KEY_CATEGORIES,
    alerts,
  };
}
