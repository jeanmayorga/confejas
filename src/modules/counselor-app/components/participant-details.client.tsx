"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ParticipantDetails } from "@/modules/participants/components/participant-details.client";
import type { ParticipantTableRow } from "@/modules/participants/components/participants-table.client";
import { updateCounselorParticipantStatusAction } from "@/modules/counselor-app/server/actions";
import type { ParticipantStatus } from "@/modules/participants/status";

type CounselorParticipantDetailsProps = {
  participant: ParticipantTableRow;
};

export function CounselorParticipantDetails({
  participant,
}: CounselorParticipantDetailsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticParticipant, setOptimisticStatus] = useOptimistic(
    participant,
    (currentParticipant, status: ParticipantStatus) => ({
      ...currentParticipant,
      status,
    }),
  );

  function changeStatus(status: ParticipantStatus) {
    if (status === optimisticParticipant.status) {
      return;
    }

    startTransition(async () => {
      setOptimisticStatus(status);
      const result = await updateCounselorParticipantStatusAction(
        participant.id,
        status,
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <ParticipantDetails
      participant={optimisticParticipant}
      canChangeStatus
      isStatusUpdating={isPending}
      onStatusChange={changeStatus}
      className="overflow-visible px-0 pb-0"
    />
  );
}
