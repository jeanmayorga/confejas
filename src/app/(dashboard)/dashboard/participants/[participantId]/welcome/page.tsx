import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import Pdf02Icon from "@hugeicons/core-free-icons/Pdf02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { WelcomeCover } from "@/modules/participants/components/welcome-cover.client";
import { SendWelcomeEmailButton } from "@/modules/participants/components/send-welcome-email-button.client";
import { getParticipantForWelcome } from "@/modules/participants/server/queries";

type WelcomePageProps = {
  params: Promise<{ participantId: string }>;
};

export default async function WelcomePage({ params }: WelcomePageProps) {
  await requireParticipantDirectoryAccess();
  const { participantId } = await params;
  const participant = await getParticipantForWelcome(participantId);

  if (!participant?.sourceRecordId) {
    notFound();
  }

  const participantName = `${participant.firstNames} ${participant.lastNames}`;

  return (
    <div className="flex min-h-full flex-col gap-5">
      <PageHeader
        title="Carta de invitación"
        description={`Vista previa para ${participantName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/participants/${participant.id}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
              Volver al perfil
            </Link>
            <a
              href={`/api/participants/${participant.id}/welcome`}
              download
              className={cn(buttonVariants())}
            >
              <HugeiconsIcon icon={Pdf02Icon} data-icon="inline-start" />
              Descargar PDF
            </a>
            <SendWelcomeEmailButton
              participantId={participant.id}
              email={participant.email}
              size="default"
            />
          </div>
        }
      />

      <div className="flex justify-center overflow-auto rounded-2xl border bg-muted/50 p-3 sm:p-8">
        <WelcomeCover participant={{ ...participant, sourceRecordId: participant.sourceRecordId }} />
      </div>
    </div>
  );
}
