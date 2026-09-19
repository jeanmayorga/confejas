"use client";

import { type FormEvent, useState, useTransition } from "react";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  COMPANY_PARTICIPANT_SEX_LIMIT,
  type DistributionCapacity,
} from "@/modules/companies/distribution";
import { updateCompanyCapacityAction } from "@/modules/companies/server/actions";

type CompanyCapacityDialogProps = {
  capacity: DistributionCapacity;
};

function parseCapacity(value: string) {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= COMPANY_PARTICIPANT_SEX_LIMIT
    ? parsed
    : null;
}

export function CompanyCapacityDialog({
  capacity,
}: CompanyCapacityDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [female, setFemale] = useState(String(capacity.female));
  const [male, setMale] = useState(String(capacity.male));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setFemale(String(capacity.female));
    setMale(String(capacity.male));
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextFemale = parseCapacity(female);
    const nextMale = parseCapacity(male);

    if (nextFemale === null || nextMale === null) {
      setError(
        `Ingresa un número entero entre 1 y ${COMPANY_PARTICIPANT_SEX_LIMIT} para cada sexo.`,
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateCompanyCapacityAction({
        female: nextFemale,
        male: nextMale,
      });

      if (!result.success) {
        setError(result.message);
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          resetForm();
          setOpen(nextOpen);
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <HugeiconsIcon
          icon={PencilEdit02Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Editar tamaño
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tamaño de las compañías</DialogTitle>
          <DialogDescription>
            Define cuántas mujeres y hombres se pueden asignar a cada compañía.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <FieldGroup className="gap-4 sm:flex-row">
            <Field>
              <FieldLabel htmlFor="company-female-capacity">Mujeres</FieldLabel>
              <Input
                id="company-female-capacity"
                type="number"
                inputMode="numeric"
                min={1}
                max={COMPANY_PARTICIPANT_SEX_LIMIT}
                value={female}
                onChange={(event) => setFemale(event.target.value)}
                disabled={pending}
                aria-invalid={Boolean(error)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="company-male-capacity">Hombres</FieldLabel>
              <Input
                id="company-male-capacity"
                type="number"
                inputMode="numeric"
                min={1}
                max={COMPANY_PARTICIPANT_SEX_LIMIT}
                value={male}
                onChange={(event) => setMale(event.target.value)}
                disabled={pending}
                aria-invalid={Boolean(error)}
              />
            </Field>
          </FieldGroup>

          {error ? <FieldError>{error}</FieldError> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
