import { sql } from "drizzle-orm";
import { checkInDate } from "./check-in-registration-query";

// The stored arrival timestamp is shared by QR, code, name search and manual
// arrival confirmation. It is not a scan event log or proof of QR usage.
export const checkInArrivalsQuery = sql`
  select jsonb_build_object(
    'date', ${checkInDate}::text,
    'onDay', count(*) filter (where (checked_in_at at time zone 'America/Guayaquil')::date = ${checkInDate}::date)::int,
    'otherDays', count(*) filter (where (checked_in_at at time zone 'America/Guayaquil')::date <> ${checkInDate}::date)::int,
    'notRecorded', count(*) filter (where checked_in_at is null)::int
  ) as check_ins
  from participants
`;
