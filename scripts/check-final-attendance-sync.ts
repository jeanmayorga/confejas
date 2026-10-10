import "../env.config";
import { strict as assert } from "node:assert";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { finalAttendanceQuery } from "../src/modules/attendance/server/final-query";
import type { AttendanceMutation } from "../src/modules/attendance/offline/types";

// Only transaction-local temporary tables are used; real participants are untouched.
const q = neon(process.env.DATABASE_URL!);
const dialect = new PgDialect();
const base: AttendanceMutation = {
  ownerId: "staff",
  participantId: crypto.randomUUID(),
  companyId: crypto.randomUUID(),
  expectedRevision: crypto.randomUUID(),
  mutationId: crypto.randomUUID(),
  attended: true,
};
const second = crypto.randomUUID();
function operation(overrides: Partial<AttendanceMutation> = {}) {
  const query = dialect.sqlToQuery(
    finalAttendanceQuery({ ...base, ...overrides }),
  );
  return q.query(query.sql, query.params);
}
const results = await q.transaction([
  q`create temporary table participants(id uuid primary key, company_id uuid, final_attendance boolean, final_attendance_revision uuid, updated_at timestamptz) on commit drop`,
  q`insert into participants values (${base.participantId}::uuid, ${base.companyId}::uuid, null, ${base.expectedRevision}::uuid, now())`,
  operation(),
  operation(), // Lost response: retry identical operation.
  operation({
    mutationId: second,
    expectedRevision: base.mutationId,
    attended: false,
  }),
  operation(), // A delayed old request cannot revert the newer choice.
  operation({
    mutationId: crypto.randomUUID(),
    expectedRevision: base.expectedRevision,
  }), // Competing device snapshot.
  operation({
    mutationId: crypto.randomUUID(),
    expectedRevision: second,
    companyId: crypto.randomUUID(),
  }),
  q`select final_attendance as attended, final_attendance_revision as revision from participants`,
]);
assert.equal(results[2].length, 1);
assert.deepEqual(results[2], results[3]);
assert.equal(results[4][0].attended, false);
for (const index of [5, 6, 7]) assert.equal(results[index].length, 0);
assert.deepEqual(results[8], [{ attended: false, revision: second }]);
console.log(
  "PASS: retries, rapid edits, delayed requests, competing edits and company checks in PostgreSQL.",
);
