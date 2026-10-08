import { expect, test } from "bun:test";
import { distributeCounselors } from "./counselor-distribution";

test("preserves assignments, separates sexes, skips unknown sex and respects capacity", () => {
  const rooms = [
    { id: 1, sex: "female" as const, capacity: 2 },
    { id: 2, sex: "male" as const, capacity: 1 },
  ];
  expect(
    distributeCounselors(rooms, [
      { id: "existing", sex: "female", roomId: 1 },
      { id: "woman", sex: "female", roomId: null },
      { id: "overflow", sex: "female", roomId: null },
      { id: "unknown", sex: null, roomId: null },
      { id: "man", sex: "male", roomId: null },
    ]),
  ).toEqual([
    { id: "woman", roomId: 1 },
    { id: "man", roomId: 2 },
  ]);
});
test("uses the next internal room after four beds and is idempotent", () => {
  const rooms = [1, 2].map((id) => ({
    id,
    capacity: 4,
    sex: "female" as const,
  }));
  const people = Array.from({ length: 6 }, (_, i) => ({
    id: String(i),
    sex: "female" as const,
    roomId: null as number | null,
  }));
  const assignments = distributeCounselors(rooms, people);
  expect(assignments.map((person) => person.roomId)).toEqual([
    1, 1, 1, 1, 2, 2,
  ]);
  expect(
    distributeCounselors(
      rooms,
      people.map((person, i) => ({ ...person, roomId: assignments[i].roomId })),
    ),
  ).toEqual([]);
});
