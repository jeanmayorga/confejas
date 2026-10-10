import { sql } from "drizzle-orm";

// A single statement gives every slide the same database snapshot. Only
// aggregate counts leave the server; participant identities are never selected.
export const finalReportQuery = sql`
  with grouped as (
    select extract(year from age(current_date, birth_date))::int as age,
      is_church_member as member, final_attendance as attended,
      company_id as "companyId", count(*)::int as total
    from participants
    group by 1, 2, 3, 4
  )
  select
    coalesce((select jsonb_agg(g) from grouped g), '[]'::jsonb) as groups,
    coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name)) from companies), '[]'::jsonb) as companies,
    (select jsonb_build_object(
      'total', count(*)::int,
      'arrived', count(*) filter (where arrived_at is not null)::int,
      'assigned', count(*) filter (where company_id is not null)::int
    ) from counselors) as counselors,
    current_timestamp::text as "asOf", current_date::text as "ageDate"
`;
