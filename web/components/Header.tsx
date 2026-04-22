"use client";

/**
 * Site header.
 *
 * The old Kerala-themed header (kasavu/cream wordmark, Manjali Malayalam,
 * palm-leaf accents) has been replaced by the minimalist civic-ops
 * LiveHeader. This file is a thin re-export so `@/components/Header`
 * continues to resolve anywhere it's imported.
 */
import LiveHeader from "./dashboard/LiveHeader";

export default function Header() {
  return <LiveHeader />;
}
