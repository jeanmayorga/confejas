import Image from "next/image";
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
    <main className="grid min-h-svh place-items-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image
            src="/logo.png"
            alt="Confía en Cristo"
            width={160}
            height={160}
            priority
            className="size-40 rounded-full object-cover shadow-sm"
          />
          <p className="text-sm text-muted-foreground">
            Gestión de participantes
          </p>
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
