type Sex = "female" | "male";
type Room = { id: number; capacity: number; sex: Sex };
type Person = { id: string; sex: Sex | null; roomId: number | null };

/** Preserve existing assignments and use only recorded sex and remaining beds. */
export function distributeCounselors(rooms: Room[], people: Person[]) {
  const occupied = new Map<number, number>();
  for (const person of people) {
    if (person.roomId !== null) {
      occupied.set(person.roomId, (occupied.get(person.roomId) ?? 0) + 1);
    }
  }
  const assignments: { id: string; roomId: number }[] = [];
  for (const person of people) {
    if (person.roomId !== null || !person.sex) continue;
    const room = rooms.find(
      (candidate) =>
        candidate.sex === person.sex &&
        (occupied.get(candidate.id) ?? 0) < candidate.capacity,
    );
    if (!room) continue;
    assignments.push({ id: person.id, roomId: room.id });
    occupied.set(room.id, (occupied.get(room.id) ?? 0) + 1);
  }
  return assignments;
}
