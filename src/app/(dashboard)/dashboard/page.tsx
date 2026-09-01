import Link from "next/link";
import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/modules/auth/server/session";
import {
  canManageUsers,
  canViewParticipantDirectory,
  getRoleLabel,
} from "@/modules/auth/roles";
import { getDashboardMetrics } from "@/modules/dashboard/server/queries";

export default async function DashboardPage() {
  const session = await requireSession();
  const canViewDirectory = canViewParticipantDirectory(session.user.role);

  if (!canViewDirectory) {
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
              Aquí podrás consultar tu información, tu código QR y las
              actividades asignadas.
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

  const metrics = await getDashboardMetrics();
  const cards = [
    {
      label: "Participantes",
      value: metrics.participants,
      description: "Registros del evento",
      icon: UserMultiple02Icon,
    },
    {
      label: "Barrios",
      value: metrics.wards,
      description: "Unidades configuradas",
      icon: DashboardSquare01Icon,
    },
    ...(canManageUsers(session.user.role)
      ? [
          {
            label: "Usuarios",
            value: metrics.users,
            description: "Accesos al sistema",
            icon: UserGroupIcon,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-primary">Panel de control</p>
          <Badge variant="secondary">{getRoleLabel(session.user.role)}</Badge>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Hola, {session.user.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Aquí tienes el estado actual de Confejas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {card.value.toLocaleString("es-EC")}
              </CardTitle>
              <CardAction className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={card.icon} strokeWidth={2} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directorio de participantes</CardTitle>
          <CardDescription>
            Consulta los registros por nombre y barrio. La información médica
            permanece separada del listado general.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/participants" />}
          >
            Ver participantes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
