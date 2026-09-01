"use client";

import { type FormEvent, useRef, useTransition } from "react";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import FloppyDiskIcon from "@hugeicons/core-free-icons/FloppyDiskIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { LodgingBuildingOverview } from "@/modules/lodging/server/queries";
import {
  createParticipantAction,
  lookupEcuadorianCitizenAction,
  updateParticipantAction,
} from "@/modules/participants/server/actions";

type ParticipantFormValue = {
  id: string;
  firstNames: string;
  lastNames: string;
  governmentId: string | null;
  preferredName: string | null;
  birthDate: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  shirtSize: string | null;
  isChurchMember: boolean | null;
  wardId: number;
  companyId: string | null;
  roomName: string | null;
  bloodType: string | null;
  chronicCondition: string | null;
  medicalTreatment: string | null;
  insuranceProvider: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

type ParticipantFormProps = {
  participant?: ParticipantFormValue;
  lodgingBuildings: LodgingBuildingOverview[];
  companies: { id: string; name: string }[];
  wards: { id: number; name: string }[];
  presentation?: "page" | "sheet";
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function ParticipantForm({
  participant,
  lodgingBuildings,
  companies,
  wards,
  presentation = "page",
  onCancel,
  onSuccess,
}: ParticipantFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [lookupPending, startLookupTransition] = useTransition();
  const editing = Boolean(participant);

  function handleGovernmentIdLookup() {
    const form = formRef.current;
    const governmentIdField = form?.elements.namedItem("governmentId");

    if (!(governmentIdField instanceof HTMLInputElement)) {
      return;
    }

    startLookupTransition(async () => {
      const result = await lookupEcuadorianCitizenAction(governmentIdField.value);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const currentForm = formRef.current;
      if (!currentForm) {
        return;
      }

      const fieldValues = {
        firstNames: result.data.firstNames,
        lastNames: result.data.lastNames,
        birthDate: result.data.birthDate,
        sex: result.data.sex,
      };
      let filledFields = 0;

      for (const [name, value] of Object.entries(fieldValues)) {
        if (!value) {
          continue;
        }

        const field = currentForm.elements.namedItem(name);
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
          field.value = value;
          filledFields += 1;
        }
      }

      if (filledFields === 0) {
        toast.info("EcuadorAPI encontró la cédula, pero no devolvió datos para completar.");
        return;
      }

      toast.success(
        filledFields === 1
          ? "Se completó 1 campo con EcuadorAPI."
          : `Se completaron ${filledFields} campos con EcuadorAPI.`,
      );
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = participant
        ? await updateParticipantAction(participant.id, formData)
        : await createParticipantAction(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();

      if (onSuccess) {
        onSuccess();
        return;
      }

      router.push("/dashboard/participants");
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card size={presentation === "sheet" ? "sm" : "default"}>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>
            Los nombres y apellidos son los únicos campos obligatorios de esta sección.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="firstNames">Nombres</FieldLabel>
              <Input
                id="firstNames"
                name="firstNames"
                defaultValue={participant?.firstNames}
                maxLength={160}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastNames">Apellidos</FieldLabel>
              <Input
                id="lastNames"
                name="lastNames"
                defaultValue={participant?.lastNames}
                maxLength={160}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="preferredName">Nombre de preferencia</FieldLabel>
              <Input
                id="preferredName"
                name="preferredName"
                defaultValue={participant?.preferredName ?? ""}
                maxLength={120}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="governmentId">
                Cédula o documento de identidad
              </FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="governmentId"
                  name="governmentId"
                  defaultValue={participant?.governmentId ?? ""}
                  placeholder="Ej. 0912345678"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={32}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={lookupPending || pending}
                  onClick={handleGovernmentIdLookup}
                >
                  {lookupPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <HugeiconsIcon
                      icon={Search01Icon}
                      strokeWidth={2}
                      data-icon="inline-start"
                    />
                  )}
                  {lookupPending ? "Consultando…" : "Consultar"}
                </Button>
              </div>
              <FieldDescription>
                Consulta una cédula ecuatoriana para completar nombres, apellidos,
                fecha de nacimiento y sexo. El documento debe ser único.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="birthDate">Fecha de nacimiento</FieldLabel>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={participant?.birthDate ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sex">Sexo</FieldLabel>
              <NativeSelect
                id="sex"
                name="sex"
                defaultValue={participant?.sex ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">Sin especificar</NativeSelectOption>
                <NativeSelectOption value="Masculino">Masculino</NativeSelectOption>
                <NativeSelectOption value="Femenino">Femenino</NativeSelectOption>
                <NativeSelectOption value="Otro">Otro</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Celular</FieldLabel>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={participant?.phone ?? ""}
                maxLength={32}
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={participant?.email ?? ""}
                maxLength={254}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card size={presentation === "sheet" ? "sm" : "default"}>
        <CardHeader>
          <CardTitle>Información del evento</CardTitle>
          <CardDescription>Barrio, membresía y camiseta del participante.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="wardId">Barrio</FieldLabel>
              <NativeSelect
                id="wardId"
                name="wardId"
                defaultValue={String(participant?.wardId ?? wards[0]?.id ?? "")}
                className="w-full"
                required
              >
                {wards.map((ward) => (
                  <NativeSelectOption key={ward.id} value={ward.id}>
                    {ward.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="isChurchMember">Miembro de la Iglesia</FieldLabel>
              <NativeSelect
                id="isChurchMember"
                name="isChurchMember"
                defaultValue={
                  participant?.isChurchMember == null
                    ? ""
                    : String(participant.isChurchMember)
                }
                className="w-full"
              >
                <NativeSelectOption value="">Sin especificar</NativeSelectOption>
                <NativeSelectOption value="true">Sí</NativeSelectOption>
                <NativeSelectOption value="false">No</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="shirtSize">Talla de camiseta</FieldLabel>
              <NativeSelect
                id="shirtSize"
                name="shirtSize"
                defaultValue={participant?.shirtSize ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">Sin especificar</NativeSelectOption>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => (
                  <NativeSelectOption key={size} value={size}>{size}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field className="md:col-span-3">
              <FieldLabel htmlFor="companyId">Compañía</FieldLabel>
              <NativeSelect
                id="companyId"
                name="companyId"
                defaultValue={participant?.companyId ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">Sin asignar</NativeSelectOption>
                {companies.map((company) => (
                  <NativeSelectOption key={company.id} value={company.id}>
                    {company.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field className="md:col-span-3">
              <FieldLabel htmlFor="roomName">Edificio y dormitorio</FieldLabel>
              <NativeSelect
                id="roomName"
                name="roomName"
                defaultValue={participant?.roomName ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">Sin asignar</NativeSelectOption>
                {lodgingBuildings.map((building) => (
                  <NativeSelectOptGroup
                    key={building.id}
                    label={`${building.name} · ${building.sex === "female" ? "Mujeres" : "Varones"}`}
                  >
                    {building.rooms.map((room) => (
                      <NativeSelectOption
                        key={room.id}
                        value={room.name}
                        disabled={
                          room.availableParticipantCapacity === 0 &&
                          participant?.roomName !== room.name
                        }
                      >
                        Dormitorio {room.number} · {room.assignedParticipants}/
                        {room.participantCapacity} asignados
                      </NativeSelectOption>
                    ))}
                  </NativeSelectOptGroup>
                ))}
              </NativeSelect>
              <FieldDescription>
                La ocupación se actualiza automáticamente en Alojamiento.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card size={presentation === "sheet" ? "sm" : "default"}>
        <CardHeader>
          <CardTitle>Salud y emergencia</CardTitle>
          <CardDescription>
            Información sensible disponible únicamente durante la gestión del registro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="bloodType">Tipo de sangre</FieldLabel>
              <Input
                id="bloodType"
                name="bloodType"
                defaultValue={participant?.bloodType ?? ""}
                maxLength={16}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="insuranceProvider">Seguro médico</FieldLabel>
              <Input
                id="insuranceProvider"
                name="insuranceProvider"
                defaultValue={participant?.insuranceProvider ?? ""}
                maxLength={160}
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="chronicCondition">Enfermedad o condición crónica</FieldLabel>
              <Textarea
                id="chronicCondition"
                name="chronicCondition"
                defaultValue={participant?.chronicCondition ?? ""}
                maxLength={2000}
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="medicalTreatment">Tratamiento médico</FieldLabel>
              <Textarea
                id="medicalTreatment"
                name="medicalTreatment"
                defaultValue={participant?.medicalTreatment ?? ""}
                maxLength={2000}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="emergencyContactName">Contacto de emergencia</FieldLabel>
              <Input
                id="emergencyContactName"
                name="emergencyContactName"
                defaultValue={participant?.emergencyContactName ?? ""}
                maxLength={200}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="emergencyContactPhone">Teléfono de emergencia</FieldLabel>
              <Input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                type="tel"
                defaultValue={participant?.emergencyContactPhone ?? ""}
                maxLength={32}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            <HugeiconsIcon
              icon={ArrowLeft02Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Cancelar
          </Button>
        ) : (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/participants" />}
          >
            <HugeiconsIcon
              icon={ArrowLeft02Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={pending || lookupPending || wards.length === 0}
        >
          <HugeiconsIcon icon={FloppyDiskIcon} strokeWidth={2} data-icon="inline-start" />
          {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear participante"}
        </Button>
      </div>
    </form>
  );
}
