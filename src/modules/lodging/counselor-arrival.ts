import { sql } from "drizzle-orm";

export function counselorArrivalQuery(counselorId: string, arrived: boolean) {
  return sql`
    update counselors
    set arrived_at = case when ${arrived}::boolean
      then coalesce(arrived_at, now()) else null end,
        updated_at = now()
    where id = ${counselorId}::uuid
    returning id, arrived_at
  `;
}
