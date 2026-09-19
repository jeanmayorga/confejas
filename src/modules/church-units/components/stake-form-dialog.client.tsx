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
  createStakeAction,
  updateStakeAction,
} from "@/modules/church-units/server/actions";

type EditableStake = {
  id: number;
  name: string;
};

type StakeFormDialogProps = {
  stake?: EditableStake;
  disabled?: boolean;
};

export function StakeFormDialog({
  stake,
  disabled = false,
}: StakeFormDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(stake);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = stake
        ? await updateStakeAction(stake.id, formData)
        : await createStakeAction(formData);

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant={editing ? "outline" : "default"}
            size={editing ? "sm" : "default"}
            disabled={disabled}
            aria-label={editing ? `Editar ${stake?.name}` : undefined}
          />
        }
      >
        <HugeiconsIcon
          icon={editing ? PencilIcon : Add01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        {editing ? "Editar" : "Nueva estaca"}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar estaca" : "Nueva estaca"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Actualiza el nombre de la estaca. Sus barrios conservarán la relación."
              : "Crea una estaca para organizar sus barrios y participantes."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`stake-name-${stake?.id ?? "new"}`}>
                Nombre
              </FieldLabel>
              <Input
                id={`stake-name-${stake?.id ?? "new"}`}
                name="name"
                defaultValue={stake?.name}
                placeholder="Ej. Samborondón"
                maxLength={120}
                disabled={pending}
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
                  : "Crear estaca"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
