"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
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
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  createCounselorAction,
  lookupCounselorGovernmentIdAction,
  updateCounselorAction,
} from "@/modules/counselors/server/actions";

export type CounselorFormValues = {
  id?: string;
  governmentId: string | null;
  firstNames: string | null;
  lastNames: string | null;
  whatsapp: string | null;
  email: string | null;
  companyId: string | null;
  stakeId: number | null;
  wardId: number | null;
};

type CounselorFormProps = {
  counselor?: CounselorFormValues;
  companies: { id: string; name: string }[];
  stakes: { id: number; name: string }[];
  wards: { id: number; name: string; stakeId: number }[];
  onCancel: () => void;
  onSuccess?: () => void;
};

export function CounselorForm({
  counselor,
  companies,
  stakes,
  wards,
  onCancel,
  onSuccess,
}: CounselorFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [lookupPending, startLookupTransition] = useTransition();
  const [stakeId, setStakeId] = useState(
    counselor?.stakeId ? String(counselor.stakeId) : "",
  );
  const [wardId, setWardId] = useState(
    counselor?.wardId ? String(counselor.wardId) : "",
  );
  const isEditing = Boolean(counselor?.id);
  const availableWards = stakeId
    ? wards.filter((ward) => ward.stakeId === Number(stakeId))
    : [];

  function handleGovernmentIdLookup() {
    const form = formRef.current;
    const governmentIdField = form?.elements.namedItem("governmentId");

    if (!(governmentIdField instanceof HTMLInputElement)) {
      return;
    }

    startLookupTransition(async () => {
      const result = await lookupCounselorGovernmentIdAction(
        governmentIdField.value,
      );

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
      };
      let filledFields = 0;

      for (const [name, value] of Object.entries(fieldValues)) {
        const field = currentForm.elements.namedItem(name);
        if (!(field instanceof HTMLInputElement)) {
          continue;
        }

        field.value = value ?? "";
        if (value) {
          filledFields += 1;
        }
      }

      if (filledFields === 0) {
        toast.info(
          "EcuadorAPI encontró la cédula, pero no devolvió datos para completar.",
        );
        return;
      }

      toast.success("Datos del consejero completados con EcuadorAPI.");
    });
  }

  function handleStakeChange(value: string) {
    setStakeId(value);

    if (
      wardId &&
      wards.find((ward) => String(ward.id) === wardId)?.stakeId !==
        Number(value)
    ) {
      setWardId("");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = isEditing && counselor?.id
        ? await updateCounselorAction(counselor.id, formData)
        : await createCounselorAction(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="counselor-government-id">Cédula</FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="counselor-government-id"
              name="governmentId"
              placeholder="Ej. 0912345678"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              pattern="[0-9]{10}"
            defaultValue={counselor?.governmentId ?? ""}
            autoFocus
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
            Consulta una cédula ecuatoriana para completar los datos.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="counselor-first-names">Nombre</FieldLabel>
          <Input
            id="counselor-first-names"
            name="firstNames"
            maxLength={160}
            defaultValue={counselor?.firstNames ?? ""}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="counselor-last-names">Apellidos</FieldLabel>
          <Input
            id="counselor-last-names"
            name="lastNames"
            maxLength={160}
            defaultValue={counselor?.lastNames ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="counselor-whatsapp">WhatsApp</FieldLabel>
          <Input
            id="counselor-whatsapp"
            name="whatsapp"
            type="tel"
            placeholder="Ej. 0991234567"
            autoComplete="tel"
            maxLength={32}
            defaultValue={counselor?.whatsapp ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="counselor-email">Correo electrónico</FieldLabel>
          <Input
            id="counselor-email"
            name="email"
            type="email"
            placeholder="nombre@correo.com"
            autoComplete="email"
            maxLength={254}
            defaultValue={counselor?.email ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="counselor-stake">Estaca</FieldLabel>
          <NativeSelect
            id="counselor-stake"
            name="stakeId"
            value={stakeId}
            onChange={(event) => handleStakeChange(event.currentTarget.value)}
            className="w-full"
          >
            <NativeSelectOption value="">Sin asignar</NativeSelectOption>
            <NativeSelectOptGroup label="Estacas">
              {stakes.map((stake) => (
                <NativeSelectOption key={stake.id} value={String(stake.id)}>
                  {stake.name}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="counselor-ward">Barrio</FieldLabel>
          <NativeSelect
            id="counselor-ward"
            name="wardId"
            value={wardId}
            onChange={(event) => setWardId(event.currentTarget.value)}
            className="w-full"
            disabled={!stakeId}
          >
            <NativeSelectOption value="">
              {stakeId ? "Sin asignar" : "Selecciona una estaca"}
            </NativeSelectOption>
            {availableWards.map((ward) => (
              <NativeSelectOption key={ward.id} value={String(ward.id)}>
                {ward.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="counselor-company">Compañía</FieldLabel>
          <NativeSelect
            id="counselor-company"
            name="companyId"
            defaultValue={counselor?.companyId ?? ""}
            className="w-full"
            required
          >
            <NativeSelectOption value="">Selecciona una compañía</NativeSelectOption>
            <NativeSelectOptGroup label="Compañías">
              {companies.map((company) => (
                <NativeSelectOption key={company.id} value={company.id}>
                  {company.name}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
          <FieldDescription>
            La asignación puede cambiarse en cualquier momento.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || lookupPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || lookupPending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear consejero"}
        </Button>
      </div>
    </form>
  );
}
