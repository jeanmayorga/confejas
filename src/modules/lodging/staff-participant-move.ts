import { sql } from "drizzle-orm";

export type StaffParticipantMove = {
  participantId: string;
  roomId: number;
  previousRoomName: string | null;
};

export function staffParticipantMoveQuery(input: StaffParticipantMove) {
  return sql`
        with target as (
          select cr.id, r.coordinator_capacity as capacity,b.sex,
            concat(b.name, ' · Habitación ', r.number, ' staff') as name
          from lodging_counselor_rooms cr join lodging_rooms r on r.id=cr.id
          join lodging_buildings b on b.id=r.building_id where cr.id=${input.roomId}
        ) update participants p set room_name=t.name,updated_at=now() from target t
        where p.id=${input.participantId}::uuid
          and p.room_name is not distinct from ${input.previousRoomName}::varchar
          and p.sex=case t.sex when 'female' then 'Femenino' else 'Masculino' end
          and (select count(*) from counselors c where c.lodging_room_id=t.id)
            + (select count(*) from lodging_staff_guests g where g.room_id=t.id)
            + (select count(*) from participants other where other.room_name=t.name and other.id<>p.id) < t.capacity
        returning p.id
      `;
}
