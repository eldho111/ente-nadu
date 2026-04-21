import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
};

export default function AppTopBar({ title, subtitle }: Props) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: "linear-gradient(135deg, var(--mural-green-deep) 0%, var(--mural-green) 100%)",
        color: "var(--kasavu-surface)",
        boxShadow: "0 4px 12px rgba(6, 58, 40, 0.28)",
      }}
    >
      <div style={{
        maxWidth: 680, margin: "0 auto",
        padding: "10px 16px 12px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        {/* Logo on a cream postage-stamp badge */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flex: 1 }}
        >
          <span
            style={{
              display: "inline-block",
              background: "var(--kasavu-surface)",
              padding: 3,
              borderRadius: 8,
              border: "1.5px solid var(--kasavu-gold)",
              boxShadow: "0 2px 6px rgba(184, 134, 11, 0.35), inset 0 0 0 2px var(--kasavu-cream)",
              lineHeight: 0,
            }}
          >
            <img
              src="/icons/logo-mark.svg"
              alt=""
              width="36"
              height="36"
            />
          </span>
          <div style={{ display: "grid", gap: 1, lineHeight: 1.1 }}>
            <span style={{
              fontFamily: "var(--font-ml-display), var(--font-ml), serif",
              fontSize: 17,
              fontWeight: 700,
              color: "#fbe7c2",
              letterSpacing: "0.01em",
            }}>എന്റെ നാട്</span>
            <span style={{
              fontFamily: "var(--font-display), serif",
              fontSize: 10,
              fontWeight: 700,
              color: "#c8e0d3",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}>· Ente Nadu ·</span>
          </div>
        </Link>

        <Link
          href="/"
          style={{
            fontFamily: "var(--font-stamp), monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--mural-green-deep)",
            background: "var(--kasavu-gold-light)",
            padding: "6px 12px",
            borderRadius: 999,
            textDecoration: "none",
            border: "1.5px solid var(--kasavu-gold)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Web ⇱
        </Link>
      </div>

      {subtitle ? (
        <div style={{
          background: "rgba(6, 58, 40, 0.35)",
          padding: "5px 16px 6px",
          fontSize: 11,
          color: "#d7ecdf",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textAlign: "center",
          fontFamily: "var(--font-ml), serif",
        }}>
          {subtitle}
        </div>
      ) : null}

      {/* Kasavu double-rule at the bottom edge (the "gold thread") */}
      <div
        aria-hidden="true"
        style={{
          height: 6,
          background:
            "linear-gradient(to bottom," +
            " var(--kasavu-gold) 0 1px," +
            " var(--kasavu-cream) 1px 3px," +
            " var(--kasavu-gold-light) 3px 4px," +
            " var(--mural-green-deep) 4px 100%)",
        }}
      />
    </header>
  );
}
