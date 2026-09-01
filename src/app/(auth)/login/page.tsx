import Image from "next/image";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
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
    <main className="grid min-h-svh place-items-center bg-[#e8f8ff] p-4 sm:p-6">
      <div className="grid w-full max-w-3xl items-center gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Confía en Cristo"
            width={224}
            height={224}
            sizes="(min-width: 768px) 224px, 160px"
            priority
            className="size-40 rounded-full object-cover md:size-56"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={safeCallbackUrl} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
