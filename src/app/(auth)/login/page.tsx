import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/modules/auth/components/login-form.client";
import { getSession } from "@/modules/auth/server/session";

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
    <main className="grid min-h-svh place-items-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm">
            C
          </div>
          <div>
            <p className="text-xl font-semibold tracking-tight">Confejas</p>
            <p className="text-sm text-muted-foreground">
              Gestión de participantes
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>
              Ingresa con la cuenta asignada por el administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={safeCallbackUrl} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
