// Matches the Hexcarb palette in globals.css. These hex values are used
// where we need a literal color (e.g. status-colored map marker, inline
// style on a server-rendered tag). For theme-aware places prefer the CSS
// variables --alarm / --warn / --gold / --ok / --ink-muted / --accent.
export const STATUS_COLORS: Record<string, string> = {
  open: "#d15e6a",          // muted terracotta (alarm)
  acknowledged: "#568878",  // sage teal — "being handled"
  in_progress: "#568878",   // sage teal — "being handled"
  fixed: "#b79057",         // warm ochre — "resolved" = premium gold
  rejected: "#6c7078",      // muted ink
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  fixed: "Fixed",
  rejected: "Rejected",
};

export const CATEGORY_ICONS: Record<string, string> = {
  pothole: "\u{1F6A7}",
  waterlogging: "\u{1F30A}",
  garbage_dumping: "\u{1F5D1}",
  streetlight_outage: "\u{1F4A1}",
  traffic_hotspot: "\u{1F6A6}",
  illegal_parking: "\u{1F697}",
  footpath_obstruction: "\u{1F6B6}",
  signal_malfunction: "\u{26A0}",
  open_manhole: "\u{1F573}",
  construction_debris: "\u{1F3D7}",
  canal_blockage: "\u{1F30A}",
  stray_animal_menace: "\u{1F415}",
  tree_fall_risk: "\u{1F333}",
  flood_drainage: "\u{1F4A7}",
  public_toilet: "\u{1F6BB}",
  other: "\u{1F4CB}",
};

export const CATEGORY_LABELS: Record<string, string> = {
  pothole: "Pothole",
  waterlogging: "Waterlogging",
  garbage_dumping: "Garbage Dumping",
  streetlight_outage: "Streetlight Outage",
  traffic_hotspot: "Traffic Hotspot",
  illegal_parking: "Illegal Parking",
  footpath_obstruction: "Footpath Obstruction",
  signal_malfunction: "Signal Malfunction",
  open_manhole: "Open Manhole",
  construction_debris: "Construction Debris",
  canal_blockage: "Canal Blockage",
  stray_animal_menace: "Stray Animal Menace",
  tree_fall_risk: "Tree Fall Risk",
  flood_drainage: "Flood Drainage",
  public_toilet: "Public Toilet Issue",
  other: "Other Issue",
};

export const EVENT_LABELS: Record<string, string> = {
  "report.created": "Report submitted",
  "report.status.updated": "Status changed",
  "report.status.acknowledged": "Acknowledged by authority",
  "report.status.in_progress": "Work in progress",
  "report.status.fixed": "Marked as fixed",
  "report.status.rejected": "Report rejected",
  "report.claimed": "Claimed by official",
  "report.resolution_proof": "Resolution proof added",
  "report.moderation.flagged": "Flagged for review",
  "report.moderation.cleared": "Moderation cleared",
  "report.notify.email": "Email notification sent",
  "report.notify.whatsapp": "WhatsApp notification sent",
  "report.flagged": "Flagged for review",
  "report.escalated_to_representative": "Escalated to elected representative",
  "report.classified": "AI classification completed",
  "report.clustered": "Linked to issue cluster",
  "report.routed": "Routed to department",
  "report.checkin": "Citizen check-in",
  "report.classification.requested": "Classification requested",
};
