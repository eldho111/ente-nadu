import Link from "next/link";

/**
 * KeralaEmptyState — illustrated empty-state block used in feeds,
 * track, ops inbox, etc.
 *
 * variant "nilavilakku" — quiet / waiting / no-data feel
 * variant "snake-boat"  — "be the first / start of journey" feel
 * variant "elephant"    — "authority/acknowledgement" feel
 */

type Props = {
  variant?: "nilavilakku" | "snake-boat" | "elephant";
  title: string;
  titleMl?: string;
  description?: string;
  cta?: { href: string; label: string };
};

const MOTIF_BY_VARIANT: Record<
  NonNullable<Props["variant"]>,
  { src: string; width: number; height: number }
> = {
  nilavilakku: { src: "/icons/motifs/nilavilakku.svg", width: 96, height: 160 },
  "snake-boat": { src: "/icons/motifs/snake-boat.svg", width: 220, height: 110 },
  elephant: { src: "/icons/motifs/elephant-stamp.svg", width: 120, height: 120 },
};

export default function KeralaEmptyState({
  variant = "nilavilakku",
  title,
  titleMl,
  description,
  cta,
}: Props) {
  const motif = MOTIF_BY_VARIANT[variant];
  return (
    <div
      className="kasavu-border soft"
      style={{
        padding: "32px 24px",
        textAlign: "center",
        display: "grid",
        justifyItems: "center",
        gap: 12,
      }}
    >
      <img
        src={motif.src}
        alt=""
        width={motif.width}
        height={motif.height}
        style={{ opacity: 0.92 }}
      />
      {titleMl && (
        <div
          style={{
            fontFamily: "var(--font-ml-display), var(--font-ml), serif",
            fontSize: 20,
            color: "var(--mural-red)",
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {titleMl}
        </div>
      )}
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          color: "var(--mural-green-deep)",
          fontFamily: "var(--font-display), serif",
          letterSpacing: "0.01em",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--ink-1)",
            maxWidth: "42ch",
            lineHeight: 1.55,
          }}
        >
          {description}
        </p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="button saffron"
          style={{ marginTop: 4 }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
