"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import PencilIcon from "@hugeicons/core-free-icons/PencilIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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

type EditableCounselor = {
  id: string;
  name: string;
  governmentId: string | null;
  firstNames: string | null;
  lastNames: string | null;
  whatsapp: string | null;
  email: string | null;
  companyId: string | null;
};

type CounselorFormDialogProps = {
  companies: { id: string; name: string }[];
  counselor?: EditableCounselor;
};

export function CounselorFormDialog({
  companies,
  counselor,
}: CounselorFormDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lookupPending, startLookupTransition] = useTransition();
  const editing = Boolean(counselor);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      formRef.current?.reset();
    }
  }

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = counselor
        ? await updateCounselorAction(counselor.id, formData)
        : await createCounselorAction(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={editing ? "ghost" : "default"}
            size={editing ? "icon-sm" : "default"}
            aria-label={editing ? `Editar ${counselor?.name}` : undefined}
          />
        }
      >
        <HugeiconsIcon
          icon={editing ? PencilIcon : UserAdd01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        {editing ? <span className="sr-only">Editar consejero</span> : "Nuevo consejero"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar consejero" : "Nuevo consejero"}
          </DialogTitle>
          <DialogDescription>
            Registra al consejero y asígnalo a una compañía. Habitualmente cada
            compañía cuenta con dos.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit}>
          <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel
                htmlFor={`counselor-government-id-${counselor?.id ?? "new"}`}
              >
                Cédula
              </FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id={`counselor-government-id-${counselor?.id ?? "new"}`}
                  name="governmentId"
                  defaultValue={counselor?.governmentId ?? ""}
                  placeholder="Ej. 0912345678"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  autoFocus={!editing}
                  required
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
              <FieldLabel
                htmlFor={`counselor-first-names-${counselor?.id ?? "new"}`}
              >
                Nombres
              </FieldLabel>
              <Input
                id={`counselor-first-names-${counselor?.id ?? "new"}`}
                name="firstNames"
                defaultValue={
                  counselor?.firstNames ??
                  (counselor?.lastNames ? "" : counselor?.name)
                }
                maxLength={160}
                required
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor={`counselor-last-names-${counselor?.id ?? "new"}`}
              >
                Apellidos
              </FieldLabel>
              <Input
                id={`counselor-last-names-${counselor?.id ?? "new"}`}
                name="lastNames"
                defaultValue={counselor?.lastNames ?? ""}
                maxLength={160}
                required
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor={`counselor-whatsapp-${counselor?.id ?? "new"}`}
              >
                WhatsApp
              </FieldLabel>
              <Input
                id={`counselor-whatsapp-${counselor?.id ?? "new"}`}
                name="whatsapp"
                type="tel"
                defaultValue={counselor?.whatsapp ?? ""}
                placeholder="Ej. 0991234567"
                autoComplete="tel"
                maxLength={32}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`counselor-email-${counselor?.id ?? "new"}`}>
                Correo electrónico
              </FieldLabel>
              <Input
                id={`counselor-email-${counselor?.id ?? "new"}`}
                name="email"
                type="email"
                defaultValue={counselor?.email ?? ""}
                placeholder="nombre@correo.com"
                autoComplete="email"
                maxLength={254}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`counselor-company-${counselor?.id ?? "new"}`}>
                Compañía
              </FieldLabel>
              <NativeSelect
                id={`counselor-company-${counselor?.id ?? "new"}`}
                name="companyId"
                defaultValue={counselor?.companyId ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">Sin asignar</NativeSelectOption>
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

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={pending || lookupPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || lookupPending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Crear consejero"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
