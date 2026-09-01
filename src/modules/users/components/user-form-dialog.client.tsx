"use client";

import { type FormEvent, useState, useTransition } from "react";
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
import UserEdit01Icon from "@hugeicons/core-free-icons/UserEdit01Icon";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { roleLabels, type AppRole } from "@/modules/auth/roles";
import {
  createUserAction,
  updateUserAction,
} from "@/modules/users/server/actions";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
};

type UserFormDialogProps = {
  user?: EditableUser;
};

const roles = Object.entries(roleLabels) as [AppRole, string][];

export function UserFormDialog({ user }: UserFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(user);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = user
        ? await updateUserAction(user.id, formData)
        : await createUserAction(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
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
            aria-label={editing ? `Editar ${user?.name}` : undefined}
          />
        }
      >
        <HugeiconsIcon
          icon={editing ? UserEdit01Icon : UserAdd01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        {editing ? <span className="sr-only">Editar usuario</span> : "Nuevo usuario"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Actualiza los datos de acceso. Deja la contraseña vacía para conservarla."
              : "Crea una cuenta y asigna el nivel de acceso correspondiente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`user-name-${user?.id ?? "new"}`}>Nombre</FieldLabel>
              <Input
                id={`user-name-${user?.id ?? "new"}`}
                name="name"
                defaultValue={user?.name}
                maxLength={160}
                autoComplete="name"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`user-email-${user?.id ?? "new"}`}>Correo</FieldLabel>
              <Input
                id={`user-email-${user?.id ?? "new"}`}
                name="email"
                type="email"
                defaultValue={user?.email}
                maxLength={254}
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`user-role-${user?.id ?? "new"}`}>Rol</FieldLabel>
              <NativeSelect
                id={`user-role-${user?.id ?? "new"}`}
                name="role"
                defaultValue={user?.role ?? "participant"}
                className="w-full"
                required
              >
                {roles.map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={`user-password-${user?.id ?? "new"}`}>
                {editing ? "Nueva contraseña (opcional)" : "Contraseña temporal"}
              </FieldLabel>
              <Input
                id={`user-password-${user?.id ?? "new"}`}
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required={!editing}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
