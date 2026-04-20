"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function MobileAppRedirect() {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (pathname !== "/") return;
    if (params.get("web") === "1") return;
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if (!mobile) return;
    window.location.replace("/app");
  }, [pathname, params]);

  return null;
}
