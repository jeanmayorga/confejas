import "../env.config";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { offlineAttendanceQuery } from "../src/modules/attendance/offline/sync-query";
import { attendanceUpsertQuery } from "../src/modules/attendance/attendance-query";
import type { PendingAttendance } from "../src/modules/attendance/offline/types";

const q = neon(process.env.DATABASE_URL!);
const dialect = new PgDialect();
const participantId = crypto.randomUUID();
const companyId = crypto.randomUUID();
const ids = [
  crypto.randomUUID(),
  crypto.randomUUID(),
  crypto.randomUUID(),
  crypto.randomUUID(),
];
const base: PendingAttendance = {
  id: ids[0],
  ownerId: "staff",
  expectedRevision: null,
  participantId,
  companyId,
  date: "2026-10-09",
  status: "present",
  participantName: "Test",
};
function operation(overrides: Partial<PendingAttendance> = {}) {
  const query = dialect.sqlToQuery(
    offlineAttendanceQuery({ ...base, ...overrides }, "staff"),
  );
  return q.query(query.sql, query.params);
}
const legacy = dialect.sqlToQuery(
  attendanceUpsertQuery({ ...base, status: "absent" }, "staff"),
);
const migration = await readFile(
  new URL("../drizzle/0026_common_guardsmen.sql", import.meta.url),
  "utf8",
);
const result = await q.transaction([
  q`create temporary table participants (id uuid primary key, company_id uuid) on commit drop`,
  q`create temporary table participant_attendance (participant_id uuid not null, attendance_date date not null, present boolean, recorded_by_id text, updated_at timestamptz, primary key(participant_id, attendance_date)) on commit drop`,
  q.query(migration),
  q`insert into participants values (${participantId}::uuid, ${companyId}::uuid)`,
  operation(),
  operation(), // Retry must leave the revision intact; API recognizes the same operation.
  operation({ id: ids[1], expectedRevision: null, status: "absent" }), // Stale offline snapshot.
  operation({ id: ids[1], expectedRevision: ids[0], status: "absent" }),
  operation({ id: ids[2], expectedRevision: ids[1], status: "unrecorded" }),
  operation({ id: ids[3], date: "2026-10-10" }),
  operation({
    id: crypto.randomUUID(),
    expectedRevision: ids[2],
    companyId: crypto.randomUUID(),
  }),
  q`select attendance_date::text as day, present, revision from participant_attendance order by attendance_date`,
  q.query(legacy.sql, legacy.params),
  operation({ id: crypto.randomUUID(), expectedRevision: ids[2] }), // Legacy online changes must also conflict.
  q`select revision from participant_attendance where attendance_date = '2026-10-09'`,
]);
assert.equal(result[4].length, 1);
assert.equal(result[5].length, 0);
assert.equal(result[6].length, 0);
assert.equal(result[7].length, 1);
assert.equal(result[8].length, 1);
assert.equal(result[9].length, 1);
assert.equal(result[10].length, 0);
assert.deepEqual(result[11], [
  { day: "2026-10-09", present: null, revision: ids[2] },
  { day: "2026-10-10", present: true, revision: ids[3] },
]);
assert.equal(result[13].length, 0);
assert.notEqual(result[14][0].revision, ids[2]);
console.log(
  "PASS: migration, causal queue, duplicate retries, competing edits, day isolation, stale company, legacy writer revisions.",
);
