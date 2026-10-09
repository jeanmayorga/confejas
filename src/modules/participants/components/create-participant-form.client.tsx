"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  availableCompanies,
  availableRooms,
  participantAge,
  suggestCompany,
  suggestCompanyByAvailability,
  resolveAssignmentSelection,
} from "../assignment-suggestions";
import {
  createParticipantAction,
  getParticipantAssignmentOptionsAction,
} from "../server/actions";

const NONE = "__none__";

type Choice = { value: string; label: string };
function FormSelect({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  options: Choice[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Field data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value || NONE}
        onValueChange={(next) => {
          if (next) onChange(next === NONE ? "" : next);
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue>
            {options.find((option) => option.value === value)?.label ??
              placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            <SelectItem value={NONE}>{placeholder}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function CreateParticipantForm({
  wards,
  stakes,
  onCancel,
  onSuccess,
}: {
  wards: { id: number; name: string; stakeId: number }[];
  stakes: { id: number; name: string }[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [stakeId, setStakeId] = useState("");
  const [wardId, setWardId] = useState("");
  const [roomName, setRoomName] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const options = useQuery({
    queryKey: ["participant-assignment-options"],
    queryFn: () => getParticipantAssignmentOptionsAction(),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const rooms = availableRooms(options.data?.rooms ?? [], sex);
  const companies = availableCompanies(options.data?.companies ?? [], sex);
  const age = participantAge(birthDate);
  const suggestedRoom = rooms[0];
  const ageSuggestion = suggestCompany(companies, age);
  const suggestedCompany =
    ageSuggestion ?? suggestCompanyByAvailability(companies, sex);
  const selectedRoom = resolveAssignmentSelection(
    roomName,
    suggestedRoom?.name,
    rooms.map((room) => room.name),
  );
  const selectedCompany = resolveAssignmentSelection(
    companyId,
    suggestedCompany?.id,
    companies.map((company) => company.id),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || options.isFetching) return;
    const data = new FormData(event.currentTarget);
    data.set("sex", sex);
    data.set("wardId", wardId);
    data.set("roomName", selectedRoom);
    data.set("companyId", selectedCompany);
    startTransition(async () => {
      try {
        const result = await createParticipantAction(data);
        if (!result.success) {
          toast.error(result.message);
          void options.refetch();
          return;
        }
        toast.success(result.message);
        router.refresh();
        onSuccess();
      } catch {
        toast.error("No se pudo crear el participante. Inténtalo nuevamente.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="create-firstNames">Nombres *</FieldLabel>
            <Input
              id="create-firstNames"
              name="firstNames"
              autoComplete="given-name"
              maxLength={160}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="create-lastNames">Apellidos *</FieldLabel>
            <Input
              id="create-lastNames"
              name="lastNames"
              autoComplete="family-name"
              maxLength={160}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="create-birthDate">
              Fecha de nacimiento
            </FieldLabel>
            <Input
              id="create-birthDate"
              name="birthDate"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              max={new Date().toLocaleDateString("en-CA")}
            />
          </Field>
          <FormSelect
            id="create-sex"
            label="Sexo"
            value={sex}
            options={["Masculino", "Femenino", "Otro"].map((value) => ({
              value,
              label: value,
            }))}
            placeholder="Selecciona el sexo"
            onChange={(value) => {
              setSex(value);
              setRoomName(null);
              setCompanyId(null);
            }}
          />
          <FormSelect
            id="create-stake"
            label="Estaca *"
            value={stakeId}
            options={stakes.map((stake) => ({
              value: String(stake.id),
              label: stake.name,
            }))}
            placeholder="Selecciona una estaca"
            onChange={(value) => {
              setStakeId(value);
              setWardId("");
            }}
          />
          <FormSelect
            id="create-ward"
            label="Barrio *"
            value={wardId}
            options={wards
              .filter((ward) => String(ward.stakeId) === stakeId)
              .map((ward) => ({ value: String(ward.id), label: ward.name }))}
            placeholder="Selecciona un barrio"
            onChange={setWardId}
            disabled={!stakeId}
          />
        </FieldGroup>
        <FieldGroup className="gap-4">
          <div className="flex flex-col gap-2">
            <FormSelect
              id="create-room"
              label="Alojamiento"
              value={selectedRoom}
              options={rooms.map((room) => ({
                value: room.name,
                label: `${room.name} · ${room.available} cupos${room === suggestedRoom ? " · Sugerido" : ""}`,
              }))}
              placeholder="Sin asignar"
              onChange={setRoomName}
              disabled={options.isPending || !rooms.length}
            />
            {options.isPending || options.isError ? null : suggestedRoom ? (
              <FieldDescription>
                Sugerido por sexo y disponibilidad:{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => setRoomName(suggestedRoom.name)}
                >
                  {suggestedRoom.name}
                </Button>
              </FieldDescription>
            ) : (
              <FieldDescription>
                {!sex || sex === "Otro"
                  ? "Selecciona Masculino o Femenino para ver alojamientos compatibles."
                  : "No hay alojamiento disponible para este sexo."}
              </FieldDescription>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <FormSelect
              id="create-company"
              label="Compañía"
              value={selectedCompany}
              options={companies.map((company) => ({
                value: company.id,
                label: `${company.name} · ${Math.min(company.available, sex === "Femenino" ? company.femaleAvailable : company.maleAvailable)} cupos${company.id === suggestedCompany?.id ? " · Sugerida" : ""}`,
              }))}
              placeholder="Sin asignar"
              onChange={setCompanyId}
              disabled={options.isPending || !companies.length}
            />
            <FieldDescription>
              {options.isPending ||
              options.isError ? null : suggestedCompany ? (
                <>
                  {ageSuggestion
                    ? `Para ${age} años: `
                    : "Sugerida por disponibilidad: "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => setCompanyId(suggestedCompany.id)}
                  >
                    {suggestedCompany.name}
                  </Button>{" "}
                  {ageSuggestion
                    ? `(edad promedio: ${Math.round(ageSuggestion.averageAge!)} años).`
                    : null}
                </>
              ) : !sex || sex === "Otro" ? (
                "Selecciona Masculino o Femenino para consultar los cupos."
              ) : !companies.length ? (
                "No hay compañías con cupo para este sexo."
              ) : age === null ? (
                "Ingresa la fecha de nacimiento para sugerir una compañía."
              ) : (
                "No hay datos de edad suficientes para sugerir una compañía; puedes elegir cualquiera con cupo."
              )}
            </FieldDescription>
          </div>
          {options.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Consultando cupos…
            </p>
          ) : options.isError ? (
            <p role="alert" className="text-sm text-destructive">
              No se pudieron consultar los cupos.{" "}
              <Button
                type="button"
                variant="link"
                onClick={() => void options.refetch()}
              >
                Reintentar
              </Button>
            </p>
          ) : null}
          <FieldDescription>
            Seleccionamos automáticamente las opciones sugeridas. Puedes
            cambiarlas o elegir «Sin asignar». Los cupos se verifican al
            guardar.
          </FieldDescription>
        </FieldGroup>
      </fieldset>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || options.isFetching || !wardId}
        >
          {pending ? "Guardando…" : "Crear participante"}
        </Button>
      </div>
    </form>
  );
}
