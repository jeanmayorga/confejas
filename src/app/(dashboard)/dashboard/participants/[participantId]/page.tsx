import type { Metadata } from "next";
import Link from "next/link";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { canManageParticipants } from "@/modules/auth/roles";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { ParticipantDetails } from "@/modules/participants/components/participant-details.client";
import { getParticipantById } from "@/modules/participants/server/queries";
import { cn } from "@/lib/utils";

type ParticipantPageProps = {
  params: Promise<{ participantId: string }>;
};

export const metadata: Metadata = {
  title: "Detalle del participante | Confejas",
};

export default async function ParticipantPage({ params }: ParticipantPageProps) {
  const session = await requireParticipantDirectoryAccess();
  const { participantId } = await params;
  const participant = await getParticipantById(participantId);

  if (!participant) {
    notFound();
  }

  const participantName = `${participant.firstNames} ${participant.lastNames}`;
  const detailParticipant = {
    ...participant,
    checkedInAt: participant.checkedInAt?.toISOString() ?? null,
    welcomeEmailSentAt: participant.welcomeEmailSentAt?.toISOString() ?? null,
  };

  return (
    <div className="flex min-h-full flex-col gap-5">
      <PageHeader
        title={participantName}
        description="Detalle del participante"
        actions={
          <Link
            href="/dashboard/participants"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
            Volver a participantes
          </Link>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
        <ParticipantDetails
          participant={detailParticipant}
          canViewWelcome
          canMarkArrival={canManageParticipants(session.user.role)}
        />
      </div>
    </div>
  );
}
