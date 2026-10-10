"use client";

import { FormEvent, useState } from "react";
import EyeIcon from "@hugeicons/core-free-icons/EyeIcon";
import EyeOffIcon from "@hugeicons/core-free-icons/EyeOffIcon";
import LockPasswordIcon from "@hugeicons/core-free-icons/LockPasswordIcon";
import Login02Icon from "@hugeicons/core-free-icons/Login02Icon";
import Mail02Icon from "@hugeicons/core-free-icons/Mail02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { authClient } from "@/modules/auth/client/auth-client";

type LoginFormProps = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        toast.error("El correo o la contraseña no son correctos.");
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch {
      toast.error("No pudimos iniciar sesión. Intenta nuevamente.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <Field data-disabled={isPending || undefined}>
          <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
          <InputGroup data-disabled={isPending || undefined}>
            <InputGroupAddon>
              <HugeiconsIcon icon={Mail02Icon} strokeWidth={2} aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nombre@ejemplo.com"
              required
              disabled={isPending}
            />
          </InputGroup>
        </Field>
        <Field data-disabled={isPending || undefined}>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <InputGroup data-disabled={isPending || undefined}>
            <InputGroupAddon>
              <HugeiconsIcon
                icon={LockPasswordIcon}
                strokeWidth={2}
                aria-hidden
              />
            </InputGroupAddon>
            <InputGroupInput
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              required
              disabled={isPending}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                disabled={isPending}
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
        <Field data-disabled={isPending || undefined}>
          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon
                icon={Login02Icon}
                strokeWidth={2}
                data-icon="inline-start"
                aria-hidden
              />
            )}
            {isPending ? "Ingresando..." : "Ingresar"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
