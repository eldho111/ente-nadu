import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    captured_at: new Date().toISOString(),
    node_env: process.env.NODE_ENV || "unknown",
    web_runtime_mode: process.env.WEB_RUNTIME_MODE || "unknown",
    next_dist_dir: process.env.NEXT_DIST_DIR || ".next",
    pwa_enabled: process.env.NEXT_PUBLIC_ENABLE_PWA === "true",
    api_base_visible: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  });
}
