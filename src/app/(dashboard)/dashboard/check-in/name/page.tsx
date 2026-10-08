import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireCheckInAccess } from "@/modules/auth/server/session";
import { ParticipantCheckInSheetLoader } from "@/modules/participants/components/participant-check-in-sheet-loader";
import { searchParticipantsByNameForCheckIn } from "@/modules/participants/server/queries";

export const metadata: Metadata = { title: "Buscar nombre | Confejas" };

type SearchParams = Promise<{
  q?: string | string[];
  participantId?: string | string[];
  saved?: string | string[];
}>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NameCheckInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireCheckInAccess();
  const query = await searchParams;
  const search = (first(query.q) ?? "").trim().slice(0, 100);
  const participantId = first(query.participantId);
  const results = await searchParticipantsByNameForCheckIn(search);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-primary">Recepción</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Buscar nombre
          </h1>
          <p className="text-muted-foreground">
            Selecciona al participante para revisar sus datos y confirmar su
            llegada.
          </p>
        </div>
        <Link
          href="/dashboard/check-in"
          className={buttonVariants({ variant: "outline" })}
        >
          Cambiar método
        </Link>
      </div>

      <Form action="/dashboard/check-in/name">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="participant-name">
              Nombres o apellidos
            </FieldLabel>
            <Input
              key={search}
              id="participant-name"
              name="q"
              defaultValue={search}
              minLength={2}
              maxLength={100}
              required
              placeholder="Ej. María Pérez"
              autoComplete="off"
            />
            <FieldDescription>
              Escribe al menos 2 caracteres. Puedes buscar sin tildes.
            </FieldDescription>
          </Field>
          <Button type="submit" size="lg">
            Buscar participante
          </Button>
        </FieldGroup>
      </Form>

      {search.length >= 2 ? (
        <section
          aria-label="Resultados de búsqueda"
          className="flex flex-col gap-3"
        >
          <p role="status" className="text-sm text-muted-foreground">
            {results.length === 0
              ? "No encontramos participantes con ese nombre. Revisa la escritura o prueba con otro apellido."
              : results.length > 30
                ? "Hay más de 30 coincidencias. Agrega otro nombre o apellido para precisar la búsqueda."
                : `${results.length} participante${results.length === 1 ? "" : "s"}. Revisa el barrio y la estaca antes de seleccionar.`}
          </p>
          <ul className="flex flex-col gap-2">
            {results.slice(0, 30).map((participant) => (
              <li key={participant.id}>
                <Link
                  href={`/dashboard/check-in/name?${new URLSearchParams({ q: search, participantId: participant.id })}`}
                  scroll={false}
                  className="flex flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="font-semibold">
                    {participant.firstNames} {participant.lastNames}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {participant.wardName} · {participant.stakeName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Código {participant.sourceRecordId} ·{" "}
                    {participant.companyName ?? "Sin compañía"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ParticipantCheckInSheetLoader
        participantId={participantId}
        returnPath="/dashboard/check-in/name"
        saved={first(query.saved) === "1"}
      />
    </div>
  );
}
