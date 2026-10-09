import type { AttendanceInput, AttendanceParticipant } from "../attendance";

export type OfflineParticipant = AttendanceParticipant & {
  companyId: string;
  revision: string | null;
};
export type AttendanceSnapshot = {
  owner: { id: string; name: string };
  date: string;
  downloadedAt: string;
  companies: { id: string; name: string }[];
  participants: OfflineParticipant[];
};
export type ServerAttendance = {
  present: boolean | null;
  revision: string | null;
  companyId: string | null;
};
export type PendingAttendance = AttendanceInput & {
  id: string;
  sequence?: number;
  ownerId: string;
  expectedRevision: string | null;
  participantName: string;
  problem?: { message: string; current: ServerAttendance | null };
};
export function attendanceKey(item: { date: string; participantId: string }) {
  return `${item.date}:${item.participantId}`;
}
export function presentFor(status: AttendanceInput["status"]) {
  return status === "unrecorded" ? null : status === "present";
}
