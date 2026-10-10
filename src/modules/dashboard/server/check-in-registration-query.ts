import { sql } from "drizzle-orm";
import { staffConferenceDays } from "../../itinerary/schedule";

// Reception (Recibir Estacas) starts on the staff arrival day, before the
// Friday public itinerary. Classify creation timestamps in Ecuador local time.
export const checkInDate = staffConferenceDays[0].date;
export const checkInRegistrationQuery = sql`
  select jsonb_build_object(
    'date', ${checkInDate}::text,
    'before', count(*) filter (where (created_at at time zone 'America/Guayaquil')::date < ${checkInDate}::date)::int,
    'onDay', count(*) filter (where (created_at at time zone 'America/Guayaquil')::date = ${checkInDate}::date)::int,
    'after', count(*) filter (where (created_at at time zone 'America/Guayaquil')::date > ${checkInDate}::date)::int
  ) as registrations
  from participants
  where final_attendance is true
`;
