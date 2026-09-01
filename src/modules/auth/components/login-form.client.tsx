"use client";

import { FormEvent, useState } from "react";
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
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            required
            disabled={isPending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
          />
        </Field>
        {error ? (
          <Field data-invalid="true">
            <FieldError>{error}</FieldError>
          </Field>
        ) : null}
        <Field>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Spinner /> : null}
            {isPending ? "Ingresando..." : "Ingresar"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
