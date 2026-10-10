import "../env.config";
import { strict as assert } from "node:assert";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { checkInRegistrationQuery } from "../src/modules/dashboard/server/check-in-registration-query";

// Temporary tables shadow the real participants table for this transaction.
// No conference records are changed by this boundary check.
const q = neon(process.env.DATABASE_URL!);
const compiled = new PgDialect().sqlToQuery(checkInRegistrationQuery);
const results = await q.transaction([
  q`create temporary table participants (created_at timestamptz not null, checked_in_at timestamptz, final_attendance boolean) on commit drop`,
  q.query(compiled.sql, compiled.params),
  q`insert into participants values
    ('2026-10-07T10:00:00Z', '2026-10-08T23:00:00Z', true),
    ('2026-10-08T04:59:59.999Z', '2026-10-08T23:00:00Z', true),
    ('2026-10-08T05:00:00Z', null, true),
    ('2026-10-09T04:59:59.999Z', '2026-10-09T05:30:00Z', true),
    ('2026-10-09T05:00:00Z', null, true),
    ('2026-10-07T10:00:00Z', null, false),
    ('2026-10-08T15:00:00Z', null, false),
    ('2026-10-09T15:00:00Z', null, false),
    ('2026-10-07T10:00:00Z', null, null),
    ('2026-10-08T15:00:00Z', null, null),
    ('2026-10-09T15:00:00Z', null, null)`,
  q.query(compiled.sql, compiled.params),
]);
assert.deepEqual(results[1][0].registrations, {
  date: "2026-10-08",
  before: 0,
  onDay: 0,
  after: 0,
});
assert.deepEqual(results[3][0].registrations, {
  date: "2026-10-08",
  before: 2,
  onDay: 2,
  after: 1,
});
console.log(
  "PASS: empty data, Ecuador midnight boundaries, attendees only, and creation dates independent of arrival dates.",
);
