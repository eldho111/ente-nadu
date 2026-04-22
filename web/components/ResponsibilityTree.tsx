"use client";

type TreeNode = {
  label: string;
  sublabel?: string;
  contact?: string;
  phone?: string;
  children?: TreeNode[];
  color?: string;
  icon?: string;
};

// Category branch colors map onto the dashboard palette rather than
// bootstrap-primary hexes. All options are cycled from the same three
// accents (sage teal, ochre gold, muted terracotta) so the tree stays
// visually coherent across categories.
const C_SAGE = "var(--accent)";
const C_GOLD = "var(--gold)";
const C_ALARM = "var(--alarm)";

const KERALA_TREE: Record<string, TreeNode> = {
  pothole: {
    label: "Pothole / Road Damage", icon: "\u{1F6A7}", color: C_ALARM,
    children: [
      { label: "Local Body (Panchayat / Municipality / Corporation)", sublabel: "Local roads", contact: "splsecy.lsgd@kerala.gov.in",
        children: [
          { label: "Ward Councillor / Member", sublabel: "Your elected ward representative" },
          { label: "Panchayat President / Municipal Chair", sublabel: "Head of local body" },
        ]
      },
      { label: "PWD Kerala", sublabel: "State highways & major roads", contact: "eeit.pwd@kerala.gov.in",
        children: [
          { label: "MLA", sublabel: "Your constituency MLA" },
          { label: "MP", sublabel: "Your parliamentary MP" },
        ]
      },
    ]
  },
  waterlogging: {
    label: "Waterlogging / Drainage", icon: "\u{1F30A}", color: C_SAGE,
    children: [
      { label: "Kerala Water Authority (KWA)", sublabel: "Water & drainage", contact: "1916cckwa@gmail.com", phone: "1916",
        children: [
          { label: "Local Body", sublabel: "Panchayat / Municipality" },
          { label: "MLA", sublabel: "For escalation" },
        ]
      },
    ]
  },
  garbage_dumping: {
    label: "Garbage / Waste", icon: "\u{1F5D1}", color: C_SAGE,
    children: [
      { label: "Suchitwa Mission", sublabel: "Kerala waste management body", contact: "splsecy.lsgd@kerala.gov.in",
        children: [
          { label: "Local Body", sublabel: "Your panchayat/municipality handles collection" },
          { label: "Health Inspector", sublabel: "Local health officer" },
        ]
      },
    ]
  },
  streetlight_outage: {
    label: "Streetlight / Electricity", icon: "\u{1F4A1}", color: C_GOLD,
    children: [
      { label: "KSEB (Kerala State Electricity Board)", sublabel: "Electricity supply & streetlights", contact: "ccc@kseb.in", phone: "1912",
        children: [
          { label: "Section Office", sublabel: "Your nearest KSEB section" },
          { label: "Local Body", sublabel: "For streetlight maintenance" },
        ]
      },
    ]
  },
  canal_blockage: {
    label: "Canal Blockage", icon: "\u{1F30A}", color: C_SAGE,
    children: [
      { label: "Irrigation Department", sublabel: "Canal maintenance" },
      { label: "Kerala Water Authority", contact: "1916cckwa@gmail.com", phone: "1916" },
      { label: "Local Body", sublabel: "Panchayat / Municipality", contact: "splsecy.lsgd@kerala.gov.in" },
    ]
  },
  other: {
    label: "Other Civic Issues", icon: "\u{1F4CB}", color: "var(--ink-muted)",
    children: [
      { label: "LSGD (Local Self Government Dept)", sublabel: "Overall civic governance", contact: "splsecy.lsgd@kerala.gov.in",
        children: [
          { label: "Local Body", sublabel: "First point of contact" },
          { label: "MLA", sublabel: "For escalation" },
          { label: "Minister LSGD", sublabel: "M B Rajesh", contact: "min.lsgd@kerala.gov.in" },
        ]
      },
    ]
  },
};

function TreeBranch({ node, depth = 0, isLast = false }: { node: TreeNode; depth?: number; isLast?: boolean }) {
  return (
    <div style={{ paddingLeft: depth > 0 ? 20 : 0, position: "relative" }}>
      {depth > 0 && (
        <div style={{
          position: "absolute", left: 8, top: 0, bottom: isLast ? "50%" : 0,
          width: 1, background: "var(--border)",
        }} />
      )}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "8px 0", position: "relative",
      }}>
        {depth > 0 && (
          <>
            <div style={{
              position: "absolute", left: 8, top: "50%", width: 12, height: 1,
              background: "var(--border)",
            }} />
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: node.color || "var(--accent)",
              boxShadow: "0 0 0 2px var(--bg-surface)",
              flexShrink: 0,
              marginLeft: 4, marginTop: 5, position: "relative", zIndex: 1,
            }} />
          </>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {node.icon && <span style={{ fontSize: 15, opacity: 0.85 }}>{node.icon}</span>}
            <strong style={{ fontSize: depth === 0 ? 14 : 13, color: "var(--ink-0)", fontWeight: 600, letterSpacing: "0.01em" }}>
              {node.label}
            </strong>
          </div>
          {node.sublabel && (
            <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2, letterSpacing: "0.02em" }}>{node.sublabel}</div>
          )}
          {(node.contact || node.phone) && (
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              {node.contact && (
                <a href={`mailto:${node.contact}`} style={{
                  fontSize: 10, color: "var(--accent)", textDecoration: "none", fontWeight: 600,
                  background: "var(--accent-soft)",
                  padding: "2px 8px", borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  letterSpacing: "0.02em",
                  fontFamily: "var(--font-mono)",
                }}>
                  {node.contact}
                </a>
              )}
              {node.phone && (
                <a href={`tel:${node.phone}`} style={{
                  fontSize: 10, color: "var(--gold)", textDecoration: "none", fontWeight: 600,
                  background: "var(--gold-soft)",
                  padding: "2px 8px", borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  letterSpacing: "0.02em",
                  fontFamily: "var(--font-mono)",
                }}>
                  {node.phone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {node.children?.map((child, i) => (
        <TreeBranch
          key={child.label}
          node={{ ...child, color: node.color || child.color }}
          depth={depth + 1}
          isLast={i === (node.children?.length ?? 0) - 1}
        />
      ))}
    </div>
  );
}

type Props = {
  category?: string;
  locale?: string;
};

export default function ResponsibilityTree({ category, locale = "en" }: Props) {
  const tree = category && KERALA_TREE[category] ? KERALA_TREE[category] : null;
  const defaultTree = KERALA_TREE.other;

  const activeTree = tree || defaultTree;

  return (
    <section className="card" style={{ padding: 16 }}>
      <h3 style={{
        margin: "0 0 12px",
        fontSize: 10,
        color: "var(--ink-0)",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}>
        {locale === "ml" ? "ഉത്തരവാദി · Who is responsible" : "Who is responsible"}
      </h3>
      <TreeBranch node={activeTree} />
      <div style={{
        marginTop: 12,
        padding: "8px 12px",
        borderRadius: "var(--r-sm)",
        background: "var(--gold-soft)",
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--gold)",
        fontSize: 11,
        color: "var(--ink-1)",
        lineHeight: 1.55,
      }}>
        {locale === "ml"
          ? "പ്രശ്നം പരിഹരിക്കപ്പെടുന്നില്ലെങ്കില്‍, നിങ്ങളുടെ MLA-ക്ക് എസ്കലേറ്റ് ചെയ്യുക."
          : "If not resolved, escalate to your MLA. Use the Accountability page to track their performance."
        }
      </div>
    </section>
  );
}
