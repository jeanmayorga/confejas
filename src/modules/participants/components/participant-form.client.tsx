"use client";

import {
  type FormEvent,
  type ReactNode,
  useRef,
  useState,
  useTransition,
} from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
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
import { Spinner } from "@/components/ui/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LodgingBuildingOverview } from "@/modules/lodging/server/queries";
import {
  createParticipantAction,
  lookupEcuadorianCitizenAction,
  searchEcuadorianCitizensAction,
  updateParticipantAction,
} from "@/modules/participants/server/actions";
import { normalizeGovernmentId } from "@/modules/participants/identity";

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
  medicalNotes: string | null;
};

type ParticipantFormProps = {
  participant?: ParticipantFormValue;
  lodgingBuildings: LodgingBuildingOverview[];
  companies: { id: string; name: string }[];
  wards: { id: number; name: string; stakeId: number }[];
  stakes: { id: number; name: string }[];
  presentation?: "page" | "sheet";
  onCancel?: () => void;
  onSuccess?: () => void;
};

type FormSectionProps = {
  presentation: "page" | "sheet";
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

type CitizenCompletionData = {
  firstNames: string | null;
  lastNames: string | null;
  birthDate: string | null;
  sex: "Masculino" | "Femenino" | null;
};

type CitizenSearchResult = {
  id: string;
  fullName: string | null;
  age: number | null;
  deathDate: string | null;
};

const SELECT_NONE_VALUE = "__none__";

function FormSection({
  presentation,
  title,
  description,
  actions,
  className,
  children,
}: FormSectionProps) {
  if (presentation === "sheet") {
    return (
      <section className={cn("flex flex-col gap-4", className)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="font-heading text-base font-medium">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
        {children}
      </section>
    );
  }

  return (
    <Card>
      <CardHeader className={actions ? "flex flex-row items-center justify-between gap-4" : undefined}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ParticipantForm({
  participant,
  wards,
  stakes,
  presentation = "page",
  onCancel,
  onSuccess,
}: ParticipantFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [lookupPending, startLookupTransition] = useTransition();
  const [completeInfoOpen, setCompleteInfoOpen] = useState(false);
  const [lookupMode, setLookupMode] = useState<"names" | "id">("names");
  const [governmentId, setGovernmentId] = useState(participant?.governmentId ?? "");
  const [givenNames, setGivenNames] = useState(participant?.firstNames ?? "");
  const [familyNames, setFamilyNames] = useState(participant?.lastNames ?? "");
  const [searchResults, setSearchResults] = useState<CitizenSearchResult[]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [idSearchResult, setIdSearchResult] = useState<{
    id: string;
    data: CitizenCompletionData;
  } | null>(null);
  const [sex, setSex] = useState(participant?.sex ?? SELECT_NONE_VALUE);
  const [wardId, setWardId] = useState(
    String(participant?.wardId ?? wards[0]?.id ?? ""),
  );
  const initialWard = wards.find(
    (ward) => String(ward.id) === String(participant?.wardId ?? wards[0]?.id ?? ""),
  );
  const [stakeId, setStakeId] = useState(
    String(initialWard?.stakeId ?? stakes[0]?.id ?? ""),
  );
  const [isChurchMember, setIsChurchMember] = useState(
    participant?.isChurchMember == null
      ? SELECT_NONE_VALUE
      : String(participant.isChurchMember),
  );
  const [shirtSize, setShirtSize] = useState(
    participant?.shirtSize ?? SELECT_NONE_VALUE,
  );
  const companyId = participant?.companyId ?? "";
  const roomName = participant?.roomName ?? "";
  const editing = Boolean(participant);

  function applyCitizenData(id: string, data: CitizenCompletionData) {
    const currentForm = formRef.current;
    if (!currentForm) {
      return;
    }

    const fieldValues = {
      firstNames: data.firstNames,
      lastNames: data.lastNames,
      birthDate: data.birthDate,
    };
    let filledFields = 0;

    for (const [name, value] of Object.entries(fieldValues)) {
      if (!value) {
        continue;
      }

      const field = currentForm.elements.namedItem(name);
      if (field instanceof HTMLInputElement) {
        field.value = value;
        filledFields += 1;
      }
    }

    if (data.sex) {
      setSex(data.sex);
      filledFields += 1;
    }

    if (filledFields === 0) {
      toast.info("EcuadorAPI no devolvió datos para completar.");
      return;
    }

    setGovernmentId(normalizeGovernmentId(id) ?? id);
    setSearchResults([]);
    setSearchCompleted(false);
    setIdSearchResult(null);
    setCompleteInfoOpen(false);
    toast.success(
      filledFields === 1
        ? "Se completó 1 campo con EcuadorAPI."
        : `Se completaron ${filledFields} campos con EcuadorAPI.`,
    );
  }

  function handleLookupSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchResults([]);
    setSearchCompleted(false);
    setIdSearchResult(null);

    startLookupTransition(async () => {
      if (lookupMode === "names") {
        const result = await searchEcuadorianCitizensAction(givenNames, familyNames);

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setSearchResults(result.data);
        setSearchCompleted(true);
        return;
      }

      const lookupValue = governmentId.trim();
      const result = await lookupEcuadorianCitizenAction(lookupValue);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setIdSearchResult({
        id: normalizeGovernmentId(lookupValue) ?? lookupValue,
        data: result.data,
      });
      setSearchCompleted(true);
    });
  }

  function handleCompleteSearchResult(result: CitizenSearchResult) {
    startLookupTransition(async () => {
      const detail = await lookupEcuadorianCitizenAction(result.id);

      if (!detail.success) {
        toast.error(detail.message);
        return;
      }

      applyCitizenData(result.id, detail.data);
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
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
        <input type="hidden" name="governmentId" value={governmentId} />
        <input
          type="hidden"
          name="wardId"
          value={wardId}
        />
        <input
          type="hidden"
          name="isChurchMember"
          value={isChurchMember === SELECT_NONE_VALUE ? "" : isChurchMember}
        />
        <input
          type="hidden"
          name="shirtSize"
          value={shirtSize === SELECT_NONE_VALUE ? "" : shirtSize}
        />
        <input
          type="hidden"
          name="companyId"
          value={companyId}
        />
        <input
          type="hidden"
          name="roomName"
          value={roomName}
        />
        <input
          type="hidden"
          name="sex"
          value={sex === SELECT_NONE_VALUE ? "" : sex}
        />
        <FormSection
          presentation={presentation}
          title="Datos personales"
          description="Nombres y apellidos."
          className="rounded-2xl bg-muted p-4"
          actions={
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setLookupMode("names");
                setSearchResults([]);
                setIdSearchResult(null);
                setCompleteInfoOpen(true);
              }}
            >
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Buscar info
            </Button>
          }
        >
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="firstNames">
                Nombres <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="firstNames"
                name="firstNames"
                defaultValue={participant?.firstNames}
                maxLength={160}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastNames">
                Apellidos <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
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
              <Select
                value={sex}
                onValueChange={(value) => {
                  if (value) setSex(value);
                }}
              >
                <SelectTrigger
                  id="sex"
                  aria-label="Sexo"
                  className="w-full border-input bg-background"
                >
                  <SelectValue>
                    {sex === SELECT_NONE_VALUE ? "Sin especificar" : sex}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    <SelectItem value={SELECT_NONE_VALUE}>Sin especificar</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="shirtSize">Talla de camiseta</FieldLabel>
              <Select
                value={shirtSize}
                onValueChange={(value) => {
                  if (value) setShirtSize(value);
                }}
              >
                <SelectTrigger
                  id="shirtSize"
                  aria-label="Talla de camiseta"
                  className="w-full border-input bg-background"
                >
                  <SelectValue>
                    {shirtSize === SELECT_NONE_VALUE ? "Sin especificar" : shirtSize}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    <SelectItem value={SELECT_NONE_VALUE}>Sin especificar</SelectItem>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
            <Field>
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
        </FormSection>

        <FormSection
          presentation={presentation}
          title="Conferencia"
          description="Datos del evento."
          className="rounded-2xl bg-muted p-4"
        >
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="stakeId">Estaca</FieldLabel>
              <Select
                value={stakeId}
                onValueChange={(value) => {
                  if (!value) return;

                  setStakeId(value);
                  const nextWard = wards.find(
                    (ward) => String(ward.stakeId) === value,
                  );
                  setWardId(nextWard ? String(nextWard.id) : "");
                }}
              >
                <SelectTrigger
                  id="stakeId"
                  aria-label="Estaca"
                  className="w-full border-input bg-background"
                >
                  <SelectValue>
                    {stakes.find((stake) => String(stake.id) === stakeId)?.name ??
                      "Selecciona una estaca"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {stakes.map((stake) => (
                      <SelectItem key={stake.id} value={String(stake.id)}>
                        {stake.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="wardId">
                Barrio <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={wardId}
                onValueChange={(value) => {
                  if (!value) return;

                  setWardId(value);
                  const selectedWard = wards.find(
                    (ward) => String(ward.id) === value,
                  );
                  if (selectedWard) {
                    setStakeId(String(selectedWard.stakeId));
                  }
                }}
              >
                <SelectTrigger
                  id="wardId"
                  aria-label="Barrio"
                  className="w-full border-input bg-background"
                >
                  <SelectValue>
                    {wards.find((ward) => String(ward.id) === wardId)?.name ??
                      "Selecciona un barrio"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {wards
                      .filter((ward) => String(ward.stakeId) === stakeId)
                      .map((ward) => (
                      <SelectItem key={ward.id} value={String(ward.id)}>
                        {ward.name}
                      </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="isChurchMember">Miembro de la Iglesia</FieldLabel>
              <Select
                value={isChurchMember}
                onValueChange={(value) => {
                  if (value) setIsChurchMember(value);
                }}
              >
                <SelectTrigger
                  id="isChurchMember"
                  aria-label="Miembro de la Iglesia"
                  className="w-full border-input bg-background"
                >
                  <SelectValue>
                    {isChurchMember === SELECT_NONE_VALUE
                      ? "Sin especificar"
                      : isChurchMember === "true"
                        ? "Sí"
                        : "No"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    <SelectItem value={SELECT_NONE_VALUE}>Sin especificar</SelectItem>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </FormSection>

        <FormSection
          presentation={presentation}
          title="Salud"
          description="Información médica."
          className="rounded-2xl bg-muted p-4"
        >
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
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="medicalNotes">Notas médicas</FieldLabel>
              <Textarea
                id="medicalNotes"
                name="medicalNotes"
                defaultValue={participant?.medicalNotes ?? ""}
                maxLength={4000}
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
        </FormSection>

        <div className="flex flex-col-reverse gap-3 rounded-2xl bg-muted p-4 sm:flex-row sm:justify-end">
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

      <Dialog
        open={completeInfoOpen}
        onOpenChange={(open) => {
          if (!lookupPending) {
            setCompleteInfoOpen(open);
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Buscar información</DialogTitle>
            <DialogDescription>
              Busca una persona en EcuadorAPI y completa sus datos en el formulario.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLookupSearch}>
            <Tabs
              value={lookupMode}
              onValueChange={(value) => {
                if (value === "names" || value === "id") {
                  setLookupMode(value);
                  setSearchResults([]);
                  setSearchCompleted(false);
                  setIdSearchResult(null);
                }
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="names">Buscar por nombres</TabsTrigger>
                <TabsTrigger value="id">Buscar por cédula</TabsTrigger>
              </TabsList>

              <TabsContent value="names" className="mt-4 flex flex-col gap-4">
                <FieldGroup className="grid gap-5 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="search-given-names">
                      Nombres <span aria-hidden="true" className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="search-given-names"
                      value={givenNames}
                      onChange={(event) => setGivenNames(event.target.value)}
                      placeholder="Ej. Jean Paul"
                      maxLength={120}
                      disabled={lookupPending}
                      autoFocus
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="search-family-names">
                      Apellidos <span aria-hidden="true" className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="search-family-names"
                      value={familyNames}
                      onChange={(event) => setFamilyNames(event.target.value)}
                      placeholder="Ej. Mayorga Cobo"
                      maxLength={120}
                      disabled={lookupPending}
                      required
                    />
                  </Field>
                </FieldGroup>

                {searchCompleted && searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No encontramos coincidencias para esos nombres.
                  </p>
                ) : null}

                {searchResults.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {result.fullName ?? "Sin nombre"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cédula {result.id}
                            {result.age != null ? ` · ${result.age} años` : ""}
                            {result.deathDate ? " · Persona fallecida" : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={lookupPending}
                          onClick={() => handleCompleteSearchResult(result)}
                        >
                          Completar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="id" className="mt-4 flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="complete-government-id">
                      Cédula <span aria-hidden="true" className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="complete-government-id"
                      value={governmentId}
                      onChange={(event) => setGovernmentId(event.target.value)}
                      placeholder="Ej. 0912345678"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={32}
                      disabled={lookupPending}
                      autoFocus
                      required
                    />
                  </Field>
                </FieldGroup>

                {idSearchResult ? (
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background p-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {[idSearchResult.data.firstNames, idSearchResult.data.lastNames]
                          .filter(Boolean)
                          .join(" ") || "Sin nombre"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cédula {idSearchResult.id}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={lookupPending}
                      onClick={() =>
                        applyCitizenData(idSearchResult.id, idSearchResult.data)
                      }
                    >
                      Completar
                    </Button>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                disabled={lookupPending}
                onClick={() => setCompleteInfoOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={lookupPending}>
                {lookupPending ? <Spinner data-icon="inline-start" /> : null}
                {lookupPending ? "Buscando…" : "Buscar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
