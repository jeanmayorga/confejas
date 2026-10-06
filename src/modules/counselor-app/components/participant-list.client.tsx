"use client";

import { useState } from "react";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getParticipantInitials } from "@/modules/participants/components/participant-details.client";
import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";

export type CounselorParticipantListItem = {
  id: string;
  sourceRecordId: number | null;
  firstNames: string;
  lastNames: string;
  preferredName: string | null;
  age: number | null;
  status: ParticipantStatus;
  wardName: string;
  stakeName: string;
};

type CounselorParticipantListProps = {
  participants: CounselorParticipantListItem[];
};

const participantStatusClassNames = {
  registered: "border-transparent bg-muted text-muted-foreground",
  confirmed:
    "border-transparent bg-participant-confirmed/10 text-participant-confirmed",
  arrived:
    "border-transparent bg-participant-arrived/10 text-participant-arrived",
  cancelled:
    "border-transparent bg-participant-cancelled/10 text-participant-cancelled",
  pending:
    "border-transparent bg-participant-pending/10 text-participant-pending",
} satisfies Record<ParticipantStatus, string>;

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

function isToArrive(status: ParticipantStatus) {
  return status === "registered" || status === "confirmed" || status === "pending";
}

export function CounselorParticipantList({
  participants,
}: CounselorParticipantListProps) {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const normalizedSearch = normalizeSearchValue(search);
  const matchingParticipants = normalizedSearch
    ? participants.filter((participant) =>
        normalizeSearchValue(
          [
            participant.firstNames,
            participant.lastNames,
            participant.preferredName,
            participant.sourceRecordId,
            participant.wardName,
            participant.stakeName,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(normalizedSearch),
      )
    : participants;
  const toArriveCount = matchingParticipants.filter((participant) =>
    isToArrive(participant.status),
  ).length;
  const arrivedCount = matchingParticipants.filter(
    (participant) => participant.status === "arrived",
  ).length;
  const visibleParticipants = matchingParticipants.filter((participant) =>
    selectedFilter === "arrived"
      ? participant.status === "arrived"
      : selectedFilter === "to-arrive"
        ? isToArrive(participant.status)
        : true,
  );

  return (
    <div className="flex flex-col gap-4">
      <InputGroup className="h-11 rounded-full bg-background">
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Buscar participante"
          aria-label="Buscar participante"
        />
      </InputGroup>

      <Tabs
        value={selectedFilter}
        onValueChange={setSelectedFilter}
        className="w-full"
      >
        <TabsList
          aria-label="Filtrar participantes por llegada"
          className="grid h-11 w-full grid-cols-3"
        >
          {[
            { value: "all", label: "Todos", count: matchingParticipants.length },
            { value: "to-arrive", label: "Por llegar", count: toArriveCount },
            { value: "arrived", label: "Ya llegaron", count: arrivedCount },
          ].map((filter) => (
            <TabsTrigger
              key={filter.value}
              value={filter.value}
              className="min-w-0 gap-1 px-1 text-xs"
            >
              {filter.label}
              <span
                className={cn(
                  "min-w-5 rounded-full bg-muted-foreground/15 px-1 text-center text-[10px] font-semibold tabular-nums",
                  selectedFilter === filter.value && "bg-primary/10 text-primary",
                )}
              >
                {filter.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {normalizedSearch ? (
        <p role="status" className="text-xs text-muted-foreground">
          {visibleParticipants.length}{" "}
          {visibleParticipants.length === 1 ? "resultado" : "resultados"}
        </p>
      ) : null}

      {visibleParticipants.length > 0 ? (
        <div className="flex flex-col gap-2">
          {visibleParticipants.map((participant) => {
            const fullName = `${participant.firstNames} ${participant.lastNames}`;

            return (
              <Card key={participant.id} className="gap-0 py-0 shadow-none">
                <CardContent className="p-0">
                  <Link
                    href={`/consejero/participantes/${participant.id}`}
                    aria-label={`Ver a ${fullName}`}
                    className="group flex min-h-20 items-center gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Avatar className="size-10 shrink-0" aria-hidden>
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {getParticipantInitials(
                          participant.firstNames,
                          participant.lastNames,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-5">
                        {fullName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {participant.age === null
                          ? participant.wardName
                          : `${participant.age} años · ${participant.wardName}`}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            participantStatusClassNames[participant.status],
                          )}
                        >
                          {getParticipantStatusLabel(participant.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {participant.sourceRecordId
                            ? `# ${participant.sourceRecordId}`
                            : "Sin número"}
                        </span>
                      </div>
                    </div>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-none">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {participants.length === 0
              ? "Todavía no hay participantes en tu compañía."
              : normalizedSearch
                ? "No encontramos participantes con esa búsqueda y filtro."
                : selectedFilter === "arrived"
                  ? "Todavía no ha llegado ningún participante."
                  : "No hay participantes por llegar."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
