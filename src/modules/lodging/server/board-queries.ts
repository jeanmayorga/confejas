import "server-only";

import { and, asc, count, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import { stakes, wards } from "@/modules/church-units/server/schema";
import { participants } from "@/modules/participants/server/schema";
import { isParticipantStatus } from "@/modules/participants/status";
import { db } from "@/server/db";
import {
  LODGING_PAGE_SIZE,
  normalizeLodgingPage,
  type LodgingListInput,
} from "../board-pagination";
import { lodgingBuildings, lodgingRooms } from "./schema";

const age = sql<
  number | null
>`extract(year from age(current_date, ${participants.birthDate}))::integer`;
const fields = {
  id: participants.id,
  firstNames: participants.firstNames,
  lastNames: participants.lastNames,
  preferredName: participants.preferredName,
  age,
  sex: participants.sex,
  status: participants.status,
  wardName: wards.name,
  stakeName: stakes.name,
  roomName: participants.roomName,
};

// Match the client search, including Spanish accents, without loading names into JS.
function searchCondition(value: string) {
  const terms = value
    .slice(0, 200)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const text = sql`translate(lower(concat_ws(' ', ${participants.firstNames}, ${participants.lastNames}, ${participants.preferredName}, ${wards.name}, ${stakes.name})), 'áéíóúüñ', 'aeiouun')`;
  return and(...terms.map((term) => sql`strpos(${text}, ${term}) > 0`));
}

const unassignedCondition = sql`not exists (
  select 1 from ${lodgingRooms}
  inner join ${lodgingBuildings} on ${lodgingRooms.buildingId} = ${lodgingBuildings.id}
  where ${participants.roomName} = concat(${lodgingBuildings.name}, ' · Dormitorio ', ${lodgingRooms.number})
     or ${participants.roomName} = concat(${lodgingBuildings.name}, ' · Habitación ', ${lodgingRooms.number}, ' staff')
)`;

export async function getLodgingRoomOccupants(roomId: number) {
  if (!Number.isSafeInteger(roomId) || roomId <= 0)
    throw new Error("Dormitorio inválido.");
  const [room] = await db
    .select({
      buildingName: lodgingBuildings.name,
      number: lodgingRooms.number,
    })
    .from(lodgingRooms)
    .innerJoin(
      lodgingBuildings,
      eq(lodgingBuildings.id, lodgingRooms.buildingId),
    )
    .where(eq(lodgingRooms.id, roomId));
  if (!room) throw new Error("El dormitorio ya no existe.");
  return db
    .select(fields)
    .from(participants)
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .where(
      eq(
        participants.roomName,
        `${room.buildingName} · Dormitorio ${room.number}`,
      ),
    )
    .orderBy(
      asc(participants.firstNames),
      asc(participants.lastNames),
      asc(participants.id),
    );
}

export async function getUnassignedLodgingPage(input: LodgingListInput) {
  const filters = input.filters;
  const condition = and(
    unassignedCondition,
    searchCondition(input.search),
    isParticipantStatus(filters.status)
      ? eq(participants.status, filters.status)
      : undefined,
    filters.sex === "female"
      ? eq(participants.sex, "Femenino")
      : filters.sex === "male"
        ? eq(participants.sex, "Masculino")
        : filters.sex === "other"
          ? or(
              isNull(participants.sex),
              notInArray(participants.sex, ["Femenino", "Masculino"]),
            )
          : undefined,
    filters.age === "unknown"
      ? isNull(participants.birthDate)
      : /^\d{1,3}$/.test(filters.age)
        ? eq(age, Number(filters.age))
        : undefined,
  );
  const [totalRow] = await db
    .select({ value: count() })
    .from(participants)
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .where(condition);
  const total = totalRow?.value ?? 0;
  const page = Math.min(
    normalizeLodgingPage(input.page),
    Math.max(1, Math.ceil(total / LODGING_PAGE_SIZE)),
  );
  const [items, ageRows] = await Promise.all([
    db
      .select(fields)
      .from(participants)
      .innerJoin(wards, eq(participants.wardId, wards.id))
      .innerJoin(stakes, eq(wards.stakeId, stakes.id))
      .where(condition)
      .orderBy(
        asc(participants.firstNames),
        asc(participants.lastNames),
        asc(participants.id),
      )
      .limit(LODGING_PAGE_SIZE)
      .offset((page - 1) * LODGING_PAGE_SIZE),
    db
      .selectDistinct({ age })
      .from(participants)
      .where(unassignedCondition)
      .orderBy(asc(age)),
  ]);
  return {
    items,
    total,
    page,
    ages: ageRows.flatMap(({ age }) => (age === null ? [] : [age])),
  };
}

export async function searchLodgingRooms(search: string) {
  if (!search.trim()) return [];
  // DISTINCT returns only room names, never an unbounded participant directory.
  const rows = await db
    .selectDistinct({ roomName: participants.roomName })
    .from(participants)
    .innerJoin(wards, eq(participants.wardId, wards.id))
    .innerJoin(stakes, eq(wards.stakeId, stakes.id))
    .innerJoin(
      lodgingRooms,
      sql`${participants.roomName} = (select concat(${lodgingBuildings.name}, ' · Dormitorio ', ${lodgingRooms.number}) from ${lodgingBuildings} where ${lodgingBuildings.id} = ${lodgingRooms.buildingId})`,
    )
    .where(searchCondition(search));
  return rows.flatMap(({ roomName }) => (roomName ? [roomName] : []));
}
