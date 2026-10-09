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
  renameStaffRoomAction,
} from "../server/counselor-actions";
import type { CounselorLodgingOverview } from "../server/counselor-queries";

type StaffRoom = CounselorLodgingOverview["rooms"][number];

function staffRoomName(room: StaffRoom) {
  return room.name ?? `Habitación ${room.number} staff`;
}

function StaffRoomNameInput({ room }: { room: StaffRoom }) {
  const [name, setName] = useState(room.name ?? "");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="mb-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await renameStaffRoomAction(room.id, name);
          if (result.success) toast.success(result.message);
          else toast.error(result.message);
        });
      }}
    >
      <FieldGroup className="gap-2">
        <Field>
          <FieldLabel htmlFor={`staff-room-name-${room.id}`}>
            Nombre de la habitación
          </FieldLabel>
          <Input
            id={`staff-room-name-${room.id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder={`Habitación ${room.number} staff`}
            disabled={pending}
          />
        </Field>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={pending || name === (room.name ?? "")}
        >
          {pending ? "Guardando…" : "Guardar nombre"}
        </Button>
      </FieldGroup>
    </form>
  );
}

type Person = CounselorLodgingOverview["people"][number];

function CounselorAssignment({
  person,
  rooms,
  people,
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
                const count = people.filter(
                  (other) => other.roomId === room.id && other.id !== person.id,
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
          {pending ? "Guardando…" : "Guardar asignación"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function CounselorLodgingBoard({
  rooms,
  people,
  canManage,
}: CounselorLodgingOverview & { canManage: boolean }) {
  const assigned = people.filter((person) => person.roomId !== null).length;
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
            {rooms.length} habitaciones internas · {assigned} consejeros
            alojados · {capacity - assigned} de {capacity} camas disponibles
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
                return (
                  <Card key={room.id} id={`room-${room.id}`}>
                    <CardHeader>
                      <CardTitle>{staffRoomName(room)}</CardTitle>
                      <CardDescription>
                        {room.buildingName} · Interior del dormitorio{" "}
                        {room.number}
                      </CardDescription>
                      <Badge variant="secondary">
                        {occupants.length} / {room.capacity} camas
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      {canManage ? (
                        <StaffRoomNameInput
                          key={`${room.id}-${room.name}`}
                          room={room}
                        />
                      ) : null}
                      {occupants.length ? (
                        <ul>{occupants.map(personRow)}</ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Sin consejeros asignados
                        </p>
                      )}
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
