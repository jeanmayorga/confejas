import "../env.config";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { counselorArrivalQuery } from "../src/modules/lodging/counselor-arrival";

// The migration and all writes target a transaction-local temporary table.
const q = neon(process.env.DATABASE_URL!);
const dialect = new PgDialect();
const personId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const missingId = "00000000-0000-4000-8000-000000000003";
function arrival(id: string, arrived: boolean) {
  const query = dialect.sqlToQuery(counselorArrivalQuery(id, arrived));
  return q.query(query.sql, query.params);
}

const migration = await readFile(
  new URL("../drizzle/0024_friendly_sinister_six.sql", import.meta.url),
  "utf8",
);
const results = await q.transaction([
  q`create temporary table counselors (id uuid primary key, updated_at timestamptz) on commit drop`,
  q`insert into counselors values (${personId}::uuid, now()), (${otherId}::uuid, now())`,
  q.query(migration),
  q`select arrived_at from counselors`,
  arrival(personId, true),
  q`update counselors set arrived_at = '2026-10-08T14:30:00Z' where id = ${personId}::uuid`,
  arrival(personId, true),
  arrival(personId, false),
  arrival(personId, false),
  arrival(personId, true),
  arrival(missingId, true),
  q`select arrived_at from counselors where id = ${otherId}::uuid`,
]);

assert.ok(results[3].every((row) => row.arrived_at === null));
assert.ok(results[4][0].arrived_at);
assert.equal(new Date(results[6][0].arrived_at).toISOString(), "2026-10-08T14:30:00.000Z");
assert.equal(results[7][0].arrived_at, null);
assert.equal(results[8][0].arrived_at, null);
assert.ok(results[9][0].arrived_at);
assert.equal(results[10].length, 0);
assert.equal(results[11][0].arrived_at, null);
console.log("PASS: migration defaults, arrival persistence, original timestamp preserved, correction and re-arrival, missing counselor and unrelated records.");
