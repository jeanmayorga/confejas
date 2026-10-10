import { sql } from "drizzle-orm";

// A participant's stake comes from their ward; LEFT JOIN preserves attendees
// with no church unit, who must still be represented in the report total.
export const attendeeStakesQuery = sql`
  select s.id, coalesce(s.name, 'Sin estaca registrada') as name,
    count(*)::int as total
  from participants p
  left join wards w on w.id = p.ward_id
  left join stakes s on s.id = w.stake_id
  where p.final_attendance is true
  group by s.id, s.name
`;
