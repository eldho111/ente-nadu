"use client";

/** Wedding planner — Guest list, Vendors, Contacts. */
import { formatINR } from "@/lib/wedding/engine";
import { nextId } from "@/lib/wedding/seed";
import { VENDOR_STATUSES } from "@/lib/wedding/types";
import type { EngineResult, Rsvp, Side, VendorStatus, WeddingState } from "@/lib/wedding/types";

import {
  AddButton,
  Check,
  Chip,
  DeleteButton,
  NumberInput,
  Panel,
  PhoneCell,
  SelectInput,
  Stat,
  TextInput,
} from "./ui";

type Mutate = (mutate: (draft: WeddingState) => void) => void;

const SIDES: readonly Side[] = ["Groom", "Bride", "Both"];
const RSVPS: readonly Rsvp[] = ["?", "Yes", "No"];

/* ── Guests ──────────────────────────────────────────────────────────── */

export function Guests({
  state,
  engine,
  update,
}: {
  state: WeddingState;
  engine: EngineResult;
  update: Mutate;
}) {
  return (
    <>
      <div className="wStats">
        <Stat label="Entries" value={engine.guests.entries} />
        <Stat label="Total pax" value={engine.guests.pax} />
        <Stat
          label="Wedding pax"
          value={engine.guests.wed}
          sub={`Plates planned ${state.settings.plannedPlates}`}
          danger={engine.guests.wed > state.settings.plannedPlates}
        />
        <Stat label="Confirmed pax" value={engine.guests.confirmed} />
      </div>

      <Panel
        title="Guest list"
        action={
          <AddButton
            onClick={() =>
              update((draft) => {
                draft.guests.push({
                  id: nextId(),
                  name: "",
                  group: "",
                  side: "Groom",
                  pax: 2,
                  eng: false,
                  madh: false,
                  wed: true,
                  invited: false,
                  rsvp: "?",
                });
              })
            }
          >
            Add family
          </AddButton>
        }
      >
        <p className="wHint">
          One row per family or group, with a headcount. The events ticked here decide which totals
          each group counts toward — the wedding column feeds the catering rule.
        </p>
        <div className="wTableWrap">
          <table className="wTable">
            <thead>
              <tr>
                <th>Name / family</th>
                <th>Group</th>
                <th>Side</th>
                <th className="wNum">Pax</th>
                <th>Eng</th>
                <th>Madh</th>
                <th>Wed</th>
                <th>Invited</th>
                <th>RSVP</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {state.guests.map((guest) => (
                <tr key={guest.id}>
                  <td>
                    <TextInput
                      value={guest.name}
                      placeholder="name…"
                      ariaLabel="Guest name"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.guests.find((g) => g.id === guest.id);
                          if (target) target.name = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <TextInput
                      value={guest.group}
                      placeholder="group…"
                      ariaLabel="Guest group"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.guests.find((g) => g.id === guest.id);
                          if (target) target.group = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <SelectInput
                      value={guest.side}
                      options={SIDES}
                      ariaLabel="Side"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.guests.find((g) => g.id === guest.id);
                          if (target) target.side = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <NumberInput
                      value={guest.pax}
                      ariaLabel="Headcount"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.guests.find((g) => g.id === guest.id);
                          if (target) target.pax = v;
                        })
                      }
                    />
                  </td>
                  {(["eng", "madh", "wed", "invited"] as const).map((field) => (
                    <td key={field} className="wCenter">
                      <Check
                        checked={guest[field]}
                        ariaLabel={`${field} for ${guest.name || "guest"}`}
                        onChange={(v) =>
                          update((draft) => {
                            const target = draft.guests.find((g) => g.id === guest.id);
                            if (target) target[field] = v;
                          })
                        }
                      />
                    </td>
                  ))}
                  <td>
                    <SelectInput
                      value={guest.rsvp}
                      options={RSVPS}
                      ariaLabel="RSVP"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.guests.find((g) => g.id === guest.id);
                          if (target) target.rsvp = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <DeleteButton
                      label={`Remove ${guest.name || "guest"}`}
                      onClick={() =>
                        update((draft) => {
                          draft.guests = draft.guests.filter((g) => g.id !== guest.id);
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ── Vendors ─────────────────────────────────────────────────────────── */

function vendorTone(status: VendorStatus): "ok" | "warn" | "bad" | "mute" {
  if (status === "Booked") return "ok";
  if (status === "Shortlisted") return "warn";
  if (status === "Rejected") return "bad";
  return "mute";
}

export function Vendors({
  state,
  engine,
  update,
}: {
  state: WeddingState;
  engine: EngineResult;
  update: Mutate;
}) {
  return (
    <>
      <p className="wHint">
        Collect two or three quotes per category, then mark one Booked. Within{" "}
        {engine.daysTo === null ? "90 days of the date" : `${engine.daysTo} days`}, any unbooked
        auditorium, caterer or photographer is raised as an alert on the dashboard.
      </p>

      <Panel
        title="Vendor shortlist"
        action={
          <AddButton
            onClick={() =>
              update((draft) => {
                draft.vendors.push({
                  id: nextId(),
                  category: "",
                  name: "",
                  phone: "",
                  quote: 0,
                  notes: "",
                  status: "To contact",
                });
              })
            }
          >
            Add vendor
          </AddButton>
        }
      >
        <div className="wTableWrap">
          <table className="wTable">
            <thead>
              <tr>
                <th>Category</th>
                <th>Vendor</th>
                <th>Phone</th>
                <th className="wNum">Quote</th>
                <th>Notes / inclusions</th>
                <th>Status</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {state.vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <TextInput
                      value={vendor.category}
                      placeholder="category…"
                      ariaLabel="Vendor category"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.vendors.find((x) => x.id === vendor.id);
                          if (target) target.category = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <TextInput
                      value={vendor.name}
                      placeholder="name…"
                      ariaLabel="Vendor name"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.vendors.find((x) => x.id === vendor.id);
                          if (target) target.name = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <PhoneCell
                      value={vendor.phone}
                      ariaLabel="Vendor phone"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.vendors.find((x) => x.id === vendor.id);
                          if (target) target.phone = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <NumberInput
                      value={vendor.quote}
                      ariaLabel="Quote"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.vendors.find((x) => x.id === vendor.id);
                          if (target) target.quote = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <TextInput
                      value={vendor.notes}
                      placeholder="what's included…"
                      ariaLabel="Vendor notes"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.vendors.find((x) => x.id === vendor.id);
                          if (target) target.notes = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <div className="wStatusCell">
                      <SelectInput
                        value={vendor.status}
                        options={VENDOR_STATUSES}
                        ariaLabel="Vendor status"
                        onChange={(v) =>
                          update((draft) => {
                            const target = draft.vendors.find((x) => x.id === vendor.id);
                            if (target) target.status = v;
                          })
                        }
                      />
                      <Chip tone={vendorTone(vendor.status)}>
                        {vendor.quote ? formatINR(vendor.quote) : "—"}
                      </Chip>
                    </div>
                  </td>
                  <td>
                    <DeleteButton
                      label={`Remove ${vendor.name || vendor.category || "vendor"}`}
                      onClick={() =>
                        update((draft) => {
                          draft.vendors = draft.vendors.filter((x) => x.id !== vendor.id);
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ── Contacts ────────────────────────────────────────────────────────── */

export function Contacts({ state, update }: { state: WeddingState; update: Mutate }) {
  return (
    <Panel
      title="Contacts"
      action={
        <AddButton
          onClick={() =>
            update((draft) => {
              draft.contacts.push({ id: nextId(), role: "", name: "", phone: "", notes: "" });
            })
          }
        >
          Add contact
        </AddButton>
      }
    >
      <p className="wHint">
        Everyone worth reaching on the day. Fill the numbers in early and share the list with the
        family coordinators.
      </p>
      <div className="wTableWrap">
        <table className="wTable">
          <thead>
            <tr>
              <th>Role</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Notes</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {state.contacts.map((contact) => (
              <tr key={contact.id}>
                <td>
                  <TextInput
                    value={contact.role}
                    placeholder="role…"
                    ariaLabel="Contact role"
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.contacts.find((c) => c.id === contact.id);
                        if (target) target.role = v;
                      })
                    }
                  />
                </td>
                <td>
                  <TextInput
                    value={contact.name}
                    placeholder="name…"
                    ariaLabel="Contact name"
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.contacts.find((c) => c.id === contact.id);
                        if (target) target.name = v;
                      })
                    }
                  />
                </td>
                <td>
                  <PhoneCell
                    value={contact.phone}
                    ariaLabel="Contact phone"
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.contacts.find((c) => c.id === contact.id);
                        if (target) target.phone = v;
                      })
                    }
                  />
                </td>
                <td>
                  <TextInput
                    value={contact.notes}
                    ariaLabel="Contact notes"
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.contacts.find((c) => c.id === contact.id);
                        if (target) target.notes = v;
                      })
                    }
                  />
                </td>
                <td>
                  <DeleteButton
                    label={`Remove ${contact.role || "contact"}`}
                    onClick={() =>
                      update((draft) => {
                        draft.contacts = draft.contacts.filter((c) => c.id !== contact.id);
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
