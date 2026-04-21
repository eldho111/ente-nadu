/**
 * PookalamSpinner — a rotating Onam flower-carpet as a loading indicator.
 * Uses the same 3-ring pookalam motif as the homepage stats centerpiece.
 *
 * Props:
 *   size   — px (default 56)
 *   label  — screen-reader text + optional visible tag under the ring
 *   showLabel — set false to hide the visible label (still announced to AT)
 */

type Props = {
  size?: number;
  label?: string;
  showLabel?: boolean;
};

export default function PookalamSpinner({
  size = 56,
  label = "Loading…",
  showLabel = true,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <img
        src="/icons/motifs/pookalam-ring.svg"
        alt=""
        width={size}
        height={size}
        style={{
          animation: "pookalamSpin 3.5s linear infinite",
          filter: "drop-shadow(0 1px 2px rgba(168,50,30,0.15))",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-stamp), monospace",
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--kasavu-gold-dark)",
          fontWeight: 700,
          opacity: showLabel ? 1 : 0,
          clip: showLabel ? "auto" : "rect(0 0 0 0)",
          position: showLabel ? "static" : "absolute",
        }}
      >
        {label}
      </span>
      <style>{`
        @keyframes pookalamSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
