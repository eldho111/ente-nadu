"use client";

/**
 * Wedding planner — client-side persistence.
 *
 * Everything lives in this browser's localStorage. Nothing is sent to the
 * Ente Nadu API, so opening /wedding on a different device or browser shows
 * the default plan until a JSON backup is imported there.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { logChange } from "./audit";
import { getCounter, seedState, setCounter } from "./seed";
import type { WeddingSave, WeddingState } from "./types";

const STORAGE_KEY = "enteNadu.wedding.v1";

function readSave(): WeddingSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WeddingSave>;
    if (!parsed.state || !Array.isArray(parsed.state.budget)) return null;
    return { _uid: Number(parsed._uid) || 5000, state: parsed.state as WeddingState };
  } catch {
    return null;
  }
}

function writeSave(state: WeddingState): void {
  if (typeof window === "undefined") return;
  try {
    const payload: WeddingSave = { _uid: getCounter(), state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota exceeded or storage blocked — the session still works in memory */
  }
}

export function isValidSave(value: unknown): value is WeddingSave {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<WeddingSave>;
  return Boolean(
    candidate.state &&
      Array.isArray(candidate.state.budget) &&
      Array.isArray(candidate.state.guests) &&
      candidate.state.settings,
  );
}

export type WeddingStore = {
  /** Null until the first client render has read localStorage. */
  state: WeddingState | null;
  /**
   * Mutate the plan. Optional `label` describes the change for the audit
   * log — e.g. "Added guest", "Updated Wedding budget". When omitted, a
   * generic "Updated plan" entry is written so we still know something
   * changed and who did it.
   */
  update: (mutate: (draft: WeddingState) => void, label?: string) => void;
  replace: (save: WeddingSave) => void;
  reset: () => void;
};

export function useWeddingStore(): WeddingStore {
  const [state, setState] = useState<WeddingState | null>(null);
  const stateRef = useRef<WeddingState | null>(null);

  // Hydrate after mount — localStorage is unavailable during SSR, and reading
  // it in render would desync the server and client markup.
  useEffect(() => {
    const saved = readSave();
    if (saved) {
      setCounter(saved._uid);
      stateRef.current = saved.state;
      setState(saved.state);
    } else {
      const fresh = seedState();
      stateRef.current = fresh;
      setState(fresh);
      writeSave(fresh);
    }
  }, []);

  const update = useCallback((mutate: (draft: WeddingState) => void, label?: string) => {
    const current = stateRef.current;
    if (!current) return;
    // Structural clone keeps React's identity check honest without pulling in
    // an immutability library for what is a small object graph.
    const draft = JSON.parse(JSON.stringify(current)) as WeddingState;
    mutate(draft);
    stateRef.current = draft;
    setState(draft);
    writeSave(draft);
    // Log the change so the family can see who did what and when.
    logChange(label || "Updated plan");
  }, []);

  const replace = useCallback((save: WeddingSave) => {
    setCounter(Number(save._uid) || 9000);
    stateRef.current = save.state;
    setState(save.state);
    writeSave(save.state);
    logChange("Imported plan from backup");
  }, []);

  const reset = useCallback(() => {
    const fresh = seedState();
    stateRef.current = fresh;
    setState(fresh);
    writeSave(fresh);
    logChange("Reset plan to defaults");
  }, []);

  return { state, update, replace, reset };
}
