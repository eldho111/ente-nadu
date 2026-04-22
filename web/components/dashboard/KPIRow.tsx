"use client";

import KPITile from "./KPITile";

export type KPIItem = {
  key: string;
  value: number | string;
  label: string;
  sublabel?: string;
  variant?: "default" | "open" | "progress" | "fixed" | "info";
  trendPct?: number;
  trendLabel?: string;
  href?: string;
};

type Props = {
  items: KPIItem[];
};

/**
 * Responsive KPI row. Desktop: 5 across. Tablet: 3 across. Mobile: 2 across.
 * Each tile auto-resizes to content via grid-template-columns.
 */
export default function KPIRow({ items }: Props) {
  return (
    <div className="kpi-row">
      {items.map((item) => (
        <KPITile
          key={item.key}
          value={item.value}
          label={item.label}
          sublabel={item.sublabel}
          variant={item.variant}
          trendPct={item.trendPct}
          trendLabel={item.trendLabel}
          href={item.href}
        />
      ))}
      <style>{`
        .kpi-row {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        @media (max-width: 1100px) {
          .kpi-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        }
      `}</style>
    </div>
  );
}
