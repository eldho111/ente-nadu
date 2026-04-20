"use client";

type RepCardProps = {
  name: string;
  nameMl?: string | null;
  role: string;
  constituency: string;
  constituencyMl?: string | null;
  district?: string | null;
  party?: string | null;
  photoUrl?: string | null;
  openIssues: number;
  totalIssues: number;
  resolvedIssues: number;
  resolutionRate: number;
  performanceTier: string;
  locale?: string;
};

const ROLE_LABELS: Record<string, Record<string, string>> = {
  mp: { en: "MP", ml: "എം.പി" },
  mla: { en: "MLA", ml: "എം.എല്‍.എ" },
  corporation_councillor: { en: "Councillor", ml: "കൗണ്‍സിലര്‍" },
  municipal_councillor: { en: "Councillor", ml: "കൗണ്‍സിലര്‍" },
  panchayat_president: { en: "President", ml: "പ്രസിഡന്റ്" },
  district_panchayat_member: { en: "District Member", ml: "ജില്ലാ അംഗം" },
  block_panchayat_member: { en: "Block Member", ml: "ബ്ലോക്ക് അംഗം" },
};

const TIER_COLORS: Record<string, string> = {
  good: "#16a34a",
  average: "#d97706",
  poor: "#dc2626",
};

const TIER_BG: Record<string, string> = {
  good: "#dcfce7",
  average: "#fef3c7",
  poor: "#fee2e2",
};

export default function RepCard({
  name, nameMl, role, constituency, constituencyMl, district,
  party, photoUrl, openIssues, totalIssues, resolvedIssues,
  resolutionRate, performanceTier, locale = "en",
}: RepCardProps) {
  const displayName = locale === "ml" && nameMl ? nameMl : name;
  const displayConstituency = locale === "ml" && constituencyMl ? constituencyMl : constituency;
  const roleLabel = ROLE_LABELS[role]?.[locale] || ROLE_LABELS[role]?.en || role;
  const tierColor = TIER_COLORS[performanceTier] || TIER_COLORS.average;
  const tierBg = TIER_BG[performanceTier] || TIER_BG.average;
  const ratePercent = Math.round(resolutionRate * 100);

  return (
    <article
      className="card"
      style={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 14,
        borderLeft: `4px solid ${tierColor}`,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#e2e8f0", display: "grid", placeItems: "center",
          fontSize: 22, fontWeight: 700, color: "#475569",
          overflow: "hidden",
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Info */}
      <div style={{ display: "grid", gap: 6 }}>
        <div>
          <strong style={{ fontSize: 15 }}>{displayName}</strong>
          {party && <span className="chip" style={{ marginLeft: 8, fontSize: 11 }}>{party}</span>}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {roleLabel} &middot; {displayConstituency}
          {district && <> &middot; {district}</>}
        </div>

        {/* Performance bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            flex: 1, height: 8, borderRadius: 4,
            background: "#e2e8f0", overflow: "hidden",
          }}>
            <div style={{
              width: `${ratePercent}%`, height: "100%",
              background: tierColor, borderRadius: 4,
              transition: "width 0.3s ease",
            }} />
          </div>
          <span style={{
            fontSize: 12, fontWeight: 600, color: tierColor,
            background: tierBg, padding: "2px 8px", borderRadius: 10,
          }}>
            {ratePercent}%
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          <span style={{ color: "#dc2626" }}>
            <strong>{openIssues}</strong> {locale === "ml" ? "തുറന്നത്" : "open"}
          </span>
          <span style={{ color: "#16a34a" }}>
            <strong>{resolvedIssues}</strong> {locale === "ml" ? "പരിഹരിച്ചത്" : "resolved"}
          </span>
          <span className="muted">
            <strong>{totalIssues}</strong> {locale === "ml" ? "ആകെ" : "total"}
          </span>
        </div>
      </div>
    </article>
  );
}
