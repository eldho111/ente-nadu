export const dynamic = "force-dynamic";

import { getPublicApiBase } from "@/lib/api";
import { getServerLocale } from "@/lib/server-locale";
import RepCard from "@/components/RepCard";

type LeaderboardEntry = {
  representative_id: string;
  name: string;
  name_ml: string | null;
  role: string;
  constituency_name: string;
  constituency_name_ml: string | null;
  district: string | null;
  party: string | null;
  photo_url: string | null;
  open_issues: number;
  total_issues: number;
  resolved_issues: number;
  resolution_rate: number;
  performance_tier: string;
};

type LeaderboardResponse = {
  items: LeaderboardEntry[];
  pagination: { total: number };
};

const TEXT = {
  en: {
    title: "Accountability Dashboard",
    subtitle: "Who is responsible for civic issues in your area? Track your elected representatives' performance.",
    filterAll: "All",
    filterMP: "MPs",
    filterMLA: "MLAs",
    filterCouncillor: "Councillors",
    noData: "No reports yet. Be the first to report a civic issue!",
    backToMap: "Back to map",
    comingSoon: "Live data — report issues to see real performance stats",
  },
  ml: {
    title: "ഉത്തരവാദിത്ത ഡാഷ്‌ബോര്‍ഡ്",
    subtitle: "നിങ്ങളുടെ പ്രദേശത്തെ നാഗരിക പ്രശ്നങ്ങള്‍ക്ക് ആരാണ് ഉത്തരവാദി? നിങ്ങളുടെ ജനപ്രതിനിധികളുടെ പ്രകടനം ട്രാക്ക് ചെയ്യുക.",
    filterAll: "എല്ലാം",
    filterMP: "എം.പി",
    filterMLA: "എം.എല്‍.എ",
    filterCouncillor: "കൗണ്‍സിലര്‍",
    noData: "ഇതുവരെ റിപ്പോര്‍ട്ടുകളില്ല. ഒരു പ്രശ്നം റിപ്പോര്‍ട്ട് ചെയ്യുന്ന ആദ്യ വ്യക്തിയാകൂ!",
    backToMap: "മാപ്പിലേക്ക് മടങ്ങുക",
    comingSoon: "തത്സമയ ഡാറ്റ — യഥാര്‍ത്ഥ പ്രകടന സ്ഥിതിവിവരക്കണക്കുകള്‍ കാണാന്‍ പ്രശ്നങ്ങള്‍ റിപ്പോര്‍ട്ട് ചെയ്യുക",
  },
  kn: {
    title: "Accountability Dashboard",
    subtitle: "Who is responsible for civic issues in your area?",
    filterAll: "All",
    filterMP: "MPs",
    filterMLA: "MLAs",
    filterCouncillor: "Councillors",
    noData: "No reports yet.",
    backToMap: "Back to map",
    comingSoon: "Live data updates",
  },
};

