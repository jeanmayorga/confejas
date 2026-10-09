import type { Metadata } from "next";
import {
  getAttendanceToday,
  isAttendanceDate,
} from "@/modules/attendance/attendance";
import { AttendanceBoard } from "@/modules/attendance/components/attendance-board.client";
import { getAttendancePage } from "@/modules/attendance/server/queries";

export const metadata: Metadata = { title: "Asistencia | Confejas" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; company?: string }>;
}) {
  const params = await searchParams;
  const date = isAttendanceDate(params.date)
    ? params.date
    : getAttendanceToday();
  const data = await getAttendancePage(date, params.company);
  return (
    <AttendanceBoard key={`${date}:${data.companyId}`} date={date} {...data} />
  );
}
