/**
 * Wedding planner — default plan.
 *
 * Seeded for a Malankara / Jacobite Syrian Orthodox wedding in Kerala:
 * engagement, madhuram veppu at home the night before, then Holy Qurbana
 * with the marriage service and a reception lunch.
 *
 * Cost figures are typical 2026 Kerala market ranges, meant to be replaced
 * with real quotes as they come in.
 *
 * Nothing here is anybody's actual plan. This file is committed to a public
 * repository, so the defaults are deliberately impersonal: no real names, no
 * funding amounts. Names, contributions and real costs are typed in by
 * whoever is using the planner and stay in their own browser's localStorage,
 * which is never committed and never sent to the server.
 */
import type { RunItem, Segment, WeddingState } from "./types";

/** Monotonic id source. Reset by the store when a backup is imported. */
let counter = 1;
export const nextId = (): number => counter++;
export const setCounter = (value: number): void => {
  counter = Number.isFinite(value) && value > 0 ? value : 1;
};
export const getCounter = (): number => counter;

const budgetLine = (segment: Segment, item: string, est: number) => ({
  id: nextId(),
  segment,
  item,
  est,
  actual: 0,
  advance: 0,
  paidTo: "",
});

const task = (phase: string, taskText: string, owner: string) => ({
  id: nextId(),
  phase,
  task: taskText,
  owner,
  due: "",
  done: false,
});

const vendor = (category: string) =>
  ({ id: nextId(), category, name: "", phone: "", quote: 0, notes: "", status: "To contact" }) as const;

const contact = (role: string) => ({ id: nextId(), role, name: "", phone: "", notes: "" });

const shop = (item: string, event: string, est: number, notes: string) => ({
  id: nextId(),
  item,
  event,
  est,
  bought: false,
  notes,
});

const run = (time: string, activity: string, resp: string): RunItem => ({
  id: nextId(),
  time,
  activity,
  resp,
});