// Kerala MPs — shown as static fallback when API is offline
const KERALA_REPS: LeaderboardEntry[] = [
  { representative_id: "1", name: "Shashi Tharoor", name_ml: "ശശി തരൂര്‍", role: "mp", constituency_name: "Thiruvananthapuram", constituency_name_ml: "തിരുവനന്തപുരം", district: "Thiruvananthapuram", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "2", name: "Suresh Gopi", name_ml: "സുരേഷ് ഗോപി", role: "mp", constituency_name: "Thrissur", constituency_name_ml: "തൃശ്ശൂര്‍", district: "Thrissur", party: "BJP", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "3", name: "Priyanka Gandhi Vadra", name_ml: "പ്രിയങ്ക ഗാന്ധി വദ്ര", role: "mp", constituency_name: "Wayanad", constituency_name_ml: "വയനാട്", district: "Wayanad", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "4", name: "Hibi Eden", name_ml: "ഹിബി ഈഡന്‍", role: "mp", constituency_name: "Ernakulam", constituency_name_ml: "എറണാകുളം", district: "Ernakulam", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "5", name: "K. Sudhakaran", name_ml: "കെ. സുധാകരന്‍", role: "mp", constituency_name: "Kannur", constituency_name_ml: "കണ്ണൂര്‍", district: "Kannur", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "6", name: "M. K. Raghavan", name_ml: "എം.കെ. രാഘവന്‍", role: "mp", constituency_name: "Kozhikode", constituency_name_ml: "കോഴിക്കോട്", district: "Kozhikode", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "7", name: "K. C. Venugopal", name_ml: "കെ.സി. വേണുഗോപാല്‍", role: "mp", constituency_name: "Alappuzha", constituency_name_ml: "ആലപ്പുഴ", district: "Alappuzha", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "8", name: "N. K. Premachandran", name_ml: "എന്‍.കെ. പ്രേമചന്ദ്രന്‍", role: "mp", constituency_name: "Kollam", constituency_name_ml: "കൊല്ലം", district: "Kollam", party: "RSP", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "9", name: "K. Radhakrishnan", name_ml: "കെ. രാധാകൃഷ്ണന്‍", role: "mp", constituency_name: "Alathur", constituency_name_ml: "ആലത്തൂര്‍", district: "Palakkad", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "10", name: "Shafi Parambil", name_ml: "ഷാഫി പറമ്പില്‍", role: "mp", constituency_name: "Vatakara", constituency_name_ml: "വടകര", district: "Kozhikode", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "11", name: "Dean Kuriakose", name_ml: "ഡീന്‍ കുരിയാക്കോസ്", role: "mp", constituency_name: "Idukki", constituency_name_ml: "ഇടുക്കി", district: "Idukki", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "12", name: "V. K. Sreekandan", name_ml: "വി.കെ. ശ്രീകണ്ഠന്‍", role: "mp", constituency_name: "Palakkad", constituency_name_ml: "പാലക്കാട്", district: "Palakkad", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "13", name: "Benny Behanan", name_ml: "ബെന്നി ബഹനാന്‍", role: "mp", constituency_name: "Chalakudy", constituency_name_ml: "ചാലക്കുടി", district: "Thrissur", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "14", name: "Rajmohan Unnithan", name_ml: "രാജ്മോഹന്‍ ഉണ്ണിത്താന്‍", role: "mp", constituency_name: "Kasaragod", constituency_name_ml: "കാസര്‍ഗോഡ്", district: "Kasaragod", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "15", name: "E. T. Muhammed Basheer", name_ml: "ഇ.ടി. മുഹമ്മദ് ബഷീര്‍", role: "mp", constituency_name: "Malappuram", constituency_name_ml: "മലപ്പുറം", district: "Malappuram", party: "IUML", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "16", name: "M. P. Abdussamad Samadani", name_ml: "എം.പി. അബ്ദുസ്സമദ് സമദാനി", role: "mp", constituency_name: "Ponnani", constituency_name_ml: "പൊന്നാനി", district: "Malappuram", party: "IUML", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "17", name: "Kodikunnil Suresh", name_ml: "കൊടിക്കുന്നില്‍ സുരേഷ്", role: "mp", constituency_name: "Mavelikkara", constituency_name_ml: "മാവേലിക്കര", district: "Alappuzha", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "18", name: "Anto Antony", name_ml: "ആന്റോ ആന്റണി", role: "mp", constituency_name: "Pathanamthitta", constituency_name_ml: "പത്തനംതിട്ട", district: "Pathanamthitta", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "19", name: "Adoor Prakash", name_ml: "ആറ്റൂര്‍ പ്രകാശ്", role: "mp", constituency_name: "Attingal", constituency_name_ml: "ആറ്റിങ്ങല്‍", district: "Thiruvananthapuram", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "20", name: "K. Francis George", name_ml: "കെ. ഫ്രാന്‍സിസ് ജോര്‍ജ്", role: "mp", constituency_name: "Kottayam", constituency_name_ml: "കോട്ടയം", district: "Kottayam", party: "KC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  // Key MLAs (Chief Minister, Ministers, Opposition Leader, Speaker)
  { representative_id: "m1", name: "Pinarayi Vijayan", name_ml: null, role: "mla", constituency_name: "Dharmadam", constituency_name_ml: null, district: "Kannur", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m2", name: "V D Satheesan", name_ml: null, role: "mla", constituency_name: "Paravur", constituency_name_ml: null, district: "Ernakulam", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m3", name: "K K Shailaja", name_ml: null, role: "mla", constituency_name: "Mattannur", constituency_name_ml: null, district: "Kannur", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m4", name: "K N Balagopal", name_ml: null, role: "mla", constituency_name: "Kottarakkara", constituency_name_ml: null, district: "Kollam", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m5", name: "Ramesh Chennithala", name_ml: null, role: "mla", constituency_name: "Haripad", constituency_name_ml: null, district: "Alappuzha", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m6", name: "Veena George", name_ml: null, role: "mla", constituency_name: "Aranmula", constituency_name_ml: null, district: "Pathanamthitta", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m7", name: "P A Mohamed Riyas", name_ml: null, role: "mla", constituency_name: "Beypore", constituency_name_ml: null, district: "Kozhikode", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m8", name: "A N Shamseer", name_ml: null, role: "mla", constituency_name: "Thalassery", constituency_name_ml: null, district: "Kannur", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m9", name: "Chandy Oommen", name_ml: null, role: "mla", constituency_name: "Puthuppally", constituency_name_ml: null, district: "Kottayam", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m10", name: "V Sivankutty", name_ml: null, role: "mla", constituency_name: "Nemom", constituency_name_ml: null, district: "Thiruvananthapuram", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m11", name: "M M Mani", name_ml: null, role: "mla", constituency_name: "Udumbanchola", constituency_name_ml: null, district: "Idukki", party: "CPI(M)", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
  { representative_id: "m12", name: "K J Maxy", name_ml: null, role: "mla", constituency_name: "Kochi", constituency_name_ml: null, district: "Ernakulam", party: "INC", photo_url: null, open_issues: 0, total_issues: 0, resolved_issues: 0, resolution_rate: 0, performance_tier: "average" },
];

async function fetchLeaderboard(role?: string): Promise<LeaderboardResponse | null> {
  try {
    const base = getPublicApiBase();
    const params = new URLSearchParams({ page_size: "100" });
    if (role) params.set("role", role);
    const res = await fetch(`${base}/v1/accountability/leaderboard?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function AccountabilityPage({
  searchParams,
}: {
  searchParams: { role?: string; district?: string };
}) {
  const locale = getServerLocale();
  const text = TEXT[locale as keyof typeof TEXT] || TEXT.en;
  const roleFilter = searchParams.role || undefined;
  const data = await fetchLeaderboard(roleFilter);

  // Use API data if available, otherwise use static Kerala MP data
  let items = data?.items || [];
  let isStatic = false;
  if (items.length === 0) {
    isStatic = true;
    items = KERALA_REPS;
    if (roleFilter) {
      items = items.filter((i) => i.role === roleFilter);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: 0, fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
          background: "linear-gradient(135deg, #0f766e, #0d9488)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {text.title}
        </h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: "55ch", lineHeight: 1.6 }}>
          {text.subtitle}
        </p>
      </div>

      {/* Role filter chips */}
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { key: "", label: text.filterAll },
          { key: "mp", label: text.filterMP },
          { key: "mla", label: text.filterMLA },
          { key: "corporation_councillor", label: text.filterCouncillor },
        ].map((f) => {
          const isActive = roleFilter === f.key || (!roleFilter && !f.key);
          return (
            <a
              key={f.key}
              href={f.key ? `/accountability?role=${f.key}` : "/accountability"}
              style={{
                display: "inline-block", padding: "8px 18px", borderRadius: 999,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
                background: isActive ? "#0d9488" : "#fff",
                color: isActive ? "#fff" : "#0f766e",
                border: isActive ? "1.5px solid #0d9488" : "1.5px solid #e2e8f0",
                boxShadow: isActive ? "0 2px 8px rgba(13,148,136,0.3)" : "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
            >
              {f.label}
            </a>
          );
        })}
      </nav>

      {/* Static data banner */}
      {isStatic && (
        <div style={{
          padding: "10px 16px", borderRadius: 10, marginBottom: 16,
          background: "#fffbeb", border: "1px solid #fcd34d",
          fontSize: 13, color: "#92400e",
        }}>
          {text.comingSoon}
        </div>
      )}

      {/* Leaderboard grid */}
      {items.length > 0 ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {items.map((entry) => (
            <RepCard
              key={entry.representative_id}
              name={entry.name}
              nameMl={entry.name_ml}
              role={entry.role}
              constituency={entry.constituency_name}
              constituencyMl={entry.constituency_name_ml}
              district={entry.district}
              party={entry.party}
              photoUrl={entry.photo_url}
              openIssues={entry.open_issues}
              totalIssues={entry.total_issues}
              resolvedIssues={entry.resolved_issues}
              resolutionRate={entry.resolution_rate}
              performanceTier={entry.performance_tier}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <p className="muted">{text.noData}</p>
      )}

      <p style={{ marginTop: 24 }}>
        <a href="/" className="backLink">&larr; {text.backToMap}</a>
      </p>
    </div>
  );
}
