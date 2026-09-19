"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  createWardAction,
  updateWardAction,
} from "@/modules/church-units/server/actions";

type StakeOption = {
  id: number;
  name: string;
};

type EditableWard = {
  id: number;
  name: string;
  stakeId: number;
};

type WardFormDialogProps = {
  stakes: StakeOption[];
  ward?: EditableWard;
  disabled?: boolean;
  triggerLabel?: string;
  defaultStakeId?: number;
};

export function WardFormDialog({
  stakes,
  ward,
  disabled = false,
  triggerLabel,
  defaultStakeId,
}: WardFormDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(ward);
  const selectedStakeId = ward?.stakeId ?? defaultStakeId ?? stakes[0]?.id;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = ward
        ? await updateWardAction(ward.id, formData)
        : await createWardAction(formData);

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
            variant={editing ? "secondary" : "default"}
            size={editing ? "icon-md" : "default"}
            disabled={disabled || stakes.length === 0}
            aria-label={editing ? `Editar ${ward?.name}` : undefined}
          />
        }
      >
        <HugeiconsIcon
          icon={editing ? PencilEdit02Icon : Add01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        {editing ? null : triggerLabel ?? "Nuevo barrio"}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar barrio" : "Nuevo barrio"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Actualiza el nombre o cambia el barrio de estaca."
              : "Crea un barrio y asígnalo a una estaca existente."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`ward-name-${ward?.id ?? "new"}`}>
                Nombre
              </FieldLabel>
              <Input
                id={`ward-name-${ward?.id ?? "new"}`}
                name="name"
                defaultValue={ward?.name}
                placeholder="Ej. La Aurora"
                maxLength={120}
                disabled={pending}
                autoFocus
                required
              />
              <FieldDescription>
                Los nombres de barrio deben ser únicos en el sistema.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`ward-stake-${ward?.id ?? "new"}`}>
                Estaca
              </FieldLabel>
              <NativeSelect
                id={`ward-stake-${ward?.id ?? "new"}`}
                name="stakeId"
                defaultValue={selectedStakeId?.toString() ?? ""}
                className="w-full"
                disabled={pending}
                required
              >
                {stakes.map((stake) => (
                  <NativeSelectOption key={stake.id} value={stake.id.toString()}>
                    {stake.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
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
            <Button type="submit" disabled={pending || stakes.length === 0}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Crear barrio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
