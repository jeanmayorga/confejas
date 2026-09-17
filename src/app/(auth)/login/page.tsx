import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/modules/auth/components/login-form.client";
import { getSession } from "@/modules/auth/server/session";

export const metadata: Metadata = {
  title: "Iniciar sesión | Confejas",
  description: "Acceso al panel de gestión de Confejas.",
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

function getSafeCallbackUrl(value: string | string[] | undefined) {
  const callbackUrl = Array.isArray(value) ? value[0] : value;

  if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/dashboard";
  }

  return callbackUrl;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ callbackUrl }, session] = await Promise.all([
    searchParams,
    getSession(),
  ]);
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  if (session) {
    redirect(safeCallbackUrl);
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
        <section className="relative flex min-h-56 overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:min-h-64 sm:px-10 lg:min-h-svh lg:px-12 lg:py-10">
          <div
            aria-hidden="true"
            className="absolute -left-20 -top-20 size-64 rounded-full border border-primary-foreground/15"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-48 -right-24 size-96 rounded-full border border-primary-foreground/10 bg-primary-foreground/5"
          />
          <div
            aria-hidden="true"
            className="absolute right-14 top-12 size-3 rounded-full bg-primary-foreground/25"
          />

          <div className="relative mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-4 text-center lg:gap-6">
            <div className="shrink-0 rounded-full bg-primary-foreground/10 p-2 shadow-2xl shadow-foreground/10 ring-1 ring-primary-foreground/20 lg:p-3">
              <Image
                src="/logo.png"
                alt="Confía en Cristo"
                width={256}
                height={256}
                sizes="(min-width: 1024px) 256px, 128px"
                priority
                className="size-28 rounded-full object-cover sm:size-32 lg:size-64"
              />
            </div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary-foreground/70 uppercase">
              Confejas Staff
            </p>
          </div>
        </section>

        <section className="relative flex items-center justify-center overflow-hidden bg-muted/30 px-5 py-10 sm:px-10 lg:px-12">
          <div
            aria-hidden="true"
            className="absolute -right-28 top-12 size-64 rounded-full bg-primary/5 blur-3xl"
          />

          <div className="relative flex w-full max-w-md flex-col gap-5">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Bienvenido de nuevo
                  </h1>
                </CardTitle>
                <CardDescription>
                  Ingresa con las credenciales asignadas para continuar al
                  panel de gestión.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm callbackUrl={safeCallbackUrl} />
              </CardContent>
              <CardFooter className="justify-center">
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Acceso exclusivo para personal autorizado.
                </p>
              </CardFooter>
            </Card>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              ¿Necesitas ayuda para ingresar? Contacta al administrador del
              sistema.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
