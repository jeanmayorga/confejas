import type { Metadata } from "next";

import { CounselorParticipantList } from "@/modules/counselor-app/components/participant-list.client";
import {
  getCounselorAppContext,
  listCounselorParticipants,
} from "@/modules/counselor-app/server/queries";

export const metadata: Metadata = {
  title: "Participantes",
};

export default async function CounselorParticipantsPage() {
  const [context, participants] = await Promise.all([
    getCounselorAppContext(),
    listCounselorParticipants(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Participantes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {context.company?.name ?? "Sin compañía asignada"} ·{" "}
          {participants.length}{" "}
          {participants.length === 1 ? "participante" : "participantes"}
        </p>
      </header>

      <CounselorParticipantList participants={participants} />
    </div>
  );
}
