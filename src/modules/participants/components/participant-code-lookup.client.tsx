"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import KeyboardIcon from "@hugeicons/core-free-icons/KeyboardIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { normalizeGovernmentId } from "@/modules/participants/identity";
import { findParticipantForCheckInAction } from "@/modules/participants/server/actions";

export function ParticipantCodeLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!navigator.onLine) {
      setError("No hay conexión a internet. Conéctate para buscar al participante.");
      return;
    }

    const governmentId = normalizeGovernmentId(code);

    if (!governmentId) {
      setError("Ingresa una cédula válida.");
      return;
    }

    startTransition(async () => {
      const result = await findParticipantForCheckInAction(governmentId);

      if (!result.success) {
        setError(result.message);
        return;
      }

      router.replace(
        `/dashboard/check-in/code?participantId=${result.participantId}`,
        { scroll: false },
      );
    });
  }

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <HugeiconsIcon icon={KeyboardIcon} strokeWidth={2} />
        </div>
        <CardTitle>Escribir código</CardTitle>
        <CardDescription>
          El código del participante es su número de cédula.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="participant-code">Cédula</FieldLabel>
              <Input
                id="participant-code"
                name="participantCode"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError(null);
                }}
                placeholder="Ej. 0912345678"
                inputMode="numeric"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                autoFocus
              />
              <FieldDescription>
                Puedes escribirla con o sin espacios y guiones.
              </FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button type="submit" size="lg" disabled={!code.trim() || pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Buscando…" : "Buscar participante"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
