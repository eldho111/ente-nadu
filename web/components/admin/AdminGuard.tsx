"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAdminKey, clearAdminKey } from "@/lib/admin-api";

/**
 * Wraps any /admin/* page. If no admin key in sessionStorage, redirects
 * to /admin (login). Renders children only after auth check passes.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAdminKey()) {
      router.replace("/admin");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div style={{ paddingTop: "20vh", textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
        Verifying session…
      </div>
    );
  }

  return <>{children}</>;
}

export function useAdminSignOut() {
  const router = useRouter();
  return () => {
    clearAdminKey();
    router.replace("/admin");
  };
}
