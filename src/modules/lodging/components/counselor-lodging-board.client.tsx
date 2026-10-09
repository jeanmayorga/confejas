"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CounselorAvatarImage } from "@/modules/counselors/components/counselor-avatar-image";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CounselorArrivals,
  CounselorArrivalControl,
} from "./counselor-arrivals.client";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelectOptGroup,
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  moveParticipantToStaffAction,
  assignCounselorRoomAction,
  saveStaffGuestAction,
  removeStaffGuestAction,
} from "../server/counselor-actions";
import { moveLodgingParticipantsAction } from "../server/actions";
import { getStaffRoomName } from "../staff-room";
import type { CounselorLodgingOverview } from "../server/counselor-queries";

function OccupantAvatar({
  name,
  counselorId,
}: {
  name: string;
  counselorId?: string;
}) {
  const parts = name.trim().split(/\s+/);
  const initials =
    `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toLocaleUpperCase(
      "es",
    );
  return (
    <Avatar className="overflow-hidden" aria-hidden="true">
      {counselorId ? <CounselorAvatarImage counselorId={counselorId} /> : null}
      <AvatarFallback>{initials || "?"}</AvatarFallback>
    </Avatar>
  );
}

type StaffRoom = CounselorLodgingOverview["rooms"][number];

function staffRoomName(room: StaffRoom) {
  return `Habitación ${room.number} staff`;
}

function AddStaffOccupant({
  room,
  people,
  participantRows,
}: {
  room: StaffRoom;
  people: CounselorLodgingOverview["people"];
  participantRows: CounselorLodgingOverview["participantRows"];
}) {
  const [choice, setChoice] = useState("");
  const [search, setSearch] = useState("");
  const selectedParticipant = participantRows.find(
    (person) => `participant:${person.id}` === choice,
  );
  const participantCandidates = participantRows.filter(
    (person) =>
      person.sex === (room.sex === "female" ? "Femenino" : "Masculino") &&
      person.roomName !== getStaffRoomName(room.buildingName, room.number) &&
      `${person.firstNames} ${person.lastNames}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const candidates = people.filter(
    (person) =>
      person.roomId === null &&
      (person.sex === room.sex || person.sex === null),
  );
  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result =
            choice === "manual"
              ? await saveStaffGuestAction(room.id, name)
              : selectedParticipant
                ? await moveParticipantToStaffAction({
                    participantId: selectedParticipant.id,
                    roomId: room.id,
                    previousRoomName: selectedParticipant.roomName,
                  })
                : await assignCounselorRoomAction({
                    counselorId: choice,
                    sex: room.sex,
                    roomId: room.id,
                  });
          if (result.success) {
            toast.success(result.message);
            setChoice("");
            setName("");
          } else toast.error(result.message);
        });
      }}
    >
      <FieldGroup className="gap-2">
        <Field>
          <FieldLabel htmlFor={`search-staff-${room.id}`}>
            Buscar participante
          </FieldLabel>
          <Input
            id={`search-staff-${room.id}`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setChoice("");
            }}
            placeholder="Nombre o apellido"
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`add-staff-${room.id}`}>
            Agregar ocupante
          </FieldLabel>
          <NativeSelect
            id={`add-staff-${room.id}`}
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            className="w-full"
            disabled={pending}
            required
          >
            <NativeSelectOption value="">
              Consejero, participante u otro nombre
            </NativeSelectOption>
            <NativeSelectOption value="manual">
              Escribir otro nombre…
            </NativeSelectOption>
            <NativeSelectOptGroup label="Participantes">
              {participantCandidates.slice(0, 30).map((person) => (
                <NativeSelectOption
                  key={person.id}
                  value={`participant:${person.id}`}
                >
                  {person.firstNames} {person.lastNames} ·{" "}
                  {person.roomName ?? "Sin habitación"}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="Consejeros">
              {candidates.map((person) => (
                <NativeSelectOption key={person.id} value={person.id}>
                  {person.name}
                  {person.sex === null ? " · Sexo sin registrar" : ""}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
        </Field>
        {participantCandidates.length > 30 ? (
          <p className="text-xs text-muted-foreground">
            Mostrando 30 participantes. Busca por nombre para encontrar a los
            demás.
          </p>
        ) : null}
        {selectedParticipant ? (
          <p className="text-sm text-muted-foreground">
            Se trasladará desde{" "}
            {selectedParticipant.roomName ?? "sin habitación"} y liberará su
            cama anterior.
          </p>
        ) : null}
        {choice === "manual" ? (
          <Field>
            <FieldLabel htmlFor={`staff-name-${room.id}`}>
              Nombre del ocupante
            </FieldLabel>
            <Input
              id={`staff-name-${room.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              placeholder="Nombre y apellido"
              disabled={pending}
              required
            />
          </Field>
        ) : null}
        {people.some(
          (person) => person.id === choice && person.sex === null,
        ) ? (
          <p className="text-sm text-muted-foreground">
            Se registrará como {room.sex === "female" ? "mujer" : "hombre"} al
            asignarlo a esta habitación.
          </p>
        ) : null}
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending || !choice || (choice === "manual" && !name.trim())}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Guardando…" : "Agregar a la habitación"}
        </Button>
      </FieldGroup>
    </form>
  );
}

function StaffParticipantRow({
  person,
  canManage,
}: {
  person: CounselorLodgingOverview["participantRows"][number];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex flex-col gap-2 border-t py-3">
      <div className="flex min-w-0 items-center gap-2">
        <OccupantAvatar name={`${person.firstNames} ${person.lastNames}`} />
        <Link
          className="min-w-0 break-words font-medium hover:underline"
          href={`/dashboard/participants/${person.id}`}
        >
          {person.firstNames} {person.lastNames}
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">Participante</p>
      {canManage ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await moveLodgingParticipantsAction(
                [{ participantId: person.id, roomName: person.roomName }],
                null,
              );
              if (result.success) toast.success(result.message);
              else toast.error(result.message);
            })
          }
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Quitando…" : "Quitar de la habitación"}
        </Button>
      ) : null}
    </li>
  );
}

function StaffGuestRow({
  guest,
  canManage,
}: {
  guest: CounselorLodgingOverview["guests"][number];
  canManage: boolean;
}) {
  const [name, setName] = useState(guest.name);
  const [pending, startTransition] = useTransition();
  function save(remove = false) {
    startTransition(async () => {
      const result = remove
        ? await removeStaffGuestAction(guest.id)
        : await saveStaffGuestAction(guest.roomId, name, guest.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }
  return (
    <li className="flex flex-col gap-2 border-t py-3">
      <div className="flex min-w-0 items-center gap-2">
        <OccupantAvatar name={guest.name} />
        <p className="min-w-0 break-words font-medium">{guest.name}</p>
      </div>
      {canManage ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <FieldGroup className="gap-2">
            <Field>
              <FieldLabel htmlFor={`guest-${guest.id}`}>
                Nombre del ocupante
              </FieldLabel>
              <Input
                id={`guest-${guest.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                required
                disabled={pending}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={pending || !name.trim() || name === guest.name}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => save(true)}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Quitar
              </Button>
            </div>
          </FieldGroup>
        </form>
      ) : null}
      <p className="text-xs text-muted-foreground">Staff</p>
    </li>
  );
}

type Person = CounselorLodgingOverview["people"][number];

function CounselorAssignment({
  person,
  rooms,
  people,
  guests,
  participantRows,
}: CounselorLodgingOverview & { person: Person }) {
  const [sex, setSex] = useState(person.sex ?? "");
  const [roomId, setRoomId] = useState(person.roomId?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (sex !== "female" && sex !== "male") return;
        startTransition(async () => {
          const result = await assignCounselorRoomAction({
            counselorId: person.id,
            sex,
            roomId: roomId ? Number(roomId) : null,
          });
          if (result.success) toast.success(result.message);
          else toast.error(result.message);
        });
      }}
    >
      <FieldGroup className="gap-2">
        <Field>
          <FieldLabel htmlFor={`sex-${person.id}`}>
            Sexo de {person.name}
          </FieldLabel>
          <NativeSelect
            id={`sex-${person.id}`}
            value={sex}
            disabled={pending}
            required
            onChange={(event) => {
              setSex(event.target.value);
              setRoomId("");
            }}
          >
            <NativeSelectOption value="">
              Pendiente de confirmar
            </NativeSelectOption>
            <NativeSelectOption value="female">Mujer</NativeSelectOption>
            <NativeSelectOption value="male">Hombre</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`room-${person.id}`}>Habitación</FieldLabel>
          <NativeSelect
            className="w-full"
            id={`room-${person.id}`}
            value={roomId}
            disabled={pending || !sex}
            onChange={(event) => setRoomId(event.target.value)}
          >
            <NativeSelectOption value="">Sin asignar</NativeSelectOption>
            {rooms
              .filter((room) => room.sex === sex)
              .map((room) => {
                const count =
                  people.filter(
                    (other) =>
                      other.roomId === room.id && other.id !== person.id,
                  ).length +
                  guests.filter((guest) => guest.roomId === room.id).length +
                  participantRows.filter(
                    (person) =>
                      person.roomName ===
                      getStaffRoomName(room.buildingName, room.number),
                  ).length;
                return (
                  <NativeSelectOption
                    key={room.id}
                    value={room.id}
                    disabled={count >= room.capacity}
                  >
                    {room.buildingName} · {staffRoomName(room)} (
                    {room.capacity - count} cupos)
                  </NativeSelectOption>
                );
              })}
          </NativeSelect>
        </Field>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending || !sex}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Guardando…" : "Guardar asignación"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function CounselorLodgingBoard({
  rooms,
  people,
  guests,
  participantRows,
  canManage,
}: CounselorLodgingOverview & { canManage: boolean }) {
  const assigned =
    people.filter((person) => person.roomId !== null).length +
    guests.length +
    participantRows.filter((person) =>
      rooms.some(
        (room) =>
          person.roomName === getStaffRoomName(room.buildingName, room.number),
      ),
    ).length;
  const capacity = rooms.reduce((total, room) => total + room.capacity, 0);
  function personRow(person: Person) {
    return (
      <li
        key={person.id}
        className="flex flex-col gap-2 border-t py-3 first:border-t-0"
      >
        <div className="flex min-w-0 items-center gap-2">
          <OccupantAvatar name={person.name} counselorId={person.id} />
          <div className="min-w-0">
            <p className="break-words font-medium">{person.name}</p>
            <p className="text-sm text-muted-foreground">
              {person.companyName ?? "Sin compañía"}
            </p>
          </div>
        </div>
        <CounselorArrivalControl person={person} canManage={canManage} />
        {canManage ? (
          <details>
            <summary className="cursor-pointer text-sm">
              Editar asignación
            </summary>
            <div className="pt-3">
              <CounselorAssignment
                key={`${person.id}-${person.sex}-${person.roomId}`}
                person={person}
                rooms={rooms}
                people={people}
                guests={guests}
                participantRows={participantRows}
              />
            </div>
          </details>
        ) : null}
      </li>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6 xl:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Habitaciones de staff</h1>
          <p className="text-sm text-muted-foreground">
            {rooms.length} habitaciones internas · {assigned} ocupantes alojados
            · {capacity - assigned} de {capacity} camas disponibles
          </p>
        </div>
        <Button variant="outline" render={<Link href="/dashboard/lodging" />}>
          Habitaciones de participantes
        </Button>
      </header>
      <Tabs defaultValue="rooms" className="gap-6">
        <TabsList aria-label="Alojamiento de staff">
          <TabsTrigger value="rooms">Habitaciones</TabsTrigger>
          <TabsTrigger value="arrivals">Llegadas</TabsTrigger>
        </TabsList>
        <TabsContent value="arrivals">
          <CounselorArrivals
            people={people}
            rooms={rooms}
            canManage={canManage}
          />
        </TabsContent>
        <TabsContent value="rooms" className="flex flex-col gap-6">
          {people.some((person) => person.roomId === null) ? (
            <Card>
              <CardHeader>
                <CardTitle>Consejeros sin habitación</CardTitle>
                <CardDescription>
                  Confirma su sexo y elige una habitación con cupo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-3">
                  {people
                    .filter((person) => person.roomId === null)
                    .map(personRow)}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          {["female", "male"].map((sex) => (
            <section key={sex} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">
                {sex === "female"
                  ? "Mujeres · Abish y Esther"
                  : "Varones · Ammon y Moroni"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {rooms
                  .filter((room) => room.sex === sex)
                  .map((room) => {
                    const occupants = people.filter(
                      (person) => person.roomId === room.id,
                    );
                    const roomGuests = guests.filter(
                      (guest) => guest.roomId === room.id,
                    );
                    const roomParticipants = participantRows.filter(
                      (person) =>
                        person.roomName ===
                        getStaffRoomName(room.buildingName, room.number),
                    );
                    const occupied =
                      occupants.length +
                      roomGuests.length +
                      roomParticipants.length;
                    return (
                      <Card key={room.id} id={`room-${room.id}`}>
                        <CardHeader>
                          <CardTitle>{staffRoomName(room)}</CardTitle>
                          <CardDescription>
                            {room.buildingName} · Interior del dormitorio{" "}
                            {room.number}
                          </CardDescription>
                          <Badge variant="secondary">
                            {occupied >= room.capacity
                              ? "Completa"
                              : occupied === 0
                                ? "Libre"
                                : "Con cupos"}
                          </Badge>
                          <Progress
                            value={
                              room.capacity > 0
                                ? Math.min(
                                    100,
                                    (occupied / room.capacity) * 100,
                                  )
                                : 0
                            }
                            aria-label={`Ocupación de ${room.buildingName}, ${staffRoomName(room)}`}
                            aria-valuetext={`${occupied} de ${room.capacity} camas ocupadas`}
                          >
                            <ProgressLabel>Camas ocupadas</ProgressLabel>
                            <ProgressValue>
                              {() => `${occupied} / ${room.capacity}`}
                            </ProgressValue>
                          </Progress>
                          <p
                            className="text-sm text-muted-foreground"
                            role="status"
                          >
                            {Math.max(0, room.capacity - occupied)}{" "}
                            {room.capacity - occupied === 1
                              ? "cama libre"
                              : "camas libres"}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <ul>
                            {occupants.map(personRow)}
                            {roomParticipants.map((person) => (
                              <StaffParticipantRow
                                key={person.id}
                                person={person}
                                canManage={canManage}
                              />
                            ))}
                            {roomGuests.map((guest) => (
                              <StaffGuestRow
                                key={`${guest.id}-${guest.name}`}
                                guest={guest}
                                canManage={canManage}
                              />
                            ))}
                          </ul>
                          {occupied === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Sin ocupantes asignados
                            </p>
                          ) : null}
                          {canManage && occupied < room.capacity ? (
                            <AddStaffOccupant
                              room={room}
                              people={people}
                              participantRows={participantRows}
                            />
                          ) : null}
                          {occupied >= room.capacity ? (
                            <p className="text-sm text-muted-foreground">
                              Habitación completa
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
