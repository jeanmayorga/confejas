import "../env.config";
import { strict as assert } from "node:assert";
import { neon } from "@neondatabase/serverless";
import { PgDialect } from "drizzle-orm/pg-core";
import { staffParticipantMoveQuery } from "../src/modules/lodging/staff-participant-move";

// All writes target transaction-local temporary tables, never application data.
const q = neon(process.env.DATABASE_URL!);
const dialect = new PgDialect();
const incoming = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
function move(id: string, roomId: number, previousRoomName: string | null) {
  const query = dialect.sqlToQuery(
    staffParticipantMoveQuery({ participantId: id, roomId, previousRoomName }),
  );
  return q.query(query.sql, query.params);
}
const results = await q.transaction([
  q`create temporary table participants (id uuid primary key, sex text, room_name text, updated_at timestamptz) on commit drop`,
  q`create temporary table counselors (lodging_room_id integer) on commit drop`,
  q`create temporary table lodging_staff_guests (room_id integer) on commit drop`,
  q`create temporary table lodging_counselor_rooms (id integer) on commit drop`,
  q`create temporary table lodging_rooms (id integer, building_id integer, number integer, coordinator_capacity integer) on commit drop`,
  q`create temporary table lodging_buildings (id integer, name text, sex text) on commit drop`,
  q`insert into lodging_buildings values (1,'Moroni','male'),(2,'Esther','female')`,
  q`insert into lodging_rooms values (1,1,1,4),(2,1,2,4),(3,2,1,4)`,
  q`insert into lodging_counselor_rooms values (1),(2),(3)`,
  q`insert into counselors values (1)`,
  q`insert into lodging_staff_guests values (1)`,
  q`insert into participants values (${incoming}::uuid,'Masculino','Moroni · Dormitorio 1',now()),(${other}::uuid,'Masculino',null,now()),('00000000-0000-4000-8000-000000000003','Masculino','Moroni · Habitación 1 staff',now())`,
  move(incoming, 1, "Moroni · Dormitorio 1"),
  q`select count(*)::integer as count from participants where room_name='Moroni · Dormitorio 1'`,
  move(other, 1, null), // four shared beds already occupied
  move(other, 3, null), // wrong sex
  move(incoming, 2, "Moroni · Dormitorio 1"), // stale source
  move(incoming, 2, "Moroni · Habitación 1 staff"),
  move(other, 1, null), // previous staff bed was released
  q`select id,room_name from participants where id in (${incoming}::uuid,${other}::uuid) order by id`,
]);
assert.equal(results[12].length, 1);
assert.equal(results[13][0].count, 0);
for (const index of [14, 15, 16]) assert.equal(results[index].length, 0);
assert.equal(results[17].length, 1);
assert.equal(results[18].length, 1);
assert.deepEqual(
  results[19].map((row) => row.room_name),
  ["Moroni · Habitación 2 staff", "Moroni · Habitación 1 staff"],
);
console.log(
  "PASS: transfer releases original bed; shared capacity, sex and stale-state guards; staff-to-staff transfer releases previous bed.",
);
