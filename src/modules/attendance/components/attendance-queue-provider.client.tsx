"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { queueAttendance, readPending, resolvePending } from "../offline/store";
import { synchronizeFinalAttendance } from "../offline/sync";
import type { AttendanceRecord, SavedAttendance } from "../offline/types";

type QueueContext = {
  ready: boolean;
  records: AttendanceRecord[];
  confirmed: Record<string, SavedAttendance>;
  save: (
    input: Omit<AttendanceRecord, "ownerId" | "mutationId">,
  ) => Promise<void>;
  resolve: (participantId: string, keepLocal: boolean) => Promise<void>;
  retry: () => void;
  message: string | null;
};
const Context = createContext<QueueContext | null>(null);
export function useAttendanceQueue() {
  const context = useContext(Context);
  if (!context) throw new Error("Attendance queue provider missing");
  return context;
}

export function AttendanceQueueProvider({
  ownerId,
  children,
}: {
  ownerId: string;
  children: ReactNode;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [confirmed, setConfirmed] = useState<Record<string, SavedAttendance>>(
    {},
  );
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const running = useRef(false);
  const readVersion = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const reload = useCallback(async () => {
    const version = ++readVersion.current;
    const pending = await readPending(ownerId);
    if (version === readVersion.current) {
      setRecords(pending);
      setReady(true);
    }
  }, [ownerId]);

  const retry = useCallback(() => {
    if (
      running.current ||
      !controller.current ||
      controller.current.signal.aborted ||
      !navigator.onLine
    )
      return;
    running.current = true;
    let changed = false;
    const signal = controller.current.signal;
    void synchronizeFinalAttendance(
      ownerId,
      async (participantId, saved) => {
        if (signal.aborted) return;
        if (participantId && saved) {
          changed = true;
          setConfirmed((current) =>
            Date.parse(current[participantId]?.updatedAt ?? "") >
            Date.parse(saved.updatedAt)
              ? current
              : { ...current, [participantId]: saved },
          );
          void queryClient.invalidateQueries({
            queryKey: ["participant-detail", participantId],
          });
        }
        await reload();
        channel.current?.postMessage({ ownerId, participantId, saved });
      },
      signal,
    )
      .then((result) => {
        if (!signal.aborted) setMessage(result);
      })
      .catch(() => {
        if (!signal.aborted)
          setMessage(
            "No se pudo leer el almacenamiento local. Tus cambios pendientes no se eliminaron.",
          );
      })
      .finally(() => {
        running.current = false;
        if (changed && !signal.aborted) router.refresh();
      });
  }, [ownerId, queryClient, reload, router]);

  useEffect(() => {
    const lifecycle = new AbortController();
    controller.current = lifecycle;
    const events =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("confejas-final-attendance");
    channel.current = events;
    const wake = () => {
      void reload()
        .then(retry)
        .catch(() => {
          setMessage(
            "No se puede guardar en este dispositivo. Habilita el almacenamiento del navegador y vuelve a intentarlo.",
          );
        });
    };
    wake();
    if (events)
      events.onmessage = (event) => {
        const data = event.data;
        if (data?.ownerId !== ownerId) return;
        if (data?.participantId && data?.saved) {
          setConfirmed((current) =>
            Date.parse(current[data.participantId]?.updatedAt ?? "") >
            Date.parse(data.saved.updatedAt)
              ? current
              : { ...current, [data.participantId]: data.saved },
          );
          void queryClient.invalidateQueries({
            queryKey: ["participant-detail", data.participantId],
          });
          router.refresh();
        } else if (data?.type === "resolved") router.refresh();
        wake();
      };
    const visible = () => {
      if (document.visibilityState === "visible") wake();
    };
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", visible);
    const interval = setInterval(wake, 15_000);
    return () => {
      lifecycle.abort();
      events?.close();
      clearInterval(interval);
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [ownerId, queryClient, reload, retry, router]);

  const save: QueueContext["save"] = async (input) => {
    const record = await queueAttendance({
      ...input,
      ownerId,
      mutationId: crypto.randomUUID(),
    });
    readVersion.current += 1;
    setRecords((current) => [
      ...current.filter((item) => item.participantId !== record.participantId),
      record,
    ]);
    channel.current?.postMessage({ ownerId, type: "changed" });
    retry();
  };
  const resolve: QueueContext["resolve"] = async (participantId, keepLocal) => {
    await resolvePending(ownerId, participantId, keepLocal);
    setConfirmed((current) => {
      const next = { ...current };
      delete next[participantId];
      return next;
    });
    await reload();
    channel.current?.postMessage({ ownerId, type: "resolved" });
    router.refresh();
    retry();
  };

  return (
    <Context.Provider
      value={{ ready, records, confirmed, save, resolve, retry, message }}
    >
      {children}
    </Context.Provider>
  );
}

export function AttendanceQueueStatus() {
  const { records, message, retry, resolve } = useAttendanceQueue();
  const blocked = records.filter((record) => record.blocked);
  if (!records.length && !message) return null;
  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b bg-amber-50 px-3 py-2 text-xs text-amber-950"
    >
      <span>
        {records.length
          ? records.length === 1
            ? "1 asistencia guardada en este dispositivo, pendiente de envío."
            : `${records.length} asistencias guardadas en este dispositivo, pendientes de envío.`
          : message}
      </span>
      {records.length && message ? <span>{message}</span> : null}
      <Button size="sm" variant="outline" onClick={retry}>
        Reintentar
      </Button>
      {blocked.length ? (
        <Dialog>
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            Revisar ({blocked.length})
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asistencia pendiente</DialogTitle>
              <DialogDescription>
                Estos cambios siguen guardados en tu dispositivo. Revisa cuál
                conservar.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto">
              {blocked.map((record) => (
                <div
                  key={record.participantId}
                  className="space-y-2 rounded-lg border p-3 text-sm"
                >
                  <p className="font-medium">{record.participantName}</p>
                  <p>{record.blocked?.message}</p>
                  <p>En este dispositivo: {record.attended ? "Sí" : "No"}.</p>
                  {record.blocked?.revision ? (
                    <p>
                      En el servidor:{" "}
                      {record.blocked.attended === null
                        ? "Sin registrar"
                        : record.blocked.attended
                          ? "Sí"
                          : "No"}
                      .
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {record.blocked?.revision ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          void resolve(record.participantId, true).catch(() =>
                            toast.error("No se pudo actualizar el pendiente."),
                          )
                        }
                      >
                        Enviar mi selección
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void resolve(record.participantId, false).catch(() =>
                          toast.error("No se pudo actualizar el pendiente."),
                        )
                      }
                    >
                      {record.blocked?.revision
                        ? "Usar la del servidor"
                        : "Descartar pendiente"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
