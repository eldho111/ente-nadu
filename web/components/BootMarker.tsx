"use client";

import { useEffect } from "react";

export default function BootMarker() {
  useEffect(() => {
    const el = document.getElementById("cp-boot-fallback");
    if (el) {
      el.style.display = "none";
    }
  }, []);

  return null;
}
