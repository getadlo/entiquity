export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const ENTITY_TYPES: Record<string, string> = {
  llc: "LLC", corporation: "Corporation", lp: "LP", llp: "LLP",
  nonprofit: "Nonprofit", trust: "Trust", partnership: "Partnership",
  foreign_entity: "Foreign entity", other: "Other",
};

export const ENTITY_STATUSES: Record<string, string> = {
  active: "Active", dissolved: "Dissolved", pending: "Pending",
  inactive: "Inactive", withdrawn: "Withdrawn", suspended: "Suspended", unknown: "Unknown",
};

export const STATUS_STYLES: Record<string, string> = {
  active: "bg-accent-soft text-accent",
  pending: "bg-amber-50 text-warn",
  suspended: "bg-red-50 text-danger",
  overdue: "bg-red-50 text-danger",
  dissolved: "bg-gray-100 text-ink-faint",
  inactive: "bg-gray-100 text-ink-faint",
  withdrawn: "bg-gray-100 text-ink-faint",
  unknown: "bg-gray-100 text-ink-faint",
};

export const TASK_TYPES: Record<string, string> = {
  annual_report: "Annual report", franchise_tax: "Franchise tax",
  ra_renewal: "Registered agent renewal", foreign_qualification: "Foreign qualification",
  board_meeting: "Board meeting", ownership_update: "Ownership update", custom: "Custom",
};

export const TASK_STATUSES: Record<string, string> = {
  not_started: "Not started", in_progress: "In progress",
  waiting_on_client: "Waiting on client", filed: "Filed",
  completed: "Completed", overdue: "Overdue",
};

export const TASK_STATUS_STYLES: Record<string, string> = {
  not_started: "bg-gray-100 text-ink-soft",
  in_progress: "bg-blue-50 text-blue-800",
  waiting_on_client: "bg-amber-50 text-warn",
  filed: "bg-accent-soft text-accent",
  completed: "bg-accent-soft text-accent",
  overdue: "bg-red-50 text-danger",
};

export const DOC_CATEGORIES: Record<string, string> = {
  formation: "Formation documents", operating_agreement: "Operating agreements",
  bylaws: "Bylaws", annual_report: "Annual reports", tax: "Tax documents",
  board_resolution: "Board resolutions", written_consent: "Written consents",
  ownership: "Ownership documents", state_filing: "State filings",
  registered_agent: "Registered agent documents", other: "Other",
};

export const RESOLUTION_TYPES: Record<string, string> = {
  board_resolution: "Board resolution", written_consent: "Written consent",
  member_consent: "Member consent", shareholder_consent: "Shareholder consent",
  officer_appointment: "Officer appointment", annual_meeting_minutes: "Annual meeting minutes",
  banking_resolution: "Banking resolution", corporate_authorization: "Corporate authorization",
  secretary_certificate: "Secretary certificate",
};

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function daysUntil(d: string) {
  const diff = new Date(d + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(diff / 86400000);
}

export function fmtBytes(n?: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
