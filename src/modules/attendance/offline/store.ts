import { openDB, type DBSchema } from "idb";
import type { AttendanceInput } from "../attendance";
import {
  attendanceKey,
  presentFor,
  type AttendanceSnapshot,
  type PendingAttendance,
} from "./types";

type LocalState = {
  ownerId: string | null;
  locked?: boolean;
  epoch: number;
  version?: number;
  lease?: { token: string; until: number };
};
interface AttendanceDB extends DBSchema {
  snapshots: { key: string; value: AttendanceSnapshot };
  pending: {
    key: number;
    value: PendingAttendance;
    indexes: { owner: string };
  };
  meta: { key: string; value: LocalState };
}
export const OFFLINE_DATABASE = "confejas-attendance-v1";
export async function attendanceDB() {
  return openDB<AttendanceDB>(OFFLINE_DATABASE, 1, {
    upgrade(db) {
      db.createObjectStore("snapshots");
      db.createObjectStore("pending", {
        keyPath: "sequence",
        autoIncrement: true,
      }).createIndex("owner", "ownerId");
      db.createObjectStore("meta");
    },
  });
}
const emptyState = (): LocalState => ({ ownerId: null, epoch: 0 });
export async function getLocalState() {
  const db = await attendanceDB();
  try {
    return (await db.get("meta", "state")) ?? emptyState();
  } finally {
    db.close();
  }
}
export function notifyAttendanceChange() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("confejas-attendance");
    channel.postMessage("changed");
    channel.close();
  }
}
export async function lockOfflineAccount() {
  const db = await attendanceDB();
  try {
    const tx = db.transaction("meta", "readwrite");
    const state = (await tx.store.get("state")) ?? emptyState();
    await tx.store.put(
      { ...state, ownerId: null, locked: true, epoch: state.epoch + 1 },
      "state",
    );
    await tx.done;
  } finally {
    db.close();
  }
  notifyAttendanceChange();
}
export async function cacheSnapshot(
  snapshot: AttendanceSnapshot,
  epoch: number,
  activate = false,
  version = 0,
) {
  const db = await attendanceDB();
  try {
    const tx = db.transaction(["meta", "snapshots"], "readwrite");
    const state = (await tx.objectStore("meta").get("state")) ?? emptyState();
    if (
      state.locked ||
      (state.version ?? 0) !== version ||
      state.epoch !== epoch ||
      (!activate && state.ownerId !== snapshot.owner.id)
    ) {
      await tx.done;
      return false;
    }
    if (activate)
      await tx
        .objectStore("meta")
        .put(
          {
            ...state,
            ownerId: snapshot.owner.id,
            epoch: state.ownerId === snapshot.owner.id ? epoch : epoch + 1,
          },
          "state",
        );
    await tx
      .objectStore("snapshots")
      .put(snapshot, `${snapshot.owner.id}:${snapshot.date}`);
    await tx.done;
    return true;
  } finally {
    db.close();
  }
}
export async function readLocalAttendance(date: string) {
  const db = await attendanceDB();
  try {
    const tx = db.transaction(["meta", "snapshots", "pending"]);
    const state = (await tx.objectStore("meta").get("state")) ?? emptyState();
    const owner = state.ownerId;
    const snapshot = owner
      ? await tx.objectStore("snapshots").get(`${owner}:${date}`)
      : undefined;
    const pending = owner
      ? await tx.objectStore("pending").index("owner").getAll(owner)
      : [];
    const dates = owner
      ? (await tx.objectStore("snapshots").getAll())
          .filter((s) => s.owner.id === owner)
          .map((s) => s.date)
          .sort()
      : [];
    await tx.done;
    return { state, snapshot, pending, dates };
  } finally {
    db.close();
  }
}
export async function enqueueAttendance(
  ownerId: string,
  input: AttendanceInput,
) {
  const db = await attendanceDB();
  try {
    const tx = db.transaction(["meta", "snapshots", "pending"], "readwrite");
    const state = await tx.objectStore("meta").get("state");
    if (state?.ownerId !== ownerId)
      throw new Error("La cuenta cambió. Vuelve a abrir asistencia.");
    const snapshot = await tx
      .objectStore("snapshots")
      .get(`${ownerId}:${input.date}`);
    const participant = snapshot?.participants.find(
      (p) => p.id === input.participantId && p.companyId === input.companyId,
    );
    if (!participant)
      throw new Error(
        "Prepara este día con internet antes de registrar asistencia.",
      );
    const chain = (
      await tx.objectStore("pending").index("owner").getAll(ownerId)
    ).filter((p) => attendanceKey(p) === attendanceKey(input));
    if (chain.some((p) => p.problem))
      throw new Error("Resuelve primero el conflicto de este participante.");
    const operation: PendingAttendance = {
      ...input,
      id: crypto.randomUUID(),
      ownerId,
      expectedRevision: chain.at(-1)?.id ?? participant.revision,
      participantName: `${participant.firstNames} ${participant.lastNames}`,
    };
    await tx.objectStore("pending").add(operation);
    await tx.done; // Never report a local save until the transaction is durable.
  } finally {
    db.close();
  }
  notifyAttendanceChange();
}
export async function applyAcknowledgement(operation: PendingAttendance) {
  const db = await attendanceDB();
  try {
    const tx = db.transaction(["meta", "snapshots", "pending"], "readwrite");
    const pending = await tx.objectStore("pending").get(operation.sequence!);
    if (pending?.id !== operation.id) {
      await tx.done;
      return;
    }
    const key = `${operation.ownerId}:${operation.date}`;
    const snapshot = await tx.objectStore("snapshots").get(key);
    if (snapshot) {
      const p = snapshot.participants.find(
        (p) => p.id === operation.participantId,
      );
      if (p) {
        p.present = presentFor(operation.status);
        p.revision = operation.id;
      }
      await tx.objectStore("snapshots").put(snapshot, key);
    }
    await tx.objectStore("pending").delete(operation.sequence!);
    const state = (await tx.objectStore("meta").get("state")) ?? emptyState();
    await tx
      .objectStore("meta")
      .put({ ...state, version: (state.version ?? 0) + 1 }, "state");
    await tx.done;
  } finally {
    db.close();
  }
  notifyAttendanceChange();
}
export async function recordProblem(
  operation: PendingAttendance,
  problem: NonNullable<PendingAttendance["problem"]>,
) {
  const db = await attendanceDB();
  try {
    const tx = db.transaction("pending", "readwrite");
    const current = await tx.store.get(operation.sequence!);
    if (current?.id === operation.id)
      await tx.store.put({ ...current, problem });
    await tx.done;
  } finally {
    db.close();
  }
  notifyAttendanceChange();
}
export async function resolveProblem(
  operation: PendingAttendance,
  keepLocal: boolean,
) {
  const db = await attendanceDB();
  try {
    const tx = db.transaction(["meta", "pending", "snapshots"], "readwrite");
    const state = await tx.objectStore("meta").get("state");
    if (state?.ownerId !== operation.ownerId)
      throw new Error("La cuenta cambió.");
    const chain = (
      await tx.objectStore("pending").index("owner").getAll(operation.ownerId)
    ).filter((p) => attendanceKey(p) === attendanceKey(operation));
    const problem = chain.find((p) => p.id === operation.id)?.problem;
    if (!problem)
      throw new Error("Este conflicto ya fue resuelto. Actualiza la lista.");
    const current = problem.current;
    if (keepLocal && (!current || current.companyId !== operation.companyId))
      throw new Error("Actualiza la lista para revisar la compañía actual.");
    for (const item of chain)
      await tx.objectStore("pending").delete(item.sequence!);
    const key = `${operation.ownerId}:${operation.date}`;
    const snapshot = await tx.objectStore("snapshots").get(key);
    const participant = snapshot?.participants.find(
      (p) => p.id === operation.participantId,
    );
    if (snapshot && participant) {
      if (current?.companyId === participant.companyId) {
        participant.present = current.present;
        participant.revision = current.revision;
      } else
        snapshot.participants = snapshot.participants.filter(
          (p) => p.id !== operation.participantId,
        );
      await tx.objectStore("snapshots").put(snapshot, key);
    }
    await tx
      .objectStore("meta")
      .put({ ...state, version: (state.version ?? 0) + 1 }, "state");
    if (keepLocal && current) {
      const last = chain.at(-1)!;
      const { sequence: _sequence, problem: _problem, ...rest } = last;
      void _sequence;
      void _problem;
      await tx
        .objectStore("pending")
        .add({
          ...rest,
          id: crypto.randomUUID(),
          expectedRevision: current.revision,
        });
    }
    await tx.done;
  } finally {
    db.close();
  }
  notifyAttendanceChange();
}
export async function syncLease(token: string, release = false) {
  const db = await attendanceDB();
  try {
    const tx = db.transaction("meta", "readwrite");
    const state = (await tx.store.get("state")) ?? emptyState();
    if (
      state.lease &&
      state.lease.token !== token &&
      state.lease.until > Date.now()
    ) {
      await tx.done;
      return false;
    }
    state.lease = release ? undefined : { token, until: Date.now() + 60_000 };
    await tx.store.put(state, "state");
    await tx.done;
    return true;
  } finally {
    db.close();
  }
}

export async function unlockOfflineAccountAfterLogin() {
  const db = await attendanceDB();
  try {
    const tx = db.transaction("meta", "readwrite");
    const state = (await tx.store.get("state")) ?? emptyState();
    await tx.store.put(
      { ...state, ownerId: null, locked: false, epoch: state.epoch + 1 },
      "state",
    );
    await tx.done;
  } finally {
    db.close();
  }
  notifyAttendanceChange();
}
