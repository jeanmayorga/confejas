"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { setCounselorArrivalAction } from "../server/counselor-actions";
import type { CounselorLodgingOverview } from "../server/counselor-queries";

type Person = CounselorLodgingOverview["people"][number];

const arrivalDateFormat = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guayaquil",
});

export function CounselorArrivalControl({
  person,
  canManage,
}: {
  person: Person;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const arrived = person.arrivedAt !== null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={arrived ? "default" : "outline"}>
        {arrived ? "Llegó" : "No ha llegado"}
      </Badge>
      {person.arrivedAt ? (
        <time
          dateTime={person.arrivedAt.toISOString()}
          className="text-xs text-muted-foreground"
        >
          {arrivalDateFormat.format(person.arrivedAt)}
        </time>
      ) : null}
      {canManage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          aria-label={`${arrived ? "Marcar como no ha llegado" : "Registrar llegada de"} ${person.name}`}
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await setCounselorArrivalAction({
                  counselorId: person.id,
                  arrived: !arrived,
                });
                if (result.success) toast.success(result.message);
                else toast.error(result.message);
              } catch {
                toast.error(
                  "No se pudo guardar la llegada. Inténtalo nuevamente.",
                );
              }
            })
          }
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending
            ? "Guardando…"
            : arrived
              ? "Marcar no ha llegado"
              : "Registrar llegada"}
        </Button>
      ) : null}
    </div>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function CounselorArrivals({
  people,
  rooms,
  canManage,
}: {
  people: CounselorLodgingOverview["people"];
  rooms: CounselorLodgingOverview["rooms"];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const arrivedCount = people.filter(
    (person) => person.arrivedAt !== null,
  ).length;
  const roomNames = new Map(
    rooms.map((room) => [
      room.id,
      `${room.buildingName} · Habitación ${room.number} staff`,
    ]),
  );
  const matches = people.filter((person) =>
    normalize(`${person.name} ${person.companyName ?? ""}`).includes(
      normalize(search.trim()),
    ),
  );
  const filters = [
    { value: "all", label: "Todos", count: people.length },
    {
      value: "pending",
      label: "No llegaron",
      count: people.length - arrivedCount,
    },
    { value: "arrived", label: "Llegaron", count: arrivedCount },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Llegadas de consejeros</h2>
        <p className="text-sm text-muted-foreground" role="status">
          {arrivedCount} de {people.length} llegaron ·{" "}
          {people.length - arrivedCount} pendientes
        </p>
      </div>
      <Field className="max-w-md">
        <FieldLabel htmlFor="counselor-arrival-search">
          Buscar consejero o compañía
        </FieldLabel>
        <Input
          id="counselor-arrival-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nombre o compañía"
        />
      </Field>
      <Tabs defaultValue="all" className="gap-4">
        <TabsList aria-label="Filtrar por llegada" className="h-auto flex-wrap">
          {filters.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label} ({filter.count})
            </TabsTrigger>
          ))}
        </TabsList>
        {filters.map((filter) => {
          const visible = matches.filter(
            (person) =>
              filter.value === "all" ||
              (filter.value === "arrived"
                ? person.arrivedAt !== null
                : person.arrivedAt === null),
          );
          return (
            <TabsContent key={filter.value} value={filter.value}>
              {visible.length ? (
                <ul className="divide-y">
                  {visible.map((person) => (
                    <li
                      key={person.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-medium">{person.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {person.companyName ?? "Sin compañía"} ·{" "}
                          {person.roomId === null
                            ? "Sin habitación"
                            : (roomNames.get(person.roomId) ??
                              "Sin habitación")}
                        </p>
                      </div>
                      <CounselorArrivalControl
                        person={person}
                        canManage={canManage}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Sin consejeros para mostrar</EmptyTitle>
                    <EmptyDescription>
                      {people.length
                        ? "Prueba otra búsqueda o cambia el filtro de llegada."
                        : "Los consejeros registrados aparecerán aquí."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
