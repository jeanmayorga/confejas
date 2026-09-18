"use client";

import { FormEvent, useState } from "react";
import LockPasswordIcon from "@hugeicons/core-free-icons/LockPasswordIcon";
import Login02Icon from "@hugeicons/core-free-icons/Login02Icon";
import Mail02Icon from "@hugeicons/core-free-icons/Mail02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/modules/auth/client/auth-client";

type LoginFormProps = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
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
        setError("El correo o la contraseña no son correctos.");
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError("No pudimos iniciar sesión. Intenta nuevamente.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <Field data-disabled={isPending || undefined}>
          <FieldLabel htmlFor="email">
            <HugeiconsIcon
              icon={Mail02Icon}
              strokeWidth={2}
              aria-hidden
            />
            Correo electrónico
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            required
            disabled={isPending}
            className="h-11 px-4"
          />
        </Field>
        <Field data-disabled={isPending || undefined}>
          <FieldLabel htmlFor="password">
            <HugeiconsIcon
              icon={LockPasswordIcon}
              strokeWidth={2}
              aria-hidden
            />
            Contraseña
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            required
            disabled={isPending}
            className="h-11 px-4"
          />
        </Field>
        {error ? (
          <Field data-invalid="true">
            <FieldError id="login-error">{error}</FieldError>
          </Field>
        ) : null}
        <Field data-disabled={isPending || undefined}>
          <Button
            type="submit"
            size="xl"
            className="w-full"
            disabled={isPending}
          >
            <HugeiconsIcon
              icon={Login02Icon}
              strokeWidth={2}
              data-icon="inline-start"
              aria-hidden
            />
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? "Ingresando..." : "Ingresar"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
