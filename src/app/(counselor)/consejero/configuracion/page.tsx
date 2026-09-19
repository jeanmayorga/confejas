import type { Metadata } from "next";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CounselorSignOutButton } from "@/modules/counselor-app/components/sign-out-button.client";
import { getCounselorAppContext } from "@/modules/counselor-app/server/queries";

export const metadata: Metadata = {
  title: "Configuración",
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
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Configuración
      </h1>

      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
            <Badge variant="secondary">Consejero</Badge>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <HugeiconsIcon
              icon={Building03Icon}
              strokeWidth={2}
              className="size-5 shrink-0 text-primary"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Compañía</p>
              <p className="truncate text-sm font-medium">
                {company?.name ?? "Sin compañía asignada"}
              </p>
            </div>
          </div>

          <CounselorSignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
