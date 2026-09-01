"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import PencilIcon from "@hugeicons/core-free-icons/PencilIcon";
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
import { Spinner } from "@/components/ui/spinner";
import {
  createCompanyAction,
  updateCompanyAction,
} from "@/modules/companies/server/actions";

type EditableCompany = {
  id: string;
  name: string;
};

type CompanyFormDialogProps = {
  company?: EditableCompany;
};

export function CompanyFormDialog({ company }: CompanyFormDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(company);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = company
        ? await updateCompanyAction(company.id, formData)
        : await createCompanyAction(formData);

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
            aria-label={editing ? `Editar ${company?.name}` : undefined}
          />
        }
      >
        <HugeiconsIcon
          icon={editing ? PencilIcon : Add01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        {editing ? <span className="sr-only">Editar compañía</span> : "Nueva compañía"}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar compañía" : "Nueva compañía"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Actualiza el nombre que verán los participantes y el equipo de check-in."
              : "Crea una compañía para poder asignarle participantes."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`company-name-${company?.id ?? "new"}`}>
                Nombre
              </FieldLabel>
              <Input
                id={`company-name-${company?.id ?? "new"}`}
                name="name"
                defaultValue={company?.name}
                placeholder="Ej. Compañía Nefi"
                maxLength={120}
                autoFocus
                required
              />
              <FieldDescription>
                El nombre debe ser único y puede tener hasta 120 caracteres.
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
                  : "Crear compañía"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
