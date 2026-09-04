import "server-only";

import { and, eq, sql } from "drizzle-orm";

import {
  getCompanyCapacityCondition,
  getCompanyCapacityLockQuery,
} from "@/modules/companies/server/capacity";
import { db } from "@/server/db";

import { participants } from "./schema";

type CheckInParticipantInput = {
  participantId: string;
  companyId: string | null;
  participantSex: string | null;
  roomName: string | null;
  staffUserId: string;
};

type MarkParticipantArrivalInput = {
  participantId: string;
  staffUserId: string;
};

export async function checkInParticipant({
  participantId,
  companyId,
  participantSex,
  roomName,
  staffUserId,
}: CheckInParticipantInput) {
  const participantUpdate = db
    .update(participants)
    .set({
      companyId,
      roomName,
      status: "arrived",
      checkedInAt: sql`coalesce(${participants.checkedInAt}, now())`,
      checkedInById: sql`coalesce(${participants.checkedInById}, ${staffUserId})`,
    })
    .where(
      companyId
        ? and(
            eq(participants.id, participantId),
            sql`${participants.sex} is not distinct from ${participantSex}`,
            getCompanyCapacityCondition({
              companyId,
              sex: participantSex,
              excludedParticipantId: participantId,
            }),
          )
        : eq(participants.id, participantId),
    )
    .returning({ id: participants.id });

  if (companyId) {
    const [, updatedParticipants] = await db.batch([
      getCompanyCapacityLockQuery(),
      participantUpdate,
    ]);

    return updatedParticipants[0] ?? null;
  }

  const [participant] = await participantUpdate;

  return participant ?? null;
}

export async function markParticipantArrival({
  participantId,
  staffUserId,
}: MarkParticipantArrivalInput) {
  const [participant] = await db
    .update(participants)
    .set({
      status: "arrived",
      checkedInAt: sql`coalesce(${participants.checkedInAt}, now())`,
      checkedInById: sql`coalesce(${participants.checkedInById}, ${staffUserId})`,
    })
    .where(eq(participants.id, participantId))
    .returning({
      id: participants.id,
      checkedInAt: participants.checkedInAt,
    });

  return participant ?? null;
}