export function seedState(): WeddingState {
  setCounter(1);
  return {
    settings: {
      weddingDate: "",
      engagementDate: "",
      budgetTarget: 1_000_000,
      cateringRate: 400,
      plannedPlates: 1000,
      groomName: "Groom",
      brideName: "",
    },

    // Labels only — fill the amounts in yourself; they stay in this browser.
    funding: [
      { id: nextId(), source: "Parents' contribution", amount: 0 },
      { id: nextId(), source: "Groom's savings", amount: 0 },
      { id: nextId(), source: "Chitty / other", amount: 0 },
    ],

    budget: [
      budgetLine("Engagement", "Venue / parish hall", 25_000),
      budgetLine("Engagement", "Catering (200 guests × ₹350)", 70_000),
      budgetLine("Engagement", "Engagement rings (pair)", 45_000),
      budgetLine("Engagement", "Decor & stage", 15_000),
      budgetLine("Engagement", "Photography", 20_000),
      budgetLine("Engagement", "Outfits & misc", 15_000),

      budgetLine("Madhuram Veppu", "Pandal / canopy, chairs, tables", 30_000),
      budgetLine("Madhuram Veppu", "Food & snacks (150 × ₹250)", 37_500),
      budgetLine("Madhuram Veppu", "Mehendi artist", 8_000),
      budgetLine("Madhuram Veppu", "Sound, lights & DJ", 15_000),
      budgetLine("Madhuram Veppu", "Sweets & madhuram items", 5_000),
      budgetLine("Madhuram Veppu", "Home decor", 10_000),

      budgetLine("Wedding", "Auditorium rent + cleaning + power backup", 120_000),
      budgetLine("Wedding", "Church offering, choir & altar", 15_000),
      budgetLine("Wedding", "Decor: church + auditorium stage", 50_000),
      budgetLine("Wedding", "Photography + videography package", 80_000),
      budgetLine("Wedding", "Wedding cars + decoration", 15_000),
      budgetLine("Wedding", "Sound system at auditorium", 10_000),
      budgetLine("Wedding", "Invitations: print + distribution", 15_000),

      budgetLine("Attire & Jewellery", "Wedding rings (pair)", 40_000),
      budgetLine("Attire & Jewellery", "Minnu + gold chain", 25_000),
      budgetLine("Attire & Jewellery", "Manthrakodi saree", 15_000),
      budgetLine("Attire & Jewellery", "Groom's suit & outfits", 25_000),
      budgetLine("Attire & Jewellery", "Gifts (priest, best man, helpers)", 10_000),
    ],

    guests: [
      {
        id: nextId(),
        name: "Varghese Uncle & family (example)",
        group: "Father's relatives",
        side: "Groom",
        pax: 4,
        eng: true,
        madh: true,
        wed: true,
        invited: true,
        rsvp: "Yes",
      },
    ],

    vendors: [
      vendor("Auditorium"),
      vendor("Caterer"),
      vendor("Photographer / Video"),
      vendor("Decor & stage"),
      vendor("Makeup artist (bride)"),
      vendor("Mehendi artist"),
      vendor("Sound / DJ / lights"),
      vendor("Wedding cars"),
      vendor("Pandal & chairs (home)"),
      vendor("Generator backup"),
      vendor("Invitation printer"),
      vendor("Jeweller (rings / minnu)"),
    ],

    tasks: [
      task("Month 1 (now)", "Joint family meeting: agree budget, cost split between families, guest count ceiling", "Both families"),
      task("Month 1 (now)", "Meet vicar, fix wedding & engagement dates; confirm church availability", "Groom + parents"),
      task("Month 1 (now)", "Book wedding auditorium (weekend & season dates go fast)", "Family"),
      task("Month 1 (now)", "Set budget target & funding plan in Settings; start tracking here", "Groom"),
      task("Month 1 (now)", "Enrol couple in pre-marriage counselling course (certificate valid 6 months)", "Couple"),
      task("Month 1 (now)", "Collect baptism & confirmation certificates, ID / age proof from both sides", "Both families"),
      task("Month 1 (now)", "Draft guest list v1 with both families (drives catering cost)", "Both families"),

      task("Month 2", "Shortlist & book caterer — taste test; negotiate per-plate rate", "Family"),
      task("Month 2", "Book photographer + videographer (compare 3 quotes)", "Groom"),
      task("Month 2", "Book decor / stage vendor for church, auditorium & engagement", "Family"),
      task("Month 2", "Book engagement venue (parish hall) & engagement catering", "Family"),
      task("Month 2", "Order wedding rings, minnu + chain; buy manthrakodi saree", "Groom + parents"),
      task("Month 2", "Submit kalyana kuri (banns application) — signatures of couple, parents, both vicars", "Couple"),
      task("Month 2", "Book makeup artist and mehendi artist", "Both families"),

      task("Month 3", "Design & print invitations (physical + WhatsApp e-invite)", "Groom"),
      task("Month 3", "Groom's suit stitched; engagement outfits ready", "Groom"),
      task("Month 3", "Book wedding cars & couple's car decoration", "Family"),
      task("Month 3", "Book sound, lighting & generator for madhuram night and auditorium", "Family"),
      task("Month 3", "Arrange choir / altar assistants; confirm Qurbana timing with church", "Parents"),
      task("Month 3", "Choose best man, bridesmaids, page boy / flower girl", "Couple"),

      task("Month 4", "Distribute invitations — personal visits for elders & close relatives", "Both families"),
      task("Month 4", "Banns read in both parishes on 3 consecutive Sundays", "Vicars"),
      task("Month 4", "Book rooms for outstation guests; plan pickup transport", "Family"),
      task("Month 4", "Finalise menu with caterer; agree final headcount date", "Family"),
      task("Month 4", "Plan madhuram night programme: mehendi, music, dance items", "Cousins / friends"),

      task("Final 2 weeks", "Confirm every vendor in writing; check advances vs balances (Budget)", "Groom"),
      task("Final 2 weeks", "Give final guest count to caterer; reconfirm auditorium & power backup", "Family"),
      task("Final 2 weeks", "Home prep for madhuram veppu: pandal, chairs, lighting, parking, neighbours", "Family"),
      task("Final 2 weeks", "Church rehearsal with best man & bridesmaids", "Couple"),
      task("Final 2 weeks", "Assign coordinators: food, stage, transport, guest reception, gifts", "Parents"),
      task("Final 2 weeks", "Emergency kit: pins, medicines, snacks, cash, chargers, document copies", "Best man"),

      task("After the wedding", "Settle vendor balances; collect all receipts", "Groom"),
      task("After the wedding", "Collect church marriage certificate; civil registration at registrar", "Couple"),
      task("After the wedding", "Return rentals; thank-you messages to guests & helpers", "Family"),
      task("After the wedding", "Collect photos / video; close budget — Actual vs Estimated", "Groom"),
    ],

    contacts: [
      contact("Vicar (groom's parish)"),
      contact("Vicar (bride's parish)"),
      contact("Parish office / secretary"),
      contact("Best man"),
      contact("Bridesmaid (via bride)"),
      contact("Food coordinator"),
      contact("Stage & decor coordinator"),
      contact("Transport coordinator"),
      contact("Guest reception coordinator"),
      contact("Gifts & valuables in-charge"),
      contact("Caterer contact"),
      contact("Photographer"),
      contact("Decorator"),
      contact("Auditorium manager"),
      contact("Sound / DJ"),
      contact("Driver (couple's car)"),
      contact("Electrician (madhuram night)"),
      contact("Neighbour help (home event)"),
    ],

    runsheets: {
      eng: [
        run("09:00", "Family & groom get ready; rings and documents packed", "Best man"),
        run("10:30", "Travel to bride's parish / venue", "Transport coord."),
        run("11:00", "Prayer & betrothal service; exchange of rings; date announcement", "Vicar"),
        run("12:00", "Photos with both families", "Photographer"),
        run("12:30", "Tea / lunch for guests", "Food coord."),
        run("14:00", "Family introductions & wrap-up", "Parents"),
      ],
      madh: [
        run("15:00", "Pandal, chairs, lights, sound check; food vendor arrives", "Stage coord."),
        run("18:00", "Guests arrive; welcome drinks", "Guest reception"),
        run("19:00", "Prayer; madhuram veppu — elders feed sweet to groom & bless him", "Eldest family member"),
        run("19:30", "Mehendi, music, dance items by cousins & friends", "Cousins"),
        run("20:30", "Dinner / snacks served", "Food coord."),
        run("22:00", "Wind down — early night for the groom", "Best man"),
      ],
      wed: [
        run("06:30", "Groom ready; blessing from parents at home", "Parents"),
        run("08:30", "Leave for church with family convoy", "Transport coord."),
        run("09:30", "Holy Qurbana begins", "Vicar"),
        run("10:30", "Marriage service: rings, minnu tying, manthrakodi, crowning, common candle", "Vicar"),
        run("12:00", "Register signing at church; photos on altar steps", "Photographer"),
        run("12:30", "Travel to auditorium; couple's entry", "Best man"),
        run("13:00", "Reception lunch service begins (batches)", "Food coord."),
        run("14:30", "Cake cutting, toasts, stage photos with guests", "Stage coord."),
        run("16:00", "Send-off; bride welcomed to groom's home", "Parents"),
      ],
    },

    shopping: [
      shop("Engagement rings (pair)", "Engagement", 45_000, "Buy 3–4 weeks before engagement"),
      shop("Wedding rings (pair)", "Wedding", 40_000, ""),
      shop("Minnu + gold chain", "Wedding", 25_000, "Priest ties minnu with thread drawn from the manthrakodi"),
      shop("Manthrakodi saree", "Wedding", 15_000, "Groom's family gifts it; placed over the bride's head during the service"),
      shop("Groom's suit + reception outfit", "Wedding", 25_000, "Stitching takes 3–4 weeks"),
      shop("Engagement outfit (groom)", "Engagement", 8_000, ""),
      shop("Madhuram sweets & tray", "Madhuram Veppu", 3_000, "Traditional sweet for the blessing"),
      shop("Common candle for church", "Wedding", 1_000, "Couple lights one candle together"),
      shop("Gift for priest & altar helpers", "Wedding", 5_000, ""),
      shop("Return gifts / favours (optional)", "Wedding", 20_000, "Skip or simplify if budget is tight"),
      shop("Emergency kit supplies", "Wedding", 2_000, "Pins, medicines, snacks, chargers"),
    ],
  };
}

/** Church formalities — fixed reference content, not user-editable. */
export const CHURCH_STEPS: { title: string; body: string }[] = [
  {
    title: "Meet the vicar",
    body: "Fix the wedding date and confirm church availability before booking the auditorium — the church date governs everything else.",
  },
  {
    title: "Pre-marriage counselling course",
    body: "Required for the couple. The certificate is valid for only 6 months, so time the batch to land inside that window.",
  },
  {
    title: "Documents",
    body: "Baptism and confirmation certificates, proof of age, and a no-objection letter if the bride belongs to another parish.",
  },
  {
    title: "Kalyana kuri (banns application)",
    body: "Signed by the couple, both sets of parents, and both vicars.",
  },
  {
    title: "Banns",
    body: "Read out in both parishes on three consecutive Sundays before the wedding.",
  },
  {
    title: "The service",
    body: "Holy Qurbana followed by the marriage service, roughly 2–3 hours: blessing of rings, minnu tying with thread drawn from the manthrakodi, manthrakodi placed over the bride, crowning, and the common candle.",
  },
  {
    title: "After the wedding",
    body: "Collect the church marriage certificate, then complete civil registration at the local registrar's office.",
  },
];
