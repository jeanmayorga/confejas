import BedBunkIcon from "@hugeicons/core-free-icons/BedBunkIcon";
import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import FemaleSymbolIcon from "@hugeicons/core-free-icons/FemaleSymbolIcon";
import MaleSymbolIcon from "@hugeicons/core-free-icons/MaleSymbolIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { getLodgingOverview } from "@/modules/lodging/server/queries";
import type { LodgingSex } from "@/modules/lodging/server/schema";

const sexPresentation = {
  female: {
    label: "Mujeres",
    accommodationLabel: "Alojamiento para mujeres",
    icon: FemaleSymbolIcon,
  },
  male: {
    label: "Varones",
    accommodationLabel: "Alojamiento para varones",
    icon: MaleSymbolIcon,
  },
} satisfies Record<
  LodgingSex,
  { label: string; accommodationLabel: string; icon: typeof FemaleSymbolIcon }
>;

function formatNumber(value: number) {
  return value.toLocaleString("es-EC");
}

export default async function LodgingPage() {
  await requireParticipantDirectoryAccess();
  const { buildings, totals } = await getLodgingOverview();

  const metrics = [
    {
      label: "Edificios",
      value: totals.buildings,
      detail: `${totals.rooms} dormitorios`,
      icon: Building06Icon,
    },
    {
      label: "Asignados",
      value: totals.assignedParticipants,
      detail: `de ${formatNumber(totals.registeredParticipants)} registrados`,
      icon: UserGroupIcon,
    },
    {
      label: "Sin dormitorio",
      value: totals.unassignedParticipants,
      detail: "pendientes de asignar",
      icon: UserGroupIcon,
    },
    {
      label: "Capacidad total",
      value: totals.total,
      detail: "camas registradas",
      icon: BedBunkIcon,
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Alojamiento</h1>
          <Badge variant="secondary">Ocupación en vivo</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta cuántas personas hay en cada dormitorio y cuántos cupos
          quedan disponibles.
        </p>
      </div>

      <section aria-labelledby="capacity-summary-title">
        <h2 id="capacity-summary-title" className="sr-only">
          Resumen de capacidad
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} size="sm">
              <CardHeader>
                <CardTitle>{metric.label}</CardTitle>
                <CardAction>
                  <HugeiconsIcon
                    icon={metric.icon}
                    strokeWidth={2}
                    className="text-muted-foreground"
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">
                  {formatNumber(metric.value)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {metric.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="sex-distribution-title">
        <div className="mb-3">
          <h2 id="sex-distribution-title" className="text-lg font-medium">
            Distribución por sexo
          </h2>
          <p className="text-sm text-muted-foreground">
            Ocupación actual y capacidad planificada para mujeres y varones.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {(["female", "male"] as const).map((sex) => {
            const presentation = sexPresentation[sex];
            const sexTotals = totals.bySex[sex];
            const buildingNames = buildings
              .filter((building) => building.sex === sex)
              .map((building) => building.name)
              .join(" y ");

            return (
              <Card key={sex} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HugeiconsIcon icon={presentation.icon} strokeWidth={2} />
                    {presentation.label}
                  </CardTitle>
                  <CardDescription>
                    {buildingNames || "Sin edificios registrados"}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">
                      {formatNumber(sexTotals.assignedParticipants)} de{" "}
                      {formatNumber(sexTotals.participants)} asignados
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-3 gap-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Asignados
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {formatNumber(sexTotals.assignedParticipants)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Cupos libres
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {formatNumber(sexTotals.availableParticipantCapacity)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Coordinación
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {formatNumber(sexTotals.coordinators)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="buildings-title">
        <div className="mb-3">
          <h2 id="buildings-title" className="text-lg font-medium">
            Edificios y dormitorios
          </h2>
          <p className="text-sm text-muted-foreground">
            “Asignados” se calcula con los participantes que tienen un
            dormitorio seleccionado.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {buildings.map((building) => {
            const presentation = sexPresentation[building.sex];

            return (
              <Card key={building.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HugeiconsIcon icon={Building06Icon} strokeWidth={2} />
                    {building.name}
                  </CardTitle>
                  <CardDescription>
                    {presentation.accommodationLabel}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="secondary">
                      {formatNumber(building.assignedParticipants)} de{" "}
                      {formatNumber(building.participantCapacity)}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-(--card-spacing)">
                          Dormitorio
                        </TableHead>
                        <TableHead className="text-right">
                          Asignados
                        </TableHead>
                        <TableHead className="text-right">
                          Libres
                        </TableHead>
                        <TableHead className="hidden pr-(--card-spacing) text-right sm:table-cell">
                          Coordinación
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {building.rooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell className="pl-(--card-spacing) font-medium">
                            Dormitorio {room.number}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                room.assignedParticipants > 0
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {formatNumber(room.assignedParticipants)} /{" "}
                              {formatNumber(room.participantCapacity)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(room.availableParticipantCapacity)}
                          </TableCell>
                          <TableCell className="hidden pr-(--card-spacing) text-right font-medium sm:table-cell">
                            {formatNumber(room.coordinatorCapacity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="pl-(--card-spacing)">
                          Total
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(building.assignedParticipants)} /{" "}
                          {formatNumber(building.participantCapacity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(building.availableParticipantCapacity)}
                        </TableCell>
                        <TableCell className="hidden pr-(--card-spacing) text-right sm:table-cell">
                          {formatNumber(building.coordinatorCapacity)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
                <CardFooter className="justify-between border-t text-sm text-muted-foreground">
                  <span>
                    {formatNumber(building.assignedParticipants)} participantes
                    asignados
                  </span>
                  <span>{formatNumber(building.totalCapacity)} camas</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
