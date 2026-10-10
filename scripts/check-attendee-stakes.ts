import "../env.config";
import { strict as assert } from "node:assert";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { attendeeStakesQuery } from "../src/modules/dashboard/server/attendee-stakes-query";

const q = neon(process.env.DATABASE_URL!);
const query = new PgDialect().sqlToQuery(attendeeStakesQuery);
// All writes stay in transaction-local temporary tables.
const results = await q.transaction([
  q`create temporary table participants (ward_id integer, final_attendance boolean) on commit drop`,
  q`create temporary table wards (id integer, stake_id integer) on commit drop`,
  q`create temporary table stakes (id integer, name text) on commit drop`,
  q.query(query.sql, query.params),
  q`insert into stakes values (1, 'Estaca A'), (2, 'Estaca B')`,
  q`insert into wards values (11, 1), (12, 1), (21, 2)`,
  q`insert into participants values (11, true), (12, true), (21, true), (null, true), (11, false), (21, null), (null, false)`,
  q.query(query.sql, query.params),
]);
assert.deepEqual(results[3], []);
assert.deepEqual(
  results[7].sort((a, b) => (a.id ?? 999) - (b.id ?? 999)),
  [
    { id: 1, name: "Estaca A", total: 2 },
    { id: 2, name: "Estaca B", total: 1 },
    { id: null, name: "Sin estaca registrada", total: 1 },
  ],
);
console.log(
  "PASS: ward-to-stake grouping, attendees only, missing stake and empty input.",
);
