import type { Metadata } from "next";

import WeddingGate from "@/components/wedding/WeddingGate";
import WeddingPlanner from "@/components/wedding/WeddingPlanner";

/**
 * /wedding — a private family planner.
 *
 * Deliberately absent from the site's main navigation and marked noindex, so
 * it stays a link-you-were-given rather than part of the public civic
 * product. All of its data is client-side; nothing touches the Ente Nadu API.
 */
export const metadata: Metadata = {
  title: "Wedding Planner — Private",
  description: "Private family wedding planner.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function WeddingPage() {
  return (
    <WeddingGate>
      <WeddingPlanner />
    </WeddingGate>
  );
}
