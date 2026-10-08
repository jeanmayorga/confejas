import "../env.config";
import { neon } from "@neondatabase/serverless";
import { distributeCounselors } from "../src/modules/lodging/counselor-distribution";

// Input: [{ id: counselor UUID, sex: "female" | "male" }]. Dry-run by default.
const path = process.argv[2];
if (!path)
  throw new Error(
    "Uso: bun run scripts/assign-counselor-rooms.ts <sexos.json> [--apply]",
  );
const input: unknown = await Bun.file(path).json();
if (
  !Array.isArray(input) ||
  input.some(
    (row) =>
      !row ||
      typeof row.id !== "string" ||
      !["female", "male"].includes(row.sex),
  )
) {
  throw new Error("Lista de sexos inválida.");
}
const sexes = new Map<string, "female" | "male">(
  input.map((row) => [row.id, row.sex]),
);
if (sexes.size !== input.length) throw new Error("Consejeros duplicados.");
const q = neon(process.env.DATABASE_URL!);
const [roomRows, peopleRows] = await Promise.all([
  q`select cr.id, b.sex, r.coordinator_capacity as capacity from lodging_counselor_rooms cr join lodging_rooms r on r.id=cr.id join lodging_buildings b on b.id=r.building_id order by b.position,r.number`,
  q`select c.id,c.sex,c.lodging_room_id as "roomId",co.name company,c.name from counselors c left join companies co on co.id=c.company_id`,
]);
const rooms = roomRows as {
  id: number;
  sex: "female" | "male";
  capacity: number;
}[];
const people = peopleRows as {
  id: string;
  sex: "female" | "male" | null;
  roomId: number | null;
  company: string | null;
  name: string;
}[];
for (const [id, sex] of sexes) {
  const person = people.find((row) => row.id === id);
  if (!person) throw new Error(`Consejero inexistente: ${id}`);
  if (person.sex && person.sex !== sex)
    throw new Error(`Sexo registrado diferente: ${person.name}`);
}
people.sort(
  (a, b) =>
    (a.company ?? "").localeCompare(b.company ?? "", "es", { numeric: true }) ||
    a.name.localeCompare(b.name, "es"),
);
const assignments = distributeCounselors(
  rooms,
  people.map((person) => ({
    ...person,
    sex: person.sex ?? sexes.get(person.id) ?? null,
  })),
);
const changes = assignments.map((assignment) => ({
  ...assignment,
  sex:
    people.find((p) => p.id === assignment.id)!.sex ??
    sexes.get(assignment.id)!,
}));
console.log(
  JSON.stringify({
    assignments: changes.length,
    pending: people.filter((p) => p.roomId === null).length - changes.length,
    bySex: {
      female: changes.filter((p) => p.sex === "female").length,
      male: changes.filter((p) => p.sex === "male").length,
    },
  }),
);
if (!process.argv.includes("--apply") || !changes.length) process.exit(0);
const result = await q.transaction([
  q`lock table counselors,lodging_counselor_rooms,lodging_rooms,lodging_buildings in share row exclusive mode`,
  q`with requested as (
    select * from jsonb_to_recordset(${JSON.stringify(changes)}::jsonb) as x(id uuid, "roomId" integer, sex varchar)
  ), valid as (
    select count(*) = ${changes.length} and not exists (
      select 1 from requested x join lodging_rooms r on r.id=x."roomId"
      where (select count(*) from counselors c where c.lodging_room_id=r.id) +
        (select count(*) from requested y where y."roomId"=r.id) > r.coordinator_capacity
    ) as ok
    from requested x join counselors c on c.id=x.id
    join lodging_counselor_rooms cr on cr.id=x."roomId"
    join lodging_rooms r on r.id=cr.id join lodging_buildings b on b.id=r.building_id
    where c.lodging_room_id is null and (c.sex is null or c.sex=x.sex) and b.sex=x.sex
  ) update counselors c set lodging_room_id=x."roomId",sex=x.sex,updated_at=now()
    from requested x,valid where valid.ok and c.id=x.id returning c.id`,
]);
if (result[1].length !== changes.length)
  throw new Error(
    "Los datos cambiaron. No se guardó ninguna asignación; vuelve a ejecutar.",
  );
console.log(`Guardadas ${result[1].length} asignaciones.`);
