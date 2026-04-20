const INTERNAL_API_BASE =
  process.env.API_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

const PUBLIC_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

export type ReportCard = {
  id: string;
  public_id: string;
  category: string;
  status: string;
  severity_ai: number | null;
  confidence: number | null;
  created_at: string;
  public_lat: number;
  public_lon: number;
  ward_id: string | null;
  zone_id: string | null;
};

export type ReportDetail = {
  id: string;
  public_id: string;
  created_at: string;
  category_final: string;
  category_ai: string | null;
  confidence: number | null;
  severity_ai: number | null;
  status: string;
  moderation_state: string;
  ward_id: string | null;
  ward_name: string | null;
  zone_id: string | null;
  zone_name: string | null;
  locality: string | null;
  address_text: string | null;
  description_ai: string | null;
  description_user: string | null;
  public_lat: number;
  public_lon: number;
  checkin_count: number;
  last_checkin_at: string | null;
  media: Array<{ id: string; media_type: string; public_url: string | null; thumbnail_url: string | null }>;
  events: Array<{ id: string; event_type: string; payload?: Record<string, unknown>; actor?: string; created_at: string }>;
};

export type WardMetric = {
  ward_id: string | null;
  zone_id: string | null;
  open_reports: number;
  total_reports: number;
  notify_events: number;
};

export type LocaleCode = "en" | "kn" | "ml";

type ReportFilter = {
  bbox?: string;
  category?: string;
  status?: string;
  ward_id?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
};

function queryString(filters?: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function fetchReports(filters?: ReportFilter): Promise<ReportCard[]> {
  try {
    const url = `${INTERNAL_API_BASE}/v1/reports${queryString(filters)}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.items || [];
  } catch {
    console.warn("[api] fetchReports failed - API may be offline");
    return [];
  }
}

export async function fetchReportByPublicId(publicId: string): Promise<ReportDetail | null> {
  try {
    const url = `${INTERNAL_API_BASE}/v1/reports/${publicId}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    console.warn("[api] fetchReportByPublicId failed - API may be offline");
    return null;
  }
}

export async function fetchWardMetrics(): Promise<WardMetric[]> {
  try {
    const response = await fetch(`${INTERNAL_API_BASE}/v1/reports/metrics/wards`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.items || [];
  } catch {
    console.warn("[api] fetchWardMetrics failed - API may be offline");
    return [];
  }
}

export async function fetchLocales(): Promise<LocaleCode[]> {
  try {
    const response = await fetch(`${INTERNAL_API_BASE}/v1/meta/locales`, { cache: "no-store" });
    if (!response.ok) {
      return ["en"];
    }
    const data = await response.json();
    return data.locales || ["en"];
  } catch {
    return ["en"];
  }
}

export function notifyEmailEndpoint(publicId: string): string {
  return `${PUBLIC_API_BASE}/v1/reports/${publicId}/notify/email`;
}

export function notifyWhatsAppEndpoint(publicId: string): string {
  return `${PUBLIC_API_BASE}/v1/reports/${publicId}/notify/whatsapp`;
}

export function getPublicApiBase(): string {
  return PUBLIC_API_BASE;
}
