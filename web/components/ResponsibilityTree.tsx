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

const KERALA_TREE: Record<string, TreeNode> = {
  pothole: {
    label: "Pothole / Road Damage", icon: "\u{1F6A7}", color: "#dc2626",
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
    label: "Waterlogging / Drainage", icon: "\u{1F30A}", color: "#2563eb",
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
    label: "Garbage / Waste", icon: "\u{1F5D1}", color: "#65a30d",
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
    label: "Streetlight / Electricity", icon: "\u{1F4A1}", color: "#ca8a04",
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
    label: "Canal Blockage", icon: "\u{1F30A}", color: "#0891b2",
    children: [
      { label: "Irrigation Department", sublabel: "Canal maintenance" },
      { label: "Kerala Water Authority", contact: "1916cckwa@gmail.com", phone: "1916" },
      { label: "Local Body", sublabel: "Panchayat / Municipality", contact: "splsecy.lsgd@kerala.gov.in" },
    ]
  },
  other: {
    label: "Other Civic Issues", icon: "\u{1F4CB}", color: "#64748b",
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
          width: 2, background: "#e2e8f0",
        }} />
      )}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "8px 0", position: "relative",
      }}>
        {depth > 0 && (
          <>
            <div style={{
              position: "absolute", left: 8, top: "50%", width: 12, height: 2,
              background: "#e2e8f0",
            }} />
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: node.color || "#0d9488", border: "2px solid #fff",
              boxShadow: "0 0 0 2px #e2e8f0", flexShrink: 0,
              marginLeft: 3, marginTop: 4, position: "relative", zIndex: 1,
            }} />
          </>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {node.icon && <span style={{ fontSize: 16 }}>{node.icon}</span>}
            <strong style={{ fontSize: depth === 0 ? 15 : 13, color: "#0f172a" }}>
              {node.label}
            </strong>
          </div>
          {node.sublabel && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{node.sublabel}</div>
          )}
          {(node.contact || node.phone) && (
            <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
              {node.contact && (
                <a href={`mailto:${node.contact}`} style={{
                  fontSize: 11, color: "#0d9488", textDecoration: "none", fontWeight: 600,
                  background: "#ecfdf5", padding: "1px 8px", borderRadius: 99,
                }}>
                  {node.contact}
                </a>
              )}
              {node.phone && (
                <a href={`tel:${node.phone}`} style={{
                  fontSize: 11, color: "#7c3aed", textDecoration: "none", fontWeight: 600,
                  background: "#f5f3ff", padding: "1px 8px", borderRadius: 99,
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
      <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#0f172a" }}>
        {locale === "ml" ? "ആരാണ് ഉത്തരവാദി?" : "Who is responsible?"}
      </h3>
      <TreeBranch node={activeTree} />
      <div style={{
        marginTop: 12, padding: "8px 12px", borderRadius: 8,
        background: "#fffbeb", border: "1px solid #fcd34d",
        fontSize: 11, color: "#92400e", lineHeight: 1.5,
      }}>
        {locale === "ml"
          ? "പ്രശ്നം പരിഹരിക്കപ്പെടുന്നില്ലെങ്കില്‍, നിങ്ങളുടെ MLA-ക്ക് എസ്കലേറ്റ് ചെയ്യുക."
          : "If not resolved, escalate to your MLA. Use the Accountability page to track their performance."
        }
      </div>
    </section>
  );
}
