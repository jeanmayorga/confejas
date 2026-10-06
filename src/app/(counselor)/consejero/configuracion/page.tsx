import type { Metadata } from "next";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { CounselorHelpButton } from "@/modules/counselor-app/components/help-button.client";
import { CounselorSignOutButton } from "@/modules/counselor-app/components/sign-out-button.client";
import { getCounselorAppContext } from "@/modules/counselor-app/server/queries";

export const metadata: Metadata = {
  title: "Cuenta",
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es"))
    .join("");
}

export default async function CounselorSettingsPage() {
  const { user, company } = await getCounselorAppContext();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Cuenta
      </h1>

      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="flex items-start gap-4 p-4">
          <Avatar className="size-12 shrink-0">
            {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{user.name}</p>
            <p className="break-words text-sm text-muted-foreground">
              {user.email}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Rol</p>
            <p className="text-sm font-medium">Consejero</p>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="flex items-center gap-3 p-4">
          <HugeiconsIcon
            icon={Building03Icon}
            strokeWidth={2}
            className="size-5 shrink-0 text-primary"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Compañía asignada</p>
            <p className="text-sm font-medium">
              {company?.name ?? "Sin compañía asignada"}
            </p>
          </div>
        </CardContent>
      </Card>

      <section aria-label="Ayuda" className="mt-2">
        <CounselorHelpButton />
      </section>

      <section aria-label="Sesión" className="mt-2">
        <CounselorSignOutButton />
      </section>
    </div>
  );
}
