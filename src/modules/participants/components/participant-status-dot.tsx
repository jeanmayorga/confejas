import { cn } from "@/lib/utils";
import type { ParticipantStatus } from "../status";

const statusDotClassNames = {
  registered: "bg-participant-registered",
  confirmed: "bg-participant-confirmed",
  arrived: "bg-participant-arrived",
  cancelled: "bg-participant-cancelled",
  pending: "bg-participant-pending",
} satisfies Record<ParticipantStatus, string>;

export function ParticipantStatusDot({
  status,
}: {
  status: ParticipantStatus;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        statusDotClassNames[status],
      )}
    />
  );
}
