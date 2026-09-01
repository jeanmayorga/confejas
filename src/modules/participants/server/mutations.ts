import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/server/db";

import { participants } from "./schema";

type CheckInParticipantInput = {
  participantId: string;
  companyId: string | null;
  roomName: string | null;
  staffUserId: string;
};

export async function checkInParticipant({
  participantId,
  companyId,
  roomName,
  staffUserId,
}: CheckInParticipantInput) {
  const [participant] = await db
    .update(participants)
    .set({
      companyId,
      roomName,
      checkedInAt: sql`coalesce(${participants.checkedInAt}, now())`,
      checkedInById: sql`coalesce(${participants.checkedInById}, ${staffUserId})`,
    })
    .where(eq(participants.id, participantId))
    .returning({ id: participants.id });

  return participant ?? null;
}
