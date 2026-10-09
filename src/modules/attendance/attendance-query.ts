import { sql } from "drizzle-orm";
import type { AttendanceInput } from "./attendance";

export function attendanceUpsertQuery(
  input: AttendanceInput,
  staffUserId: string,
) {
  const present =
    input.status === "unrecorded" ? null : input.status === "present";
  // Lock the participant while checking membership so a concurrent move cannot
  // save attendance against an out-of-date company roster.
  return sql`
    with eligible as (
      select id from participants
      where id = ${input.participantId}::uuid and company_id = ${input.companyId}::uuid
      for share
    )
    insert into participant_attendance (participant_id, attendance_date, present, recorded_by_id, updated_at)
    select id, ${input.date}::date, ${present}::boolean, ${staffUserId}, now() from eligible
    on conflict (participant_id, attendance_date) do update
    set present = excluded.present, recorded_by_id = excluded.recorded_by_id, updated_at = excluded.updated_at
    returning participant_id
  `;
}
