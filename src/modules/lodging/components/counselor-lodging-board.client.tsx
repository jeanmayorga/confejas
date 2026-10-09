"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  assignCounselorRoomAction,
  saveStaffGuestAction,
  removeStaffGuestAction,
} from "../server/counselor-actions";
import type { CounselorLodgingOverview } from "../server/counselor-queries";

type StaffRoom = CounselorLodgingOverview["rooms"][number];

function staffRoomName(room: StaffRoom) {
  return `Habitación ${room.number} staff`;
}

function AddStaffOccupant({
  room,
  people,
}: {
  room: StaffRoom;
  people: CounselorLodgingOverview["people"];
}) {
  const [choice, setChoice] = useState("");
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
              Seleccionar consejero o escribir nombre
            </NativeSelectOption>
            <NativeSelectOption value="manual">
              Escribir otro nombre…
            </NativeSelectOption>
            {candidates.map((person) => (
              <NativeSelectOption key={person.id} value={person.id}>
                {person.name}
                {person.sex === null ? " · Sexo sin registrar" : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
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
          {pending ? "Guardando…" : "Agregar a la habitación"}
        </Button>
      </FieldGroup>
    </form>
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
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => save(true)}
              >
                Quitar
              </Button>
            </div>
          </FieldGroup>
        </form>
      ) : (
        <p className="font-medium">{guest.name}</p>
      )}
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
                  guests.filter((guest) => guest.roomId === room.id).length;
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
  canManage,
}: CounselorLodgingOverview & { canManage: boolean }) {
  const assigned =
    people.filter((person) => person.roomId !== null).length + guests.length;
  const capacity = rooms.reduce((total, room) => total + room.capacity, 0);
  function personRow(person: Person) {
    return (
      <li
        key={person.id}
        className="flex flex-col gap-2 border-t py-3 first:border-t-0"
      >
        <div>
          <p className="font-medium">{person.name}</p>
          <p className="text-sm text-muted-foreground">
            {person.companyName ?? "Sin compañía"}
          </p>
        </div>
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
              {people.filter((person) => person.roomId === null).map(personRow)}
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
                const occupied = occupants.length + roomGuests.length;
                return (
                  <Card key={room.id} id={`room-${room.id}`}>
                    <CardHeader>
                      <CardTitle>{staffRoomName(room)}</CardTitle>
                      <CardDescription>
                        {room.buildingName} · Interior del dormitorio{" "}
                        {room.number}
                      </CardDescription>
                      <Badge variant="secondary">
                        {occupied} / {room.capacity} camas
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <ul>
                        {occupants.map(personRow)}
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
                        <AddStaffOccupant room={room} people={people} />
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
    </div>
  );
}
