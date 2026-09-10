/**
 * Wedding planner — domain types.
 *
 * A private, passcode-gated planning tool living at /wedding. Entirely
 * client-side: nothing is written to the Ente Nadu API or database. State
 * persists in localStorage on the viewer's own device, with JSON
 * export/import for backup and sharing.
 */

/** The four budget segments. Every budget line belongs to exactly one. */
export const SEGMENTS = [
  "Engagement",
  "Madhuram Veppu",
  "Wedding",
  "Attire & Jewellery",
] as const;

export type Segment = (typeof SEGMENTS)[number];

export type BudgetLine = {
  id: number;
  segment: Segment;
  item: string;
  est: number;
  actual: number;
  advance: number;
  paidTo: string;
};

export type FundingSource = {
  id: number;
  source: string;
  amount: number;
};

export type Rsvp = "?" | "Yes" | "No";
export type Side = "Groom" | "Bride" | "Both";

export type Guest = {
  id: number;
  name: string;
  group: string;
  side: Side;
  pax: number;
  eng: boolean;
  madh: boolean;
  wed: boolean;
  invited: boolean;
  rsvp: Rsvp;
};

export const VENDOR_STATUSES = [
  "To contact",
  "Shortlisted",
  "Booked",
  "Rejected",
] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export type Vendor = {
  id: number;
  category: string;
  name: string;
  phone: string;
  quote: number;
  notes: string;
  status: VendorStatus;
};

export type PlanTask = {
  id: number;
  phase: string;
  task: string;
  owner: string;
  due: string;
  done: boolean;
};

export type Contact = {
  id: number;
  role: string;
  name: string;
  phone: string;
  notes: string;
};

export type RunItem = {
  id: number;
  time: string;
  activity: string;
  resp: string;
};

export type RunsheetKey = "eng" | "madh" | "wed";

export type ShoppingItem = {
  id: number;
  item: string;
  event: string;
  est: number;
  bought: boolean;
  notes: string;
};

export type Settings = {
  weddingDate: string;
  engagementDate: string;
  budgetTarget: number;
  cateringRate: number;
  plannedPlates: number;
  groomName: string;
  brideName: string;
};

export type WeddingState = {
  settings: Settings;
  funding: FundingSource[];
  budget: BudgetLine[];
  guests: Guest[];
  vendors: Vendor[];
  tasks: PlanTask[];
  contacts: Contact[];
  runsheets: Record<RunsheetKey, RunItem[]>;
  shopping: ShoppingItem[];
};

/** Shape written to localStorage and to exported .json backups. */
export type WeddingSave = {
  _uid: number;
  state: WeddingState;
};

export type AlertLevel = "bad" | "warn" | "info" | "ok";
export type EngineAlert = { level: AlertLevel; message: string };

export type EngineResult = {
  cateringEst: number;
  sub: Record<Segment, number>;
  subActual: Record<Segment, number>;
  subAdvance: Record<Segment, number>;
  contingency: number;
  planned: number;
  spent: number;
  advance: number;
  funds: number;
  guests: {
    entries: number;
    pax: number;
    eng: number;
    madh: number;
    wed: number;
    confirmed: number;
    invited: number;
  };
  tasksDone: number;
  overdue: PlanTask[];
  daysTo: number | null;
  bookedCategories: Set<string>;
  keyCategories: string[];
  alerts: EngineAlert[];
};
