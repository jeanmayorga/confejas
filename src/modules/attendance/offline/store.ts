import { openDB, type DBSchema } from "idb";
import type {
  AttendanceMutation,
  AttendanceRecord,
  SavedAttendance,
} from "./types";

interface AttendanceDB extends DBSchema {
  confirmed: {
    key: [string, string];
    value: SavedAttendance & { ownerId: string; participantId: string };
  };
  pending: {
    key: [string, string];
    value: AttendanceRecord;
    indexes: { owner: string };
  };
}

export function openAttendanceDB() {
  return openDB<AttendanceDB>("confejas-final-attendance-v1", 1, {
    upgrade(db) {
      db.createObjectStore("confirmed", {
        keyPath: ["ownerId", "participantId"],
      });
      db.createObjectStore("pending", {
        keyPath: ["ownerId", "participantId"],
      }).createIndex("owner", "ownerId");
    },
  });
}

// Short connections avoid keeping old IndexedDB versions open in inactive tabs.
export async function readPending(ownerId: string) {
  const db = await openAttendanceDB();
  try {
    return await db.getAllFromIndex("pending", "owner", ownerId);
  } finally {
    db.close();
  }
}

export async function queueAttendance(input: AttendanceRecord) {
  const db = await openAttendanceDB();
  try {
    const tx = db.transaction(["pending", "confirmed"], "readwrite", {
      durability: "strict",
    });
    const previous = await tx
      .objectStore("pending")
      .get([input.ownerId, input.participantId]);
    const confirmed = await tx
      .objectStore("confirmed")
      .get([input.ownerId, input.participantId]);
    const latestRevision =
      confirmed &&
      Date.parse(confirmed.updatedAt) > Date.parse(input.serverUpdatedAt)
        ? confirmed.revision
        : input.expectedRevision;
    const record: AttendanceRecord = {
      ...input,
      expectedRevision: previous?.expectedRevision ?? latestRevision,
      inFlight: previous?.inFlight,
      blocked: previous?.blocked,
    };
    await tx.objectStore("pending").put(record);
    await tx.done;
    return record;
  } finally {
    db.close();
  }
}

export async function nextRequest(ownerId: string, participantId: string) {
  const db = await openAttendanceDB();
  try {
    const tx = db.transaction("pending", "readwrite", { durability: "strict" });
    const record = await tx.store.get([ownerId, participantId]);
    if (!record || record.blocked) {
      await tx.done;
      return null;
    }
    const inFlight = record.inFlight ?? {
      ownerId,
      participantId,
      companyId: record.companyId,
      attended: record.attended,
      expectedRevision: record.expectedRevision,
      mutationId: record.mutationId,
    };
    await tx.store.put({ ...record, inFlight });
    await tx.done;
    return inFlight;
  } finally {
    db.close();
  }
}

export async function acknowledge(
  input: AttendanceMutation,
  saved: SavedAttendance,
) {
  const db = await openAttendanceDB();
  try {
    const tx = db.transaction(["pending", "confirmed"], "readwrite", {
      durability: "strict",
    });
    const key: [string, string] = [input.ownerId, input.participantId];
    const current = await tx.objectStore("pending").get(key);
    if (current?.inFlight?.mutationId === input.mutationId) {
      await tx
        .objectStore("confirmed")
        .put({
          ...saved,
          ownerId: input.ownerId,
          participantId: input.participantId,
        });
      if (current.mutationId === input.mutationId)
        await tx.objectStore("pending").delete(key);
      else
        await tx
          .objectStore("pending")
          .put({
            ...current,
            inFlight: undefined,
            expectedRevision: input.mutationId,
          });
    }
    await tx.done;
  } finally {
    db.close();
  }
}

export async function blockRequest(
  input: AttendanceMutation,
  blocked: NonNullable<AttendanceRecord["blocked"]>,
) {
  const db = await openAttendanceDB();
  try {
    const tx = db.transaction("pending", "readwrite", { durability: "strict" });
    const current = await tx.store.get([input.ownerId, input.participantId]);
    if (current?.inFlight?.mutationId === input.mutationId) {
      await tx.store.put({ ...current, inFlight: undefined, blocked });
    }
    await tx.done;
  } finally {
    db.close();
  }
}

export async function resolvePending(
  ownerId: string,
  participantId: string,
  keepLocal: boolean,
) {
  const db = await openAttendanceDB();
  try {
    const tx = db.transaction("pending", "readwrite", { durability: "strict" });
    const key: [string, string] = [ownerId, participantId];
    const current = await tx.store.get(key);
    if (current?.blocked) {
      if (!keepLocal) await tx.store.delete(key);
      else if (current.blocked.revision)
        await tx.store.put({
          ...current,
          mutationId: crypto.randomUUID(),
          expectedRevision: current.blocked.revision,
          blocked: undefined,
          inFlight: undefined,
        });
    }
    await tx.done;
  } finally {
    db.close();
  }
}
