import {
  PARTICIPANT_STATUS_OPTIONS,
  type ParticipantStatus,
} from "@/modules/participants/status";

export type ReportGroup = {
  status: ParticipantStatus;
  companyName: string | null;
  roomName: string | null;
  stakeName: string;
  shirtSize: string | null;
  sex: string | null;
  emailSent: boolean;
  hasEmail: boolean;
  total: number;
};

export function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function summarizeReports(groups: ReportGroup[]) {
  const statusCounts = Object.fromEntries(
    PARTICIPANT_STATUS_OPTIONS.map(({ value }) => [value, 0]),
  ) as Record<ParticipantStatus, number>;
  const shirts = new Map<string, number>();
  const sexes = new Map<string, number>();
  const stakes = new Map<string, { total: number; arrived: number }>();
  const companies = new Map<string, { total: number; arrived: number }>();
  let total = 0,
    active = 0,
    withoutCompany = 0,
    withoutRoom = 0,
    emailSent = 0,
    emailPending = 0,
    withoutEmail = 0;
  for (const group of groups) {
    const n = group.total;
    total += n;
    statusCounts[group.status] += n;
    if (group.status === "cancelled") continue;
    active += n;
    if (!group.companyName) withoutCompany += n;
    if (!group.roomName?.trim()) withoutRoom += n;
    if (group.emailSent) emailSent += n;
    else if (group.hasEmail) emailPending += n;
    else withoutEmail += n;
    const size = group.shirtSize?.trim().toUpperCase() || "Sin talla";
    shirts.set(size, (shirts.get(size) ?? 0) + n);
    const sex = group.sex?.trim() || "Sin especificar";
    sexes.set(sex, (sexes.get(sex) ?? 0) + n);
    for (const [map, key] of [
      [stakes, group.stakeName],
      [companies, group.companyName ?? "Sin compañía"],
    ] as const) {
      const row = map.get(key) ?? { total: 0, arrived: 0 };
      row.total += n;
      if (group.status === "arrived") row.arrived += n;
      map.set(key, row);
    }
  }
  const distributions = (map: Map<string, number>) =>
    Array.from(map, ([label, value]) => ({ label, value })).sort(
      (a, b) => b.value - a.value || a.label.localeCompare(b.label, "es"),
    );
  const attendance = (map: Map<string, { total: number; arrived: number }>) =>
    Array.from(map, ([label, counts]) => ({ label, ...counts })).sort(
      (a, b) =>
        b.total - a.total ||
        a.label.localeCompare(b.label, "es", { numeric: true }),
    );
  return {
    total,
    active,
    withoutCompany,
    withoutRoom,
    emailSent,
    emailPending,
    withoutEmail,
    statusCounts,
    shirts: distributions(shirts),
    sexes: distributions(sexes),
    stakes: attendance(stakes),
    companies: attendance(companies),
  };
}
