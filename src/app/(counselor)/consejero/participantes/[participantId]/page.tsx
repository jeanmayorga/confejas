import type { Metadata } from "next";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CounselorParticipantDetails } from "@/modules/counselor-app/components/participant-details.client";
import { getCounselorParticipantById } from "@/modules/counselor-app/server/queries";

type CounselorParticipantPageProps = {
  params: Promise<{ participantId: string }>;
};

export const metadata: Metadata = {
  title: "Detalle del participante",
};

export default async function CounselorParticipantPage({
  params,
}: CounselorParticipantPageProps) {
  const { participantId } = await params;
  const participant = await getCounselorParticipantById(participantId);

  if (!participant) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Link
          href="/consejero/participantes"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-3 text-muted-foreground",
          )}
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            strokeWidth={2}
            data-icon="inline-start"
            aria-hidden
          />
          Participantes
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
          Detalle del participante
        </h1>
      </header>

      <CounselorParticipantDetails
        participant={{
          ...participant,
          checkedInAt: participant.checkedInAt?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
