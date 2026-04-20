"use client";

type Rep = {
  id: string;
  name: string;
  name_ml?: string | null;
  role: string;
  party?: string | null;
  photo_url?: string | null;
};

type Props = {
  representatives: Rep[];
  locale?: string;
};

const ROLE_LABELS: Record<string, Record<string, string>> = {
  mp: { en: "Your MP", ml: "നിങ്ങളുടെ എം.പി" },
  mla: { en: "Your MLA", ml: "നിങ്ങളുടെ എം.എല്‍.എ" },
  corporation_councillor: { en: "Your Councillor", ml: "നിങ്ങളുടെ കൗണ്‍സിലര്‍" },
  municipal_councillor: { en: "Your Councillor", ml: "നിങ്ങളുടെ കൗണ്‍സിലര്‍" },
  panchayat_president: { en: "Panchayat President", ml: "പഞ്ചായത്ത് പ്രസിഡന്റ്" },
};

export default function RepresentativeCard({ representatives, locale = "en" }: Props) {
  if (!representatives || representatives.length === 0) return null;

  return (
    <section
      className="card"
      style={{ padding: 14, display: "grid", gap: 10 }}
    >
      <strong style={{ fontSize: 13, color: "var(--ink-1, #475569)" }}>
        {locale === "ml" ? "നിങ്ങളുടെ ജനപ്രതിനിധികള്‍" : "Your Representatives"}
      </strong>
      {representatives.map((rep) => {
        const roleLabel = ROLE_LABELS[rep.role]?.[locale] || ROLE_LABELS[rep.role]?.en || rep.role;
        const displayName = locale === "ml" && rep.name_ml ? rep.name_ml : rep.name;
        return (
          <div
            key={rep.id}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#e2e8f0", display: "grid", placeItems: "center",
                fontSize: 14, fontWeight: 700, color: "#475569",
                overflow: "hidden", flexShrink: 0,
              }}
            >
              {rep.photo_url ? (
                <img src={rep.photo_url} alt={rep.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                rep.name.charAt(0)
              )}
            </div>
            <div style={{ fontSize: 13 }}>
              <div className="muted" style={{ fontSize: 11 }}>{roleLabel}</div>
              <strong>{displayName}</strong>
              {rep.party && (
                <span className="chip" style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px" }}>
                  {rep.party}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
