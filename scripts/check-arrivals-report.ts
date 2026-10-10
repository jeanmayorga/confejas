import "../env.config";
import { strict as assert } from "node:assert";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { checkInArrivalsQuery } from "../src/modules/dashboard/server/check-in-arrivals-query";

// All writes target a transaction-local temporary table, not real participants.
const q = neon(process.env.DATABASE_URL!);
const compiled = new PgDialect().sqlToQuery(checkInArrivalsQuery);
const results = await q.transaction([
  q`create temporary table participants (checked_in_at timestamptz, created_at timestamptz, final_attendance boolean) on commit drop`,
  q.query(compiled.sql, compiled.params),
  q`insert into participants values
    ('2026-10-08T04:59:59.999Z', '2026-10-08T15:00:00Z', true),
    ('2026-10-08T05:00:00Z', '2026-09-12T15:00:00Z', true),
    ('2026-10-09T04:59:59.999Z', '2026-09-12T15:00:00Z', true),
    ('2026-10-09T05:00:00Z', '2026-10-08T15:00:00Z', true),
    (null, '2026-10-08T15:00:00Z', true),
    (null, '2026-09-12T15:00:00Z', true),
    ('2026-10-08T15:00:00Z', null, false),
    ('2026-10-09T15:00:00Z', null, false),
    (null, null, false),
    ('2026-10-08T15:00:00Z', null, null),
    ('2026-10-09T15:00:00Z', null, null),
    (null, null, null)`,
  q.query(compiled.sql, compiled.params),
]);
assert.deepEqual(results[1][0].check_ins, {
  date: "2026-10-08",
  onDay: 0,
  otherDays: 0,
  notRecorded: 0,
});
assert.deepEqual(results[3][0].check_ins, {
  date: "2026-10-08",
  onDay: 2,
  otherDays: 2,
  notRecorded: 2,
});
console.log(
  "PASS: empty input, Ecuador date boundaries, missing check-in and attendees only and independence from registration dates.",
);
