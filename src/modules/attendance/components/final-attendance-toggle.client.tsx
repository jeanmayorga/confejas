"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAttendanceQueue } from "./attendance-queue-provider.client";

export function FinalAttendanceToggle({
  participantId,
  participantName,
  companyId,
  value,
  revision,
  updatedAt,
}: {
  participantId: string;
  participantName: string;
  companyId: string;
  value: boolean | null;
  revision: string;
  updatedAt: Date;
}) {
  const queue = useAttendanceQueue();
  const [saving, setSaving] = useState(false);
  const pending = queue.records.find(
    (record) => record.participantId === participantId,
  );
  const confirmed = queue.confirmed[participantId];
  const newer =
    confirmed && Date.parse(confirmed.updatedAt) > new Date(updatedAt).getTime()
      ? confirmed
      : null;
  const attended = pending?.attended ?? newer?.attended ?? value;

  return (
    <div>
      <ToggleGroup
        aria-label={`Asistió: ${participantName}`}
        aria-busy={saving}
        className="mx-auto"
        variant="outline"
        spacing={0}
        size="sm"
        disabled={!queue.ready || saving}
        value={attended === null ? [] : [attended ? "yes" : "no"]}
        onValueChange={(values) => {
          if (!values.length || saving) return;
          const next = values[0] === "yes";
          if (next === attended) return;
          setSaving(true);
          void queue
            .save({
              participantId,
              participantName,
              companyId,
              attended: next,
              expectedRevision: newer?.revision ?? revision,
              serverUpdatedAt:
                newer?.updatedAt ?? new Date(updatedAt).toISOString(),
            })
            .catch(() => {
              toast.error(
                "No se pudo guardar en este dispositivo. La selección no cambió; inténtalo nuevamente.",
              );
            })
            .finally(() => setSaving(false));
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
      {pending ? (
        <span className="mt-1 block text-[10px] text-amber-700">
          {pending.blocked ? "Revisar pendiente" : "Pendiente de envío"}
        </span>
      ) : null}
    </div>
  );
}
