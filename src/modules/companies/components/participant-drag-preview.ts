type ParticipantDragPreview = {
  name: string;
  initials: string;
  count?: number;
};

export function setParticipantDragPreview(
  dataTransfer: DataTransfer,
  { name, initials, count = 1 }: ParticipantDragPreview,
) {
  // Native drag images must be rendered before the browser takes its snapshot.
  const preview = document.createElement("div");
  preview.setAttribute("aria-hidden", "true");
  preview.className =
    "pointer-events-none fixed top-0 left-0 -z-50 flex w-72 items-center gap-3 rounded-2xl border bg-card p-3 text-card-foreground shadow-lg";

  const avatar = document.createElement("span");
  avatar.className =
    "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground";
  avatar.textContent = initials;

  const label = document.createElement("span");
  label.className = "min-w-0 break-words text-sm font-medium";
  label.textContent = count > 1 ? `${count} participantes` : name;

  preview.append(avatar, label);
  document.body.append(preview);
  dataTransfer.setDragImage(preview, 24, 24);
  return () => preview.remove();
}
