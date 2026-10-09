import type { Metadata } from "next";
import { HomeReports } from "@/modules/dashboard/components/home-reports";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/modules/auth/server/session";
import {
  canViewParticipantDirectory,
  getRoleLabel,
} from "@/modules/auth/roles";

export const metadata: Metadata = {
  title: "Inicio | Confejas",
};

export default async function DashboardPage() {
  const session = await requireSession();
  const canViewDirectory = canViewParticipantDirectory(session.user.role);

  if (canViewDirectory) {
    return <HomeReports name={session.user.name.split(" ")[0]} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Badge variant="secondary">{getRoleLabel(session.user.role)}</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Hola, {session.user.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tu acceso a Confejas está activo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Espacio del participante</CardTitle>
          <CardDescription>
            Aquí podrás consultar tu información, tu código QR y las actividades
            asignadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este espacio se habilitará cuando conectemos cada cuenta con su
            registro de participante.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
