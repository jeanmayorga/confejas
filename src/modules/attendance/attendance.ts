export type AttendanceStatus = "present" | "absent" | "unrecorded";

export const attendanceLabels: Record<AttendanceStatus, string> = {
  present: "Llegó",
  absent: "No llegó",
  unrecorded: "Sin registrar",
};

export function isAttendanceDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "0001-01-01"
  )
    return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function getAttendanceToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return value === "present" || value === "absent" || value === "unrecorded";
}

export type AttendanceInput = {
  participantId: string;
  companyId: string;
  date: string;
  status: AttendanceStatus;
};

export type AttendanceParticipant = {
  id: string;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  wardName: string;
  present: boolean | null;
};

export type AttendanceCompany = {
  id: string;
  name: string;
  total: number;
  present: number;
  absent: number;
};
