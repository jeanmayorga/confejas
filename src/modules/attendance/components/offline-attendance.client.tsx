"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  attendanceLabels,
  getAttendanceToday,
  isAttendanceDate,
  type AttendanceStatus,
} from "../attendance";
import { conferenceDays } from "@/modules/itinerary/schedule";
import { AttendanceBoard } from "./attendance-board.client";
import {
  cacheSnapshot,
  enqueueAttendance,
  getLocalState,
  lockOfflineAccount,
  readLocalAttendance,
  resolveProblem,
} from "../offline/store";
import { synchronizeAttendance } from "../offline/sync";
import {
  attendanceKey,
  presentFor,
  type AttendanceSnapshot,
  type PendingAttendance,
} from "../offline/types";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
type LocalData = Awaited<ReturnType<typeof readLocalAttendance>>;

function subscribeInstallMode(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function OfflineAttendance() {
  const [date, setDate] = useState(getAttendanceToday);
  const [companyId, setCompanyId] = useState("");
  const [data, setData] = useState<LocalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState("Comprobando conexión…");
  const [error, setError] = useState("");
  const [authNeeded, setAuthNeeded] = useState(false);
  const [ready, setReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const installed = useSyncExternalStore(
    subscribeInstallMode,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  const [syncing, setSyncing] = useState(false);
  const refreshRunning = useRef(false);
  const dateRef = useRef(date);

  const reloadLocal = useCallback(async () => {
    const selected = dateRef.current;
    const local = await readLocalAttendance(selected);
    if (dateRef.current === selected) setData(local);
    return local;
  }, []);

  const refresh = useCallback(async () => {
    if (refreshRunning.current) return;
    refreshRunning.current = true;
    setSyncing(true);
    try {
      const selected = dateRef.current;
      const initial = await getLocalState();
      if (initial.locked) {
        setAuthNeeded(true);
        setNetwork("Cuenta local cerrada");
        return;
      }
      // Verify the current authenticated identity before showing cached data online.
      const response = await fetch(`/api/attendance?date=${selected}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 401 || response.status === 403) {
        await lockOfflineAccount();
        setAuthNeeded(true);
        setNetwork("Inicia sesión para sincronizar");
        await reloadLocal();
        return;
      }
      if (!response.ok)
        throw new Error("No se pudo contactar con el servidor.");
      const snapshot: AttendanceSnapshot = await response.json();
      const accepted = await cacheSnapshot(
        snapshot,
        initial.epoch,
        true,
        initial.version ?? 0,
      );
      if (!accepted) {
        await reloadLocal();
        return;
      }
      setAuthNeeded(false);
      setError("");
      setNetwork("Con conexión");
      await reloadLocal();
      const result = await synchronizeAttendance();
      if (result.state === "auth") {
        setAuthNeeded(true);
        setNetwork("Inicia sesión con tu cuenta para sincronizar");
        return;
      }
      if (result.state === "offline") {
        setNetwork("Sin conexión · cambios guardados en el dispositivo");
        return;
      }
      // Download every company for today and the conference days, not just visited rosters.
      const downloaded = (await readLocalAttendance(selected)).dates;
      const dates = conferenceDays
        .map((day) => day.date)
        .filter((day) => !downloaded.includes(day));
      for (const day of dates) {
        const state = await getLocalState();
        if (state.ownerId !== snapshot.owner.id) break;
        const res = await fetch(`/api/attendance?date=${day}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) break;
        const next: AttendanceSnapshot = await res.json();
        if (next.owner.id !== state.ownerId) break;
        await cacheSnapshot(next, state.epoch, false, state.version ?? 0);
      }
    } catch {
      setNetwork("Sin conexión · cambios guardados en el dispositivo");
    } finally {
      try {
        await reloadLocal();
      } catch {
        setError(
          "El navegador no permite guardar datos locales. Habilita el almacenamiento para usar asistencia.",
        );
      }
      setLoading(false);
      setSyncing(false);
      refreshRunning.current = false;
    }
  }, [reloadLocal]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (isAttendanceDate(params.get("date"))) {
      dateRef.current = params.get("date")!;
      setDate(dateRef.current);
    }
    setCompanyId(params.get("company") ?? "");
    void refresh();
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOffline = () =>
      setNetwork("Sin conexión · cambios guardados en el dispositivo");
    window.addEventListener("online", refresh);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("confejas-attendance")
        : null;
    if (channel)
      channel.onmessage = () => {
        void reloadLocal().catch(() =>
          setError("No se pudo leer el almacenamiento local."),
        );
      };
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(timer);
      channel?.close();
    };
  }, [refresh, reloadLocal]);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const done = () => {
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/attendance-sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          setReady(true);
          return navigator.storage?.persist?.();
        })
        .catch(() =>
          setError(
            "No se pudo preparar la app sin conexión. Vuelve a intentarlo con internet.",
          ),
        );
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  async function requestBackgroundSync() {
    if (!navigator.serviceWorker?.controller) return;
    const registration = await navigator.serviceWorker.ready;
    const supported = registration as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    };
    await supported.sync?.register("attendance-pending").catch(() => {});
  }
  function navigate(nextDate: string, company: string) {
    dateRef.current = nextDate;
    setDate(nextDate);
    setCompanyId(company);
    window.history.replaceState(
      null,
      "",
      `/asistencia?${new URLSearchParams({ date: nextDate, company })}`,
    );
    void reloadLocal()
      .then(() => refresh())
      .catch(() => setError("No se pudo cargar la lista local."));
  }
  async function save(participantId: string, status: AttendanceStatus) {
    const snapshot = data?.snapshot;
    if (!snapshot || authNeeded)
      throw new Error(
        "Inicia sesión y prepara este día antes de tomar asistencia.",
      );
    await enqueueAttendance(snapshot.owner.id, {
      participantId,
      status,
      companyId: selectedCompany,
      date,
    });
    await reloadLocal();
    void requestBackgroundSync().catch(() => {});
    void refresh();
  }
  async function resolve(item: PendingAttendance, keep: boolean) {
    try {
      await resolveProblem(item, keep);
      await reloadLocal();
      void refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo resolver el cambio.",
      );
    }
  }
  async function login() {
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      window.location.assign(
        new URL("/login?callbackUrl=%2Fasistencia", window.location.origin)
          .href,
      );
    } catch {
      setError(
        "Necesitas conexión para iniciar sesión. Tus cambios pendientes siguen guardados.",
      );
    }
  }
  async function lock() {
    // Pending operations stay attached to their original account for the next sign-in.
    await lockOfflineAccount();
    await reloadLocal();
    setAuthNeeded(true);
    if (navigator.onLine)
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});
  }
  const snapshot = data?.snapshot?.date === date ? data.snapshot : undefined;
  const pending = data?.pending ?? [];
  const pendingByParticipant = new Map(
    pending.filter((p) => p.date === date).map((p) => [p.participantId, p]),
  );
  const roster =
    snapshot?.participants.map((p) => ({
      ...p,
      present: pendingByParticipant.has(p.id)
        ? presentFor(pendingByParticipant.get(p.id)!.status)
        : p.present,
    })) ?? [];
  const companies =
    snapshot?.companies.map((company) => {
      const people = roster.filter((p) => p.companyId === company.id);
      return {
        ...company,
        total: people.length,
        present: people.filter((p) => p.present === true).length,
        absent: people.filter((p) => p.present === false).length,
      };
    }) ?? [];
  const selectedCompany = companies.some((c) => c.id === companyId)
    ? companyId
    : (companies[0]?.id ?? "");
  const problems = pending.filter((p) => p.problem);
  const count = new Set(pending.map(attendanceKey)).size;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <nav
        aria-label="Aplicación de staff"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <a
          href="/dashboard"
          className="font-semibold underline underline-offset-4"
        >
          Confejas · Staff
        </a>
        <div className="flex flex-wrap gap-2">
          {!installed && installEvent ? (
            <Button
              variant="outline"
              onClick={async () => {
                await installEvent.prompt();
                await installEvent.userChoice;
                setInstallEvent(null);
              }}
            >
              Instalar app
            </Button>
          ) : null}
          {data?.state.ownerId ? (
            <Button
              variant="ghost"
              onClick={() =>
                void lock().catch(() =>
                  setError("No se pudo cerrar la cuenta local."),
                )
              }
            >
              Cerrar cuenta local
            </Button>
          ) : null}
        </div>
      </nav>
      <section
        aria-label="Estado de sincronización"
        className="flex flex-col gap-2 rounded-2xl border p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status">{syncing ? "Sincronizando…" : network}</p>
          <Button
            variant="outline"
            disabled={syncing}
            onClick={() => void refresh()}
          >
            Sincronizar ahora
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={count ? "secondary" : "outline"}>
            {authNeeded
              ? "Pendientes conservados en su cuenta original"
              : count
                ? `${count} ${count === 1 ? "registro pendiente" : "registros pendientes"} de sincronizar`
                : "Sin cambios pendientes"}
          </Badge>
          <Badge variant="outline">
            {authNeeded
              ? "Inicia sesión para continuar"
              : ready && snapshot
                ? "Lista disponible sin conexión"
                : "Preparando acceso sin conexión"}
          </Badge>
        </div>
        {snapshot ? (
          <p className="text-sm text-muted-foreground">
            {snapshot.owner.name} · Lista descargada:{" "}
            {new Date(snapshot.downloadedAt).toLocaleString("es-EC")}
          </p>
        ) : null}
        {data?.dates.length ? (
          <p className="text-sm text-muted-foreground">
            Días guardados: {data.dates.join(", ")}. Incluyen todas las
            compañías.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Los cambios se envían al recuperar internet con la app abierta. Si la
          cerraste, ábrela de nuevo para completar la sincronización.
        </p>
        {!installed ? (
          <p className="text-sm text-muted-foreground">
            Para instalar: en Android abre el menú del navegador y elige
            “Instalar aplicación”. En iPhone usa Safari → Compartir → Agregar a
            inicio.
          </p>
        ) : null}
      </section>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {authNeeded ? (
        <p role="alert">
          Inicia sesión con la cuenta que registró la asistencia para enviar sus
          pendientes.{" "}
          <Button variant="link" onClick={() => void login()}>
            Iniciar sesión
          </Button>
        </p>
      ) : null}
      {loading ? <p role="status">Cargando asistencia…</p> : null}
      {!loading && !snapshot && !authNeeded ? (
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">
            Prepara la asistencia con internet
          </h1>
          <p>
            Abre la app e inicia sesión con conexión para descargar las listas.
            Después podrás marcar asistencia y cambiar de compañía sin internet.
          </p>
          <Button variant="link" onClick={() => void login()}>
            Iniciar sesión
          </Button>
          <Field>
            <FieldLabel htmlFor="offline-date">Fecha</FieldLabel>
            <Input
              id="offline-date"
              type="date"
              value={date}
              onChange={(e) => {
                if (isAttendanceDate(e.target.value))
                  navigate(e.target.value, companyId);
              }}
            />
          </Field>
        </section>
      ) : null}
      {problems.map((item) => {
        const last = pending
          .filter((p) => attendanceKey(p) === attendanceKey(item))
          .at(-1)!;
        const current = item.problem!.current;
        const serverLabel = !current
          ? "Ya no disponible"
          : attendanceLabels[
              current.present === null
                ? "unrecorded"
                : current.present
                  ? "present"
                  : "absent"
            ];
        return (
          <section
            key={item.id}
            role="alert"
            className="flex flex-col gap-2 rounded-2xl border p-4"
          >
            <h2 className="font-semibold">
              Revisar: {item.participantName} · {item.date}
            </h2>
            <p>{item.problem!.message}</p>
            <p>
              En este dispositivo: {attendanceLabels[last.status]}. En el
              servidor: {serverLabel}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void resolve(item, false)}
              >
                Conservar servidor
              </Button>
              <Button
                disabled={!current || current.companyId !== item.companyId}
                onClick={() => void resolve(item, true)}
              >
                Conservar mi cambio
              </Button>
            </div>
          </section>
        );
      })}
      {!loading && snapshot && !authNeeded ? (
        <AttendanceBoard
          key={`${date}:${selectedCompany}`}
          date={date}
          companies={companies}
          companyId={selectedCompany}
          participants={roster.filter((p) => p.companyId === selectedCompany)}
          onNavigate={navigate}
          onSave={save}
          onRefresh={refresh}
        />
      ) : null}
    </main>
  );
}
