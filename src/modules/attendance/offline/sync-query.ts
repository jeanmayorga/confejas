import { sql } from "drizzle-orm";
import { presentFor, type PendingAttendance } from "./types";

export function offlineAttendanceQuery(
  input: PendingAttendance,
  staffUserId: string,
) {
  return sql`
    with eligible as (
      select id from participants where id = ${input.participantId}::uuid
      and company_id = ${input.companyId}::uuid for share
    )
    insert into participant_attendance (participant_id, attendance_date, present, recorded_by_id, updated_at, revision)
    select id, ${input.date}::date, ${presentFor(input.status)}::boolean, ${staffUserId}, now(), ${input.id}::uuid
    from eligible where ${input.expectedRevision}::uuid is null or exists (
      select 1 from participant_attendance where participant_id = ${input.participantId}::uuid and attendance_date = ${input.date}::date
    )
    on conflict (participant_id, attendance_date) do update
    set present = excluded.present, recorded_by_id = excluded.recorded_by_id,
        updated_at = excluded.updated_at, revision = excluded.revision
    where participant_attendance.revision = ${input.expectedRevision}::uuid
    returning revision
  `;
}
