"use client";

/** Wedding planner — Timeline, Runsheets, Shopping, Church formalities. */
import { formatINR } from "@/lib/wedding/engine";
import { CHURCH_STEPS, nextId } from "@/lib/wedding/seed";
import type { EngineResult, RunsheetKey, WeddingState } from "@/lib/wedding/types";

import { AddButton, Check, Chip, DeleteButton, NumberInput, Panel, TextInput } from "./ui";

type Mutate = (mutate: (draft: WeddingState) => void) => void;

/* ── Timeline ────────────────────────────────────────────────────────── */

export function Tasks({
  state,
  engine,
  update,
}: {
  state: WeddingState;
  engine: EngineResult;
  update: Mutate;
}) {
  const phases = Array.from(new Set(state.tasks.map((t) => t.phase)));
  const overdueIds = new Set(engine.overdue.map((t) => t.id));

  return (
    <>
      <p className="wHint">
        The month-by-month master plan. Set due dates and the dashboard will chase anything that
        slips — {engine.tasksDone} of {state.tasks.length} done, {engine.overdue.length} overdue.
      </p>

      {phases.map((phase) => (
        <Panel
          key={phase}
          title={phase}
          action={
            <AddButton
              onClick={() =>
                update((draft) => {
                  draft.tasks.push({
                    id: nextId(),
                    phase,
                    task: "New task",
                    owner: "",
                    due: "",
                    done: false,
                  });
                })
              }
            >
              Add task
            </AddButton>
          }
        >
          <div className="wTableWrap">
            <table className="wTable">
              <thead>
                <tr>
                  <th aria-label="Done" style={{ width: 40 }} />
                  <th>Task</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {state.tasks
                  .filter((task) => task.phase === phase)
                  .map((task) => (
                    <tr key={task.id} className={task.done ? "wDone" : ""}>
                      <td className="wCenter">
                        <Check
                          checked={task.done}
                          ariaLabel={`Mark ${task.task} complete`}
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.tasks.find((t) => t.id === task.id);
                              if (target) target.done = v;
                            })
                          }
                        />
                      </td>
                      <td>
                        <TextInput
                          value={task.task}
                          ariaLabel="Task"
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.tasks.find((t) => t.id === task.id);
                              if (target) target.task = v;
                            })
                          }
                        />
                      </td>
                      <td>
                        <TextInput
                          value={task.owner}
                          placeholder="owner…"
                          ariaLabel="Owner"
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.tasks.find((t) => t.id === task.id);
                              if (target) target.owner = v;
                            })
                          }
                        />
                      </td>
                      <td>
                        <TextInput
                          type="date"
                          value={task.due}
                          ariaLabel="Due date"
                          onChange={(v) =>
                            update((draft) => {
                              const target = draft.tasks.find((t) => t.id === task.id);
                              if (target) target.due = v;
                            })
                          }
                        />
                      </td>
                      <td>
                        {task.done ? (
                          <Chip tone="ok">Done</Chip>
                        ) : overdueIds.has(task.id) ? (
                          <Chip tone="bad">Overdue</Chip>
                        ) : null}
                      </td>
                      <td>
                        <DeleteButton
                          label={`Remove ${task.task}`}
                          onClick={() =>
                            update((draft) => {
                              draft.tasks = draft.tasks.filter((t) => t.id !== task.id);
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
    </>
  );
}

/* ── Runsheets ───────────────────────────────────────────────────────── */

const RUNSHEETS: { key: RunsheetKey; title: string }[] = [
  { key: "eng", title: "Engagement day" },
  { key: "madh", title: "Madhuram veppu — night before, at home" },
  { key: "wed", title: "Wedding day" },
];

export function Runsheets({ state, update }: { state: WeddingState; update: Mutate }) {
  return (
    <>
      <p className="wHint">
        Hour-by-hour schedule for each event. The timings are typical — confirm the Qurbana start
        with the vicar and shift the rest around it.
      </p>

      {RUNSHEETS.map(({ key, title }) => (
        <Panel
          key={key}
          title={title}
          action={
            <AddButton
              onClick={() =>
                update((draft) => {
                  draft.runsheets[key].push({ id: nextId(), time: "", activity: "", resp: "" });
                })
              }
            >
              Add row
            </AddButton>
          }
        >
          <div className="wTableWrap">
            <table className="wTable">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Time</th>
                  <th>Activity</th>
                  <th style={{ width: 190 }}>Responsible</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {state.runsheets[key].map((item) => (
                  <tr key={item.id}>
                    <td>
                      <TextInput
                        type="time"
                        value={item.time}
                        ariaLabel="Time"
                        onChange={(v) =>
                          update((draft) => {
                            const target = draft.runsheets[key].find((r) => r.id === item.id);
                            if (target) target.time = v;
                          })
                        }
                      />
                    </td>
                    <td>
                      <TextInput
                        value={item.activity}
                        ariaLabel="Activity"
                        onChange={(v) =>
                          update((draft) => {
                            const target = draft.runsheets[key].find((r) => r.id === item.id);
                            if (target) target.activity = v;
                          })
                        }
                      />
                    </td>
                    <td>
                      <TextInput
                        value={item.resp}
                        ariaLabel="Responsible"
                        onChange={(v) =>
                          update((draft) => {
                            const target = draft.runsheets[key].find((r) => r.id === item.id);
                            if (target) target.resp = v;
                          })
                        }
                      />
                    </td>
                    <td>
                      <DeleteButton
                        label="Remove row"
                        onClick={() =>
                          update((draft) => {
                            draft.runsheets[key] = draft.runsheets[key].filter(
                              (r) => r.id !== item.id,
                            );
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
    </>
  );
}

/* ── Shopping ────────────────────────────────────────────────────────── */

export function Shopping({ state, update }: { state: WeddingState; update: Mutate }) {
  const total = state.shopping.reduce((sum, item) => sum + (Number(item.est) || 0), 0);
  const bought = state.shopping.filter((item) => item.bought).length;

  return (
    <Panel
      title={`Shopping & ritual items — ${formatINR(total)}`}
      action={
        <AddButton
          onClick={() =>
            update((draft) => {
              draft.shopping.push({
                id: nextId(),
                item: "New item",
                event: "Wedding",
                est: 0,
                bought: false,
                notes: "",
              });
            })
          }
        >
          Add item
        </AddButton>
      }
    >
      <p className="wHint">
        Includes the Syrian Orthodox ritual items — minnu, manthrakodi, the common candle — beside
        outfits and gifts. {bought} of {state.shopping.length} bought.
      </p>
      <div className="wTableWrap">
        <table className="wTable">
          <thead>
            <tr>
              <th>Item</th>
              <th>Event</th>
              <th className="wNum">Est. cost</th>
              <th>Bought</th>
              <th>Notes</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {state.shopping.map((item) => (
              <tr key={item.id} className={item.bought ? "wDone" : ""}>
                <td>
                  <TextInput
                    value={item.item}
                    ariaLabel="Item"
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.shopping.find((s) => s.id === item.id);
                        if (target) target.item = v;
                      })
                    }
                  />
                </td>
                <td>
                  <TextInput
                    value={item.event}
                    ariaLabel="Event"
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.shopping.find((s) => s.id === item.id);
                        if (target) target.event = v;
                      })
                    }
                  />
                </td>
                <td>
                  <NumberInput
                    value={item.est}
                    ariaLabel="Estimated cost"
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.shopping.find((s) => s.id === item.id);
                        if (target) target.est = v;
                      })
                    }
                  />
                </td>
                <td className="wCenter">
                  <Check
                    checked={item.bought}
                    ariaLabel={`Mark ${item.item} bought`}
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.shopping.find((s) => s.id === item.id);
                        if (target) target.bought = v;
                      })
                    }
                  />
                </td>
                <td>
                  <TextInput
                    value={item.notes}
                    ariaLabel="Notes"
                    onChange={(v) =>
                      update((draft) => {
                        const target = draft.shopping.find((s) => s.id === item.id);
                        if (target) target.notes = v;
                      })
                    }
                  />
                </td>
                <td>
                  <DeleteButton
                    label={`Remove ${item.item}`}
                    onClick={() =>
                      update((draft) => {
                        draft.shopping = draft.shopping.filter((s) => s.id !== item.id);
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

/* ── Church ──────────────────────────────────────────────────────────── */

export function Church() {
  return (
    <Panel title="Church formalities — Syrian Orthodox">
      <p className="wHint">
        The non-negotiables, in order. Several have long lead times, so they belong at the front of
        the plan rather than the end.
      </p>
      <ol className="wSteps">
        {CHURCH_STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="wStepNum num">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="wFoot">
        Each of these is already seeded as a task in the Timeline section, with an owner attached.
      </p>
    </Panel>
  );
}
