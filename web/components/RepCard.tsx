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

const TIER_LABELS: Record<string, Record<string, string>> = {
  good: { en: "Good Performer", ml: "നല്ല പ്രകടനം" },
  average: { en: "Average", ml: "ശരാശരി" },
  poor: { en: "Needs Improvement", ml: "മെച്ചപ്പെടേണ്ടതുണ്ട്" },
};

const PARTY_COLORS: Record<string, string> = {
  INC: "#0078D4",
  BJP: "#FF6B00",
  "CPI(M)": "#cc0000",
  IUML: "#008000",
  RSP: "#660099",
  KC: "#006633",
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
  const tierLabel = TIER_LABELS[performanceTier]?.[locale] || TIER_LABELS[performanceTier]?.en || "Average";
  const ratePercent = Math.round(resolutionRate * 100);
  const partyColor = party ? (PARTY_COLORS[party] || "#64748b") : "#64748b";

  return (
    <article
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        cursor: "default",
      }}
    >
      {/* Colored top border by performance */}
      <div style={{ height: 4, background: tierColor }} />

      <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 14 }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: `linear-gradient(135deg, ${partyColor}22, ${partyColor}44)`,
          display: "grid", placeItems: "center",
          fontSize: 20, fontWeight: 700, color: partyColor,
          overflow: "hidden", border: `2px solid ${partyColor}33`,
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          {/* Name + Party */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15, lineHeight: 1.2 }}>{displayName}</strong>
            {party && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: `${partyColor}15`, color: partyColor, border: `1px solid ${partyColor}30`,
                letterSpacing: "0.03em",
              }}>
                {party}
              </span>
            )}
          </div>

          {/* Role + Constituency */}
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {roleLabel} &middot; {displayConstituency}
            {district && <> &middot; {district}</>}
          </div>

          {/* Performance bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              flex: 1, height: 6, borderRadius: 4,
              background: "#e2e8f0", overflow: "hidden",
            }}>
              <div style={{
                width: `${ratePercent}%`, height: "100%",
                background: `linear-gradient(90deg, ${tierColor}cc, ${tierColor})`,
                borderRadius: 4, transition: "width 0.4s ease",
                minWidth: ratePercent > 0 ? 4 : 0,
              }} />
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: tierColor,
              background: tierBg, padding: "2px 8px", borderRadius: 10,
              whiteSpace: "nowrap",
            }}>
              {ratePercent}%
            </span>
          </div>

          {/* Tier label */}
          <div style={{ fontSize: 11, fontWeight: 600, color: tierColor }}>
            {tierLabel}
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
            <span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", display: "inline-block", marginRight: 4 }} />
              <strong>{openIssues}</strong> <span style={{ color: "#94a3b8" }}>{locale === "ml" ? "തുറന്നത്" : "open"}</span>
            </span>
            <span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block", marginRight: 4 }} />
              <strong>{resolvedIssues}</strong> <span style={{ color: "#94a3b8" }}>{locale === "ml" ? "പരിഹരിച്ചത്" : "resolved"}</span>
            </span>
            <span style={{ color: "#94a3b8" }}>
              <strong style={{ color: "#475569" }}>{totalIssues}</strong> {locale === "ml" ? "ആകെ" : "total"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
