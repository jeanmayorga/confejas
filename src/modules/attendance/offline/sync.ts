import { acknowledge, blockRequest, nextRequest, readPending } from "./store";
import type { SavedAttendance } from "./types";

export type SendAttendance = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export async function synchronizeFinalAttendance(
  ownerId: string,
  onChange: (participantId?: string, saved?: SavedAttendance) => Promise<void>,
  signal: AbortSignal,
  send: SendAttendance = fetch,
): Promise<string | null> {
  const records = await readPending(ownerId);
  for (const record of records) {
    // Drain successive edits for a person in order, including edits made mid-request.
    while (!signal.aborted) {
      const input = await nextRequest(ownerId, record.participantId);
      if (!input) break;
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(cancel, 10_000);
      try {
        if (signal.aborted) return null;
        const response = await send("/api/attendance/final", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          return (
            (await response.json()).message ??
            "Inicia sesión con la cuenta que registró los cambios."
          );
        }
        if (response.status === 409 || response.status === 400) {
          const body = await response.json();
          await blockRequest(input, {
            message: body.message ?? "Revisa este registro.",
            revision: body.revision,
            attended: body.attended,
          });
          await onChange();
          break;
        }
        if (!response.ok)
          return "Pendiente de envío. Se reintentará automáticamente.";
        const saved: SavedAttendance = await response.json();
        if (
          saved.revision !== input.mutationId ||
          saved.attended !== input.attended ||
          !Number.isFinite(Date.parse(saved.updatedAt))
        ) {
          return "Pendiente de envío. No se pudo confirmar el guardado.";
        }
        await acknowledge(input, saved);
        await onChange(input.participantId, saved);
      } catch {
        return signal.aborted
          ? null
          : "Pendiente de envío. Se reintentará automáticamente.";
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", cancel);
      }
    }
  }
  return null;
}
