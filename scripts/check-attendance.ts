import "../env.config";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { attendanceUpsertQuery } from "../src/modules/attendance/attendance-query";
import type { AttendanceStatus } from "../src/modules/attendance/attendance";

// Exercise the real migration and mutation in transaction-local temporary tables.
// No production participant, user, or attendance data is changed.
const q = neon(process.env.DATABASE_URL!);
const dialect = new PgDialect();
const participantId = "10000000-0000-4000-8000-000000000001";
const otherId = "10000000-0000-4000-8000-000000000002";
const companyId = "20000000-0000-4000-8000-000000000001";
const otherCompanyId = "20000000-0000-4000-8000-000000000002";
function save(
  date: string,
  status: AttendanceStatus,
  company = companyId,
  participant = participantId,
) {
  const query = dialect.sqlToQuery(
    attendanceUpsertQuery(
      { participantId: participant, companyId: company, date, status },
      "test-staff",
    ),
  );
  return q.query(query.sql, query.params);
}
const migration = (
  await readFile(
    new URL("../drizzle/0025_massive_katie_power.sql", import.meta.url),
    "utf8",
  )
)
  .replace(
    'CREATE TABLE "participant_attendance"',
    'CREATE TEMPORARY TABLE "participant_attendance"',
  )
  .replaceAll('"public".', '"pg_temp".');
const results = await q.transaction([
  q`create temporary table participants (id uuid primary key, company_id uuid, checked_in_at timestamptz) on commit drop`,
  q`create temporary table "user" (id text primary key) on commit drop`,
  q`insert into "user" values ('test-staff')`,
  q`insert into participants values (${participantId}::uuid, ${companyId}::uuid, null), (${otherId}::uuid, ${otherCompanyId}::uuid, null)`,
  ...migration
    .split("--> statement-breakpoint")
    .filter((part) => part.trim())
    .map((part) => q.query(part)),
  q`alter table participant_attendance add column revision uuid not null default gen_random_uuid()`,
  save("2026-10-09", "present"),
  save("2026-10-09", "present"),
  save("2026-10-10", "absent"),
  q`select attendance_date::text as day, present, recorded_by_id from participant_attendance order by attendance_date`,
  save("2026-10-09", "absent"),
  q`select present from participant_attendance where attendance_date = '2026-10-09'`,
  save("2026-10-09", "unrecorded"),
  q`select present from participant_attendance where attendance_date = '2026-10-09'`,
  save("2026-10-09", "present", otherCompanyId),
  save("2026-10-09", "present", companyId, otherId),
  q`select count(*)::int as total from participant_attendance`,
  q`select checked_in_at from participants`,
  q`delete from participants where id = ${participantId}::uuid`,
  q`select count(*)::int as total from participant_attendance`,
  q`drop table participant_attendance`,
]);
// Four setup statements, four original migration statements and the revision column precede the assertions.
assert.equal(results[9].length, 1);
assert.equal(results[10].length, 1);
assert.deepEqual(results[12], [
  { day: "2026-10-09", present: true, recorded_by_id: "test-staff" },
  { day: "2026-10-10", present: false, recorded_by_id: "test-staff" },
]);
assert.equal(results[14][0].present, false);
assert.equal(results[16][0].present, null);
assert.equal(results[17].length, 0);
assert.equal(results[18].length, 0);
assert.equal(results[19][0].total, 2);
assert.ok(results[20].every((row) => row.checked_in_at === null));
assert.equal(results[22][0].total, 0);
console.log(
  "PASS: migration, daily persistence, idempotent writes, corrections, unrecorded reset, company guard, audit user, independent check-in, participant deletion.",
);
