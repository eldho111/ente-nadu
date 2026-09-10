"use client";

/** Wedding planner — Dashboard, Budget & Finance, Settings. */
import { useRef } from "react";

import { formatINR } from "@/lib/wedding/engine";
import { nextId } from "@/lib/wedding/seed";
import { isValidSave } from "@/lib/wedding/store";
import { SEGMENTS } from "@/lib/wedding/types";
import type { EngineResult, Segment, WeddingSave, WeddingState } from "@/lib/wedding/types";

import { AddButton, DeleteButton, NumberInput, Panel, Stat, TextInput } from "./ui";

type Mutate = (mutate: (draft: WeddingState) => void) => void;

/* ── Dashboard ───────────────────────────────────────────────────────── */

export function Dashboard({ state, engine }: { state: WeddingState; engine: EngineResult }) {
  const { settings } = state;
  const budgetPct = Math.round((engine.planned / Math.max(settings.budgetTarget, 1)) * 100);
  const spentPct = Math.round((engine.spent / Math.max(engine.planned, 1)) * 100);
  const taskPct = Math.round((engine.tasksDone / Math.max(state.tasks.length, 1)) * 100);

  return (
    <>
      {engine.alerts.length > 0 ? (
        <div className="wAlerts">
          {engine.alerts.map((alert, index) => (
            <div key={`${alert.level}-${index}`} className={`wAlert wAlert-${alert.level}`}>
              {alert.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="wStats">
        <Stat
          label="Days to wedding"
          value={engine.daysTo === null ? "—" : engine.daysTo}
          sub={settings.weddingDate || "Set the date in Settings"}
        />
        <Stat
          label="Planned vs target"
          value={formatINR(engine.planned)}
          sub={`Target ${formatINR(settings.budgetTarget)}`}
          progress={budgetPct}
          danger={engine.planned > settings.budgetTarget}
        />
        <Stat
          label="Spent so far"
          value={formatINR(engine.spent)}
          sub={`Advances paid ${formatINR(engine.advance)}`}
          progress={spentPct}
        />
        <Stat
          label="Funding arranged"
          value={formatINR(engine.funds)}
          sub={
            engine.funds >= engine.planned
              ? "Covers the plan"
              : `Gap ${formatINR(engine.planned - engine.funds)}`
          }
        />
        <Stat
          label="Wedding guests"
          value={`${engine.guests.wed} pax`}
          sub={`Engagement ${engine.guests.eng} · Madhuram ${engine.guests.madh} · Confirmed ${engine.guests.confirmed}`}
        />
        <Stat
          label="Tasks completed"
          value={`${engine.tasksDone}/${state.tasks.length}`}
          sub={`${engine.overdue.length} overdue`}
          progress={taskPct}
        />
        <Stat
          label="Key bookings"
          value={`${engine.keyCategories.filter((c) => engine.bookedCategories.has(c)).length}/${engine.keyCategories.length}`}
          sub={
            <span>
              {engine.keyCategories.map((category) => (
                <span key={category} style={{ display: "block" }}>
                  {engine.bookedCategories.has(category) ? "✓" : "✗"} {category}
                </span>
              ))}
            </span>
          }
        />
        <Stat
          label="Catering (derived)"
          value={formatINR(engine.cateringEst)}
          sub={`${settings.plannedPlates} plates × ${formatINR(settings.cateringRate)}`}
        />
      </div>

      <Panel title="Budget by segment">
        <div className="wTableWrap">
          <table className="wTable">
            <thead>
              <tr>
                <th>Segment</th>
                <th className="wNum">Planned</th>
                <th className="wNum">Actual</th>
                <th className="wNum">Advance</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENTS.map((segment) => (
                <tr key={segment}>
                  <td>{segment}</td>
                  <td className="wNum num">{formatINR(engine.sub[segment])}</td>
                  <td className="wNum num">{formatINR(engine.subActual[segment])}</td>
                  <td className="wNum num">{formatINR(engine.subAdvance[segment])}</td>
                </tr>
              ))}
              <tr>
                <td>Contingency (5%, derived)</td>
                <td className="wNum num">{formatINR(engine.contingency)}</td>
                <td />
                <td />
              </tr>
              <tr className="wGrand">
                <td>Grand total</td>
                <td className="wNum num">{formatINR(engine.planned)}</td>
                <td className="wNum num">{formatINR(engine.spent)}</td>
                <td className="wNum num">{formatINR(engine.advance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ── Budget ──────────────────────────────────────────────────────────── */

export function Budget({
  state,
  engine,
  update,
}: {
  state: WeddingState;
  engine: EngineResult;
  update: Mutate;
}) {
  const addLine = (segment: Segment) =>
    update((draft) => {
      draft.budget.push({
        id: nextId(),
        segment,
        item: "New item",
        est: 0,
        actual: 0,
        advance: 0,
        paidTo: "",
      });
    });

  return (
    <>
      <p className="wHint">
        Estimated drives the plan. Enter Actual and Advance as vendors are paid — balances and the
        dashboard alerts follow automatically. Reception catering is derived from the plate count in
        Settings rather than typed here.
      </p>

      {SEGMENTS.map((segment) => (
        <Panel
          key={segment}
          title={`${segment} — ${formatINR(engine.sub[segment])}`}
          action={<AddButton onClick={() => addLine(segment)}>Add line</AddButton>}
        >
          <div className="wTableWrap">
            <table className="wTable">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="wNum">Estimated</th>
                  <th className="wNum">Actual</th>
                  <th className="wNum">Advance</th>
                  <th className="wNum">Balance</th>
                  <th>Paid to</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {segment === "Wedding" ? (
                  <tr className="wDerived">
                    <td>Reception catering</td>
                    <td className="wNum num">{formatINR(engine.cateringEst)}</td>
                    <td colSpan={4} className="wMuted">
                      {state.settings.plannedPlates} plates × {formatINR(state.settings.cateringRate)} —
                      change in Settings
                    </td>
                    <td />
                  </tr>
                ) : null}

                {state.budget
                  .filter((line) => line.segment === segment)
                  .map((line) => (
                    <tr key={line.id}>
                      <td>
                        <TextInput
                          value={line.item}
                          ariaLabel="Budget item"
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.budget.find((b) => b.id === line.id);
                              if (target) target.item = v;
                            })
                          }
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={line.est}
                          ariaLabel="Estimated cost"
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.budget.find((b) => b.id === line.id);
                              if (target) target.est = v;
                            })
                          }
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={line.actual}
                          ariaLabel="Actual cost"
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.budget.find((b) => b.id === line.id);
                              if (target) target.actual = v;
                            })
                          }
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={line.advance}
                          ariaLabel="Advance paid"
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.budget.find((b) => b.id === line.id);
                              if (target) target.advance = v;
                            })
                          }
                        />
                      </td>
                      <td className="wNum num wMuted">
                        {line.actual ? formatINR(line.actual - line.advance) : "—"}
                      </td>
                      <td>
                        <TextInput
                          value={line.paidTo}
                          placeholder="vendor…"
                          ariaLabel="Paid to"
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.budget.find((b) => b.id === line.id);
                              if (target) target.paidTo = v;
                            })
                          }
                        />
                      </td>
                      <td>
                        <DeleteButton
                          label={`Remove ${line.item}`}
                          onClick={() =>
                            update((draft) => {
                              draft.budget = draft.budget.filter((b) => b.id !== line.id);
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
      ))}

      <Panel title="Totals">
        <div className="wTableWrap">
          <table className="wTable">
            <tbody>
              <tr>
                <td>Segments + contingency ({formatINR(engine.contingency)})</td>
                <td className="wNum num">{formatINR(engine.planned)}</td>
              </tr>
              <tr>
                <td>Target</td>
                <td className="wNum num">{formatINR(state.settings.budgetTarget)}</td>
              </tr>
              <tr className="wGrand">
                <td>{engine.planned > state.settings.budgetTarget ? "Over target by" : "Headroom"}</td>
                <td className="wNum num">
                  {formatINR(Math.abs(state.settings.budgetTarget - engine.planned))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Funding plan"
        action={
          <AddButton
            onClick={() =>
              update((draft) => {
                draft.funding.push({ id: nextId(), source: "New source", amount: 0 });
              })
            }
          >
            Add source
          </AddButton>
        }
      >
        <div className="wTableWrap">
          <table className="wTable">
            <thead>
              <tr>
                <th>Source</th>
                <th className="wNum">Amount</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {state.funding.map((source) => (
                <tr key={source.id}>
                  <td>
                    <TextInput
                      value={source.source}
                      ariaLabel="Funding source"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.funding.find((f) => f.id === source.id);
                          if (target) target.source = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <NumberInput
                      value={source.amount}
                      ariaLabel="Amount"
                      onChange={(v) =>
                        update((draft) => {
                          const target = draft.funding.find((f) => f.id === source.id);
                          if (target) target.amount = v;
                        })
                      }
                    />
                  </td>
                  <td>
                    <DeleteButton
                      label={`Remove ${source.source}`}
                      onClick={() =>
                        update((draft) => {
                          draft.funding = draft.funding.filter((f) => f.id !== source.id);
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
              <tr className="wGrand">
                <td>{engine.funds >= engine.planned ? "Surplus" : "Shortfall"}</td>
                <td className="wNum num">{formatINR(Math.abs(engine.funds - engine.planned))}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="wFoot">
          Seeded with typical 2026 Kerala ranges — replace with real quotes as they arrive. Kerala
          Christian weddings customarily split costs between the two families; agree the split early
          and track only your side here if that is simpler.
        </p>
      </Panel>
    </>
  );
}

/* ── Settings ────────────────────────────────────────────────────────── */

export function SettingsPanel({
  state,
  engine,
  update,
  replace,
  reset,
}: {
  state: WeddingState;
  engine: EngineResult;
  update: Mutate;
  replace: (save: WeddingSave) => void;
  reset: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { settings } = state;

  const exportJson = () => {
    const payload = JSON.stringify({ _uid: 9000, state }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `wedding-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!isValidSave(parsed)) throw new Error("bad shape");
        replace(parsed);
        window.alert("Backup restored.");
      } catch {
        window.alert("That file doesn't look like a valid wedding backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Panel title="Plan settings">
        <div className="wForm">
          <label>
            <span>Wedding date</span>
            <input
              type="date"
              value={settings.weddingDate}
              onChange={(e) =>
                update((draft) => {
                  draft.settings.weddingDate = e.target.value;
                })
              }
            />
          </label>
          <label>
            <span>Engagement date</span>
            <input
              type="date"
              value={settings.engagementDate}
              onChange={(e) =>
                update((draft) => {
                  draft.settings.engagementDate = e.target.value;
                })
              }
            />
          </label>
          <label>
            <span>Budget target (₹)</span>
            <input
              type="number"
              inputMode="numeric"
              value={settings.budgetTarget}
              onChange={(e) =>
                update((draft) => {
                  draft.settings.budgetTarget = Number(e.target.value) || 0;
                })
              }
            />
          </label>
          <label>
            <span>Catering plates planned</span>
            <input
              type="number"
              inputMode="numeric"
              value={settings.plannedPlates}
              onChange={(e) =>
                update((draft) => {
                  draft.settings.plannedPlates = Number(e.target.value) || 0;
                })
              }
            />
          </label>
          <label>
            <span>Per-plate rate (₹) — ₹350–500 simple sadya, ₹600+ non-veg</span>
            <input
              type="number"
              inputMode="numeric"
              value={settings.cateringRate}
              onChange={(e) =>
                update((draft) => {
                  draft.settings.cateringRate = Number(e.target.value) || 0;
                })
              }
            />
          </label>
          <label>
            <span>Bride&rsquo;s name (optional)</span>
            <input
              type="text"
              value={settings.brideName}
              onChange={(e) =>
                update((draft) => {
                  draft.settings.brideName = e.target.value;
                })
              }
            />
          </label>
        </div>
      </Panel>

      <Panel title="Backup & restore">
        <p className="wHint">
          Entries save to this browser automatically. They do not sync to the Ente Nadu server or to
          other devices — export a backup to move the plan to a phone, or to share it with family.
        </p>
        <div className="wBtnRow">
          <button type="button" className="wBtn wBtnPrimary" onClick={exportJson}>
            Export backup (JSON)
          </button>
          <button type="button" className="wBtn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <button
            type="button"
            className="wBtn wBtnDanger"
            onClick={() => {
              if (window.confirm("Wipe all entered data and restore the default plan?")) reset();
            }}
          >
            Reset to defaults
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importJson(file);
            e.target.value = "";
          }}
        />
        <p className="wFoot">
          Currently holding {state.guests.length} guest entries, {state.budget.length} budget lines,{" "}
          {state.vendors.length} vendors and {state.tasks.length} tasks. Planned total{" "}
          {formatINR(engine.planned)}.
        </p>
      </Panel>
    </>
  );
}
