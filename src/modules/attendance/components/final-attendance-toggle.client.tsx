"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { saveFinalAttendanceAction } from "../server/actions";

export function FinalAttendanceToggle({
  participantId,
  participantName,
  companyId,
  value,
}: {
  participantId: string;
  participantName: string;
  companyId: string;
  value: boolean | null;
}) {
  const [attended, setAttended] = useState(value);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <ToggleGroup
      aria-label={`Asistió: ${participantName}`}
      aria-busy={pending}
      className="mx-auto"
      variant="outline"
      spacing={0}
      size="sm"
      disabled={pending}
      value={attended === null ? [] : [attended ? "yes" : "no"]}
      onValueChange={(values) => {
        if (!values.length || pending) return;
        const next = values[0] === "yes";
        if (next === attended) return;
        startTransition(async () => {
          try {
            const result = await saveFinalAttendanceAction({
              participantId,
              companyId,
              attended: next,
            });
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            setAttended(next);
            void queryClient.invalidateQueries({
              queryKey: ["participant-detail", participantId],
            });
            router.refresh();
            toast.success(result.message);
          } catch {
            toast.error("No se pudo guardar la asistencia. Inténtalo nuevamente.");
          }
        });
      }}
    >
      <ToggleGroupItem
        value="yes"
        aria-label={`Sí asistió: ${participantName}`}
        className="data-pressed:bg-emerald-100 data-pressed:text-emerald-900"
      >
        Sí
      </ToggleGroupItem>
      <ToggleGroupItem
        value="no"
        aria-label={`No asistió: ${participantName}`}
        className="data-pressed:bg-red-100 data-pressed:text-red-900"
      >
        No
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
