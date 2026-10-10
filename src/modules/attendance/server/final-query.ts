import { sql } from "drizzle-orm";
import type { AttendanceMutation } from "../offline/types";

export function finalAttendanceQuery(input: AttendanceMutation) {
  // Compare-and-swap makes retries idempotent and rejects delayed stale requests.
  return sql`
    update participants
    set final_attendance = ${input.attended},
        updated_at = case when final_attendance_revision = ${input.mutationId}::uuid
          then updated_at else now() end,
        final_attendance_revision = ${input.mutationId}::uuid
    where id = ${input.participantId}::uuid and company_id = ${input.companyId}::uuid
      and final_attendance_revision in (${input.expectedRevision}::uuid, ${input.mutationId}::uuid)
    returning final_attendance as attended, final_attendance_revision as revision,
      updated_at as "updatedAt"
  `;
}
