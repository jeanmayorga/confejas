"use client";

import {
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon";
import MedicalFileIcon from "@hugeicons/core-free-icons/MedicalFileIcon";
import UserEdit01Icon from "@hugeicons/core-free-icons/UserEdit01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { DeleteParticipantButton } from "@/modules/participants/components/delete-participant-button.client";
import { ParticipantQrDialog } from "@/modules/participants/components/participant-qr-dialog.client";
import { updateParticipantMedicalNotesAction } from "@/modules/participants/server/actions";
import {
  getParticipantStatusLabel,
  isParticipantStatus,
  PARTICIPANT_STATUS_OPTIONS,
  type ParticipantStatus,
} from "@/modules/participants/status";
import type { ParticipantTableRow } from "./participants-table.client";

const birthDateFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "long",
  timeZone: "UTC",
});

const checkInDateFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Guayaquil",
});

function present(value: string | null, fallback = "No registrado") {
  return value?.trim() || fallback;
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return "No registrada";
  }

  return birthDateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function membershipLabel(value: boolean | null) {
  if (value === null) {
    return "No registrado";
  }

  return value ? "Sí" : "No";
}

export function getParticipantInitials(firstNames: string, lastNames: string) {
  return `${firstNames.trim().charAt(0)}${lastNames.trim().charAt(0)}`.toLocaleUpperCase(
    "es",
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

type ParticipantDetailsProps = {
  participant: ParticipantTableRow;
  canManage?: boolean;
  canDelete?: boolean;
  className?: string;
  onEdit?: () => void;
  onDeleted?: () => void;
  onDataChanged?: () => void;
  onCompanyOpen?: (companyId: string) => void;
  onStatusChange?: (status: ParticipantStatus) => void;
  isStatusUpdating?: boolean;
};

const participantStatusCardClassNames = {
  registered: "bg-[#f3f7fa]",
  confirmed: "bg-participant-confirmed/10",
  arrived: "bg-participant-arrived/10",
  cancelled: "bg-participant-cancelled/10",
  pending: "bg-participant-pending/10",
} satisfies Record<ParticipantTableRow["status"], string>;

const participantStatusDotClassNames = {
  registered: "bg-participant-registered",
  confirmed: "bg-participant-confirmed",
  arrived: "bg-participant-arrived",
  cancelled: "bg-participant-cancelled",
  pending: "bg-participant-pending",
} satisfies Record<ParticipantTableRow["status"], string>;

export function ParticipantDetails({
  participant,
  canManage = false,
  canDelete = false,
  className,
  onEdit = () => {},
  onDeleted,
  onDataChanged,
  onCompanyOpen,
  onStatusChange,
  isStatusUpdating = false,
}: ParticipantDetailsProps) {
  const participantName = `${participant.firstNames} ${participant.lastNames}`;
  const preferredName = participant.preferredName?.trim() || participant.firstNames;
  const [medicalNotes, setMedicalNotes] = useState(
    participant.medicalNotes ?? "",
  );
  const [isSavingMedicalNotes, startSavingMedicalNotes] = useTransition();

  function saveMedicalNotes() {
    const nextNotes = medicalNotes.trim();

    startSavingMedicalNotes(async () => {
      const result = await updateParticipantMedicalNotesAction(
        participant.id,
        nextNotes,
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setMedicalNotes(nextNotes);
      toast.success(result.message);
      onDataChanged?.();
    });
  }

  return (
    <div className={cn("overflow-y-auto px-6 pb-6", className)}>
      <div
        className={cn(
          "mt-6 rounded-2xl p-5",
          participantStatusCardClassNames[participant.status],
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <Avatar
            size="lg"
            className="size-14 bg-white after:border-0"
            aria-hidden="true"
          >
            <AvatarFallback
              className="bg-white text-muted-foreground"
            >
              {getParticipantInitials(participant.firstNames, participant.lastNames)}
            </AvatarFallback>
          </Avatar>
          {canManage ? (
            <Select
              items={PARTICIPANT_STATUS_OPTIONS}
              value={participant.status}
              disabled={isStatusUpdating}
              onValueChange={(nextStatus) => {
                if (nextStatus && isParticipantStatus(nextStatus)) {
                  onStatusChange?.(nextStatus);
                }
              }}
            >
              <SelectTrigger
                size="xs"
                aria-label={`Estado de ${participantName}`}
                className={cn(
                  "px-2.5 text-xs font-medium shadow-none [&>svg]:!size-3",
                  participantStatusCardClassNames[participant.status],
                  participant.status === "registered" && "border-border",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    participantStatusDotClassNames[participant.status],
                  )}
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="end"
                alignItemWithTrigger={false}
                className="min-w-52"
              >
                <SelectGroup>
                  <SelectLabel className="font-medium text-foreground">
                    Cambiar estado
                  </SelectLabel>
                  {PARTICIPANT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 rounded-full",
                          participantStatusDotClassNames[option.value],
                        )}
                      />
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary">
              {getParticipantStatusLabel(participant.status)}
            </Badge>
          )}
        </div>
        <Badge variant="secondary" className="mt-4 w-fit bg-white">
          # {participant.sourceRecordId ?? "—"}
        </Badge>
        <h2 className="mt-2 font-heading text-xl font-medium text-foreground">
          {participantName}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Me gustaría que me llamen: {preferredName}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ParticipantQrDialog
            participantCode={participant.sourceRecordId}
            participantName={participantName}
          />
          {canManage ? (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <HugeiconsIcon icon={UserEdit01Icon} data-icon="inline-start" />
              Editar
            </Button>
          ) : null}
          {canDelete ? (
            <DeleteParticipantButton
              participantId={participant.id}
              participantName={participantName}
              showLabel
              onDeleted={onDeleted}
            />
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="personal" className="mt-5 gap-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="min-w-0 px-1 text-xs">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              className="size-3.5 shrink-0"
              strokeWidth={2}
            />
            Datos personales
          </TabsTrigger>
          <TabsTrigger value="conference" className="min-w-0 px-1 text-xs">
            <HugeiconsIcon
              icon={DashboardSquare01Icon}
              className="size-3.5 shrink-0"
              strokeWidth={2}
            />
            Conferencia
          </TabsTrigger>
          <TabsTrigger value="health" className="min-w-0 px-1 text-xs">
            <HugeiconsIcon
              icon={MedicalFileIcon}
              className="size-3.5 shrink-0"
              strokeWidth={2}
            />
            Salud
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conference" className="rounded-2xl bg-muted p-4">
          <div className="space-y-6 pb-5">
            <section>
              <h3 className="text-sm font-semibold">Conferencia</h3>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                <DetailItem
                  label="Llegada"
                  value={
                    participant.checkedInAt
                      ? `Llegó · ${checkInDateFormatter.format(
                          new Date(participant.checkedInAt),
                        )}`
                      : "Todavía no llega"
                  }
                />
                <DetailItem
                  label="Compañía"
                  value={
                    participant.companyName && participant.companyId ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-left text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-3.5"
                        onClick={() => onCompanyOpen?.(participant.companyId!)}
                      >
                        <HugeiconsIcon icon={UserGroupIcon} />
                        {participant.companyName}
                      </button>
                    ) : (
                      "Sin asignar"
                    )
                  }
                />
                <DetailItem
                  label="Habitación"
                  value={participant.roomName ?? "Sin asignar"}
                />
                <DetailItem
                  label="Miembro de la Iglesia"
                  value={membershipLabel(participant.isChurchMember)}
                />
                <DetailItem label="Barrio" value={participant.wardName} />
                <DetailItem label="Estaca" value={participant.stakeName} />
              </dl>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="rounded-2xl bg-muted p-4">
          <section className="pb-5">
            <h3 className="text-sm font-semibold">Datos personales</h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
              <DetailItem
                label="Nombres"
                value={present(participant.firstNames)}
              />
              <DetailItem
                label="Apellidos"
                value={present(participant.lastNames)}
              />
              <DetailItem
                label="Nombre de preferencia"
                value={present(participant.preferredName)}
              />
              <DetailItem
                label="Fecha de nacimiento"
                value={formatBirthDate(participant.birthDate)}
              />
              <DetailItem label="Sexo" value={present(participant.sex)} />
              <DetailItem
                label="Talla de camiseta"
                value={present(participant.shirtSize)}
              />
              <DetailItem label="Celular" value={present(participant.phone)} />
              <DetailItem
                label="Correo electrónico"
                value={present(participant.email)}
              />
              <DetailItem
                label="Cédula"
                value={present(participant.governmentId)}
              />
              <DetailItem
                label="Edad"
                value={
                  participant.age === null
                    ? "No registrada"
                    : `${participant.age} años`
                }
              />
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="health" className="rounded-2xl bg-muted p-4">
          <section className="pb-5">
            <h3 className="text-sm font-semibold">Salud</h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
              <DetailItem
                label="Tipo de sangre"
                value={present(participant.bloodType)}
              />
              <DetailItem
                label="Seguro médico"
                value={present(participant.insuranceProvider)}
              />
              <DetailItem
                label="Condición crónica"
                value={present(participant.chronicCondition)}
              />
              <DetailItem
                label="Tratamiento médico"
                value={present(participant.medicalTreatment)}
              />
              <DetailItem
                label="Contacto de emergencia"
                value={present(participant.emergencyContactName)}
              />
              <DetailItem
                label="Teléfono de emergencia"
                value={present(participant.emergencyContactPhone)}
              />
            </dl>
            <Field className="mt-5">
              <FieldLabel htmlFor="participant-medical-notes">
                Notas médicas
              </FieldLabel>
              <Textarea
                id="participant-medical-notes"
                value={medicalNotes}
                onChange={(event) => setMedicalNotes(event.target.value)}
                maxLength={4_000}
                placeholder="Escribe notas médicas"
                readOnly={!canManage || isSavingMedicalNotes}
                className="min-h-28 bg-background"
              />
              {canManage ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveMedicalNotes}
                    disabled={isSavingMedicalNotes}
                  >
                    {isSavingMedicalNotes ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    {isSavingMedicalNotes ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              ) : null}
            </Field>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
