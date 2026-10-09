"use server";

import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import type { LodgingListInput } from "../board-pagination";
import {
  getLodgingRoomOccupants,
  getUnassignedLodgingPage,
  searchLodgingRooms,
} from "./board-queries";

export async function getLodgingRoomOccupantsAction(roomId: number) {
  await requireParticipantDirectoryAccess();
  return getLodgingRoomOccupants(roomId);
}

export async function getUnassignedLodgingPageAction(input: LodgingListInput) {
  await requireParticipantDirectoryAccess();
  if (
    !input ||
    typeof input.search !== "string" ||
    !input.filters ||
    typeof input.filters.age !== "string" ||
    typeof input.filters.status !== "string" ||
    typeof input.filters.sex !== "string"
  ) {
    throw new Error("Los filtros no son válidos.");
  }
  return getUnassignedLodgingPage(input);
}

export async function searchLodgingRoomsAction(search: string) {
  await requireParticipantDirectoryAccess();
  if (typeof search !== "string") throw new Error("La búsqueda no es válida.");
  return searchLodgingRooms(search);
}
