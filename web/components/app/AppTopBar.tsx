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
        background: "#fffdf8",
        borderBottom: "1px solid #e5ddca",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "10px 14px", display: "grid", gap: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <Link className="chip" href="/">
            Web
          </Link>
        </div>
        {subtitle ? <span className="muted" style={{ fontSize: 12 }}>{subtitle}</span> : null}
      </div>
    </header>
  );
}
