import {
  applyAcknowledgement,
  getLocalState,
  readLocalAttendance,
  recordProblem,
  syncLease,
} from "./store";
import { attendanceKey } from "./types";

export async function synchronizeAttendance() {
  const token = crypto.randomUUID();
  if (!(await syncLease(token))) return { state: "busy" as const };
  try {
    const ownerId = (await getLocalState()).ownerId;
    if (!ownerId) return { state: "auth" as const };
    const { pending } = await readLocalAttendance("");
    const blocked = new Set(
      pending.filter((p) => p.problem).map(attendanceKey),
    );
    for (const operation of pending) {
      if (blocked.has(attendanceKey(operation))) continue;
      if ((await getLocalState()).ownerId !== ownerId)
        return { state: "auth" as const };
      if (!(await syncLease(token))) return { state: "busy" as const };
      let response: Response;
      try {
        response = await fetch("/api/attendance/sync", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(operation),
          signal: AbortSignal.timeout(12_000),
        });
      } catch {
        return { state: "offline" as const };
      }
      if (response.status === 401 || response.status === 403)
        return { state: "auth" as const };
      if (response.status === 409 || response.status === 400) {
        const body = await response.json();
        await recordProblem(operation, {
          message: body.message ?? "Revisa este registro.",
          current: body.current ?? null,
        });
        blocked.add(attendanceKey(operation));
        continue;
      }
      if (!response.ok) return { state: "offline" as const };
      const body = await response.json();
      if (body.revision !== operation.id) return { state: "offline" as const };
      await applyAcknowledgement(operation);
    }
    return { state: "synced" as const };
  } finally {
    await syncLease(token, true);
  }
}
