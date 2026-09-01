"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import PencilIcon from "@hugeicons/core-free-icons/PencilIcon";
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
  updateCounselorAction,
} from "@/modules/counselors/server/actions";

type EditableCounselor = {
  id: string;
  name: string;
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
  const editing = Boolean(counselor);

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
    <Dialog open={open} onOpenChange={setOpen}>
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

      <DialogContent>
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
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`counselor-name-${counselor?.id ?? "new"}`}>
                Nombre completo
              </FieldLabel>
              <Input
                id={`counselor-name-${counselor?.id ?? "new"}`}
                name="name"
                defaultValue={counselor?.name}
                maxLength={160}
                autoFocus
                required
              />
            </Field>
            <Field>
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
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
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
