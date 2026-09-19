"use client";

import { type FormEvent, useState, useTransition } from "react";
import EyeIcon from "@hugeicons/core-free-icons/EyeIcon";
import EyeOffIcon from "@hugeicons/core-free-icons/EyeOffIcon";
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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  companyId: string | null;
};

type UserFormDialogProps = {
  companies: { id: string; name: string }[];
  triggerLabel?: string;
  user?: EditableUser;
};

const roles = Object.entries(roleLabels) as [AppRole, string][];
const EMPTY_COMPANY_VALUE = "__none__";

export function UserFormDialog({
  companies,
  triggerLabel,
  user,
}: UserFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<AppRole>(
    (user?.role as AppRole | null) ?? "participant",
  );
  const [companyId, setCompanyId] = useState(user?.companyId ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const editing = Boolean(user);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setRole((user?.role as AppRole | null) ?? "participant");
      setCompanyId(user?.companyId ?? "");
    }
    setShowPassword(false);
  }

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={editing ? (triggerLabel ? "outline" : "ghost") : "default"}
            size={editing && !triggerLabel ? "icon-sm" : "sm"}
            aria-label={editing ? `Editar ${user?.name}` : undefined}
          />
        }
      >
        <HugeiconsIcon
          icon={editing ? UserEdit01Icon : UserAdd01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        {editing
          ? triggerLabel ?? <span className="sr-only">Editar usuario</span>
          : "Nuevo usuario"}
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
          <FieldGroup className="gap-4">
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
              <Select
                value={role}
                onValueChange={(value) => {
                  if (!value) return;

                  const nextRole = value as AppRole;
                  setRole(nextRole);
                  if (nextRole !== "counselor") {
                    setCompanyId("");
                  }
                }}
              >
                <SelectTrigger
                  id={`user-role-${user?.id ?? "new"}`}
                  aria-label="Rol"
                  className="w-full border-input bg-background"
                >
                  <SelectValue>{roleLabels[role]}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {roles.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <input type="hidden" name="role" value={role} />
            </Field>
            {role === "counselor" ? (
              <Field>
                <FieldLabel htmlFor={`user-company-${user?.id ?? "new"}`}>
                  Compañía
                </FieldLabel>
                <Select
                  value={companyId || EMPTY_COMPANY_VALUE}
                  onValueChange={(value) => {
                    if (!value || value === EMPTY_COMPANY_VALUE) {
                      setCompanyId("");
                      return;
                    }

                    setCompanyId(value);
                  }}
                >
                  <SelectTrigger
                    id={`user-company-${user?.id ?? "new"}`}
                    aria-label="Compañía"
                    className="w-full border-input bg-background"
                  >
                    <SelectValue>
                      {companies.find((company) => company.id === companyId)
                        ?.name ?? "Selecciona una compañía"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    <SelectGroup>
                      <SelectItem value={EMPTY_COMPANY_VALUE}>
                        Selecciona una compañía
                      </SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <input type="hidden" name="companyId" value={companyId} />
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor={`user-password-${user?.id ?? "new"}`}>
                {editing ? "Nueva contraseña (opcional)" : "Contraseña temporal"}
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id={`user-password-${user?.id ?? "new"}`}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required={!editing}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    <HugeiconsIcon
                      icon={showPassword ? EyeOffIcon : EyeIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
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
