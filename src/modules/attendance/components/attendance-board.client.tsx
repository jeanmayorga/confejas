"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  attendanceLabels,
  isAttendanceDate,
  isAttendanceStatus,
  type AttendanceCompany,
  type AttendanceParticipant,
  type AttendanceStatus,
} from "../attendance";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function AttendanceBoard({
  date,
  companies,
  companyId,
  participants,
  onNavigate,
  onSave,
  onRefresh,
}: {
  date: string;
  companies: AttendanceCompany[];
  companyId: string;
  participants: AttendanceParticipant[];
  onNavigate: (date: string, companyId: string) => void;
  onSave: (participantId: string, status: AttendanceStatus) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [navigating, startNavigation] = useTransition();
  const busy = saving || navigating;
  const companyIndex = companies.findIndex(
    (company) => company.id === companyId,
  );
  const company = companies[companyIndex];
  const query = normalize(search);
  const visible = participants.filter((participant) => {
    const status =
      participant.present === null
        ? "unrecorded"
        : participant.present
          ? "present"
          : "absent";
    return (
      (filter === "all" || status === filter) &&
      normalize(
        `${participant.firstNames} ${participant.lastNames} ${participant.preferredName ?? ""} ${participant.wardName}`,
      ).includes(query)
    );
  });

  function navigate(nextDate: string, nextCompany: string) {
    startNavigation(() => {
      onNavigate(nextDate, nextCompany);
    });
  }

  function save(participantId: string, status: AttendanceStatus) {
    setSavingId(participantId);
    setError("");
    setMessage("");
    startSave(async () => {
      try {
        await onSave(participantId, status);
        setMessage("Guardado en este dispositivo.");
      } catch (cause) {
        const text =
          cause instanceof Error
            ? cause.message
            : "No se pudo guardar en este dispositivo. No cierres la app e inténtalo de nuevo.";
        setError(text);
        toast.error(text);
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Toma la asistencia del día, compañía por compañía. Cada cambio se
          guarda en este dispositivo y se sincroniza cuando hay conexión.
        </p>
      </header>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="attendance-date">Fecha de asistencia</FieldLabel>
          <Input
            id="attendance-date"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={date}
            disabled={busy}
            onChange={(event) => {
              if (isAttendanceDate(event.target.value))
                navigate(event.target.value, companyId);
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="attendance-company">Compañía</FieldLabel>
          <NativeSelect
            id="attendance-company"
            className="w-full"
            value={companyId}
            disabled={busy || !companies.length}
            onChange={(event) => navigate(date, event.target.value)}
          >
            {!companies.length ? (
              <NativeSelectOption value="">Sin compañías</NativeSelectOption>
            ) : null}
            {companies.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name} · {item.present + item.absent}/{item.total}{" "}
                registrados
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </FieldGroup>

      {company ? (
        <>
          <section
            aria-label="Resumen de asistencia"
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{company.name}</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={busy || companyIndex <= 0}
                  onClick={() => navigate(date, companies[companyIndex - 1].id)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || companyIndex >= companies.length - 1}
                  onClick={() => navigate(date, companies[companyIndex + 1].id)}
                >
                  Siguiente compañía
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" aria-live="polite">
              <Badge variant="secondary">{company.total} participantes</Badge>
              <Badge>{company.present} llegaron</Badge>
              <Badge variant="secondary">{company.absent} no llegaron</Badge>
              <Badge variant="outline">
                {company.total - company.present - company.absent} sin registrar
              </Badge>
            </div>
          </section>

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="attendance-search">
                Buscar participante
              </FieldLabel>
              <Input
                id="attendance-search"
                type="search"
                placeholder="Nombre, apellido o barrio…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="attendance-filter">Mostrar</FieldLabel>
              <NativeSelect
                id="attendance-filter"
                className="w-full"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <NativeSelectOption value="all">Todos</NativeSelectOption>
                {Object.entries(attendanceLabels).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p role="status">
              {navigating
                ? "Cargando asistencia…"
                : saving
                  ? "Guardando asistencia…"
                  : message || `${visible.length} participantes en la lista`}
            </p>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => startNavigation(() => onRefresh())}
            >
              Actualizar lista
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <ul
            aria-label="Participantes de la compañía"
            aria-busy={busy}
            className="flex flex-col divide-y rounded-2xl border"
          >
            {visible.map((participant) => {
              const status =
                participant.present === null
                  ? "unrecorded"
                  : participant.present
                    ? "present"
                    : "absent";
              const name = `${participant.firstNames} ${participant.lastNames}`;
              return (
                <li
                  key={participant.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-muted-foreground">
                      {participant.preferredName
                        ? `${participant.preferredName} · `
                        : ""}
                      {participant.wardName}
                    </p>
                    <p className="mt-1 text-sm">
                      {saving && savingId === participant.id
                        ? "Guardando…"
                        : attendanceLabels[status]}
                    </p>
                  </div>
                  <ToggleGroup
                    aria-label={`Asistencia de ${name}`}
                    variant="outline"
                    value={[status]}
                    disabled={busy}
                    className="shrink-0 flex-wrap"
                    onValueChange={(values) => {
                      const next = values[0];
                      if (isAttendanceStatus(next) && next !== status)
                        save(participant.id, next);
                    }}
                  >
                    <ToggleGroupItem value="present" className="min-h-11">
                      Llegó
                    </ToggleGroupItem>
                    <ToggleGroupItem value="absent" className="min-h-11">
                      No llegó
                    </ToggleGroupItem>
                    <ToggleGroupItem value="unrecorded" className="min-h-11">
                      Sin registrar
                    </ToggleGroupItem>
                  </ToggleGroup>
                </li>
              );
            })}
          </ul>
          {!visible.length ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Sin participantes</EmptyTitle>
                <EmptyDescription>
                  {participants.length
                    ? "No hay participantes que coincidan con la búsqueda o el estado seleccionado."
                    : "Esta compañía todavía no tiene participantes asignados."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay compañías</EmptyTitle>
            <EmptyDescription>
              Crea compañías y asigna participantes para tomar asistencia.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
