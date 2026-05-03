/**
 * Admin API client — wraps fetch() and injects the X-Admin-Api-Key header
 * from sessionStorage. Used only by /admin/* pages.
 *
 * sessionStorage is intentional (not localStorage): the key is wiped when
 * the tab closes. Admins re-authenticate every session.
 */

import { getPublicApiBase } from "@/lib/api";

const API_BASE = getPublicApiBase();
const STORAGE_KEY = "ente-nadu.admin-api-key";

export function getAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* storage blocked */
  }
}

export function clearAdminKey(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/**
 * fetch with the admin key automatically attached. Returns the raw
 * Response — the caller decides how to parse / handle errors.
 */
export async function adminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const key = getAdminKey();
  if (!key) {
    throw new AdminAuthError("not signed in");
  }
  const headers = new Headers(init.headers);
  headers.set("X-Admin-Api-Key", key);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export class AdminAuthError extends Error {
  constructor(message = "admin auth failed") {
    super(message);
    this.name = "AdminAuthError";
  }
}

/**
 * Hits GET /v1/admin/ping with the supplied key. Used during login to
 * validate before we save it to sessionStorage.
 */
export async function validateAdminKey(key: string): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/v1/admin/ping`, {
      headers: { "X-Admin-Api-Key": key },
    });
    return resp.ok;
  } catch {
    return false;
  }
}
