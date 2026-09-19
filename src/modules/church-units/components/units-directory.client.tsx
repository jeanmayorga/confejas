"use client";

import MapPinpoint01Icon from "@hugeicons/core-free-icons/MapPinpoint01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteStakeButton } from "@/modules/church-units/components/delete-stake-button.client";
import { DeleteWardButton } from "@/modules/church-units/components/delete-ward-button.client";
import { StakeFormDialog } from "@/modules/church-units/components/stake-form-dialog.client";
import { WardFormDialog } from "@/modules/church-units/components/ward-form-dialog.client";
import type { UnitConfiguration } from "@/modules/church-units/server/queries";

type UnitsDirectoryProps = {
  units: UnitConfiguration[];
};

export function UnitsDirectory({ units }: UnitsDirectoryProps) {
  const stakes = units.map(({ id, name }) => ({ id, name }));
  const wards = units.flatMap((stake) =>
    stake.wards.map((ward) => ({ ...ward, stakeId: stake.id, stakeName: stake.name })),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.5fr)]">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Estacas</CardTitle>
              <CardDescription className="mt-1">
                Agrupa los barrios y organiza la estructura territorial.
              </CardDescription>
            </div>
            <StakeFormDialog />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {units.length === 0 ? (
            <Empty className="min-h-64">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={MapPinpoint01Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>Aún no hay estacas</EmptyTitle>
                <EmptyDescription>
                  Crea una estaca para empezar a registrar sus barrios.
                </EmptyDescription>
                <StakeFormDialog />
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="divide-y">
              {units.map((stake) => (
                <div
                  key={stake.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{stake.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {stake.wards.length} {stake.wards.length === 1 ? "barrio" : "barrios"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <StakeFormDialog stake={stake} />
                    <DeleteStakeButton
                      stake={{
                        id: stake.id,
                        name: stake.name,
                        wardCount: stake.wards.length,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Barrios</CardTitle>
              <CardDescription className="mt-1">
                Mantén los nombres y la estaca a la que pertenece cada barrio.
              </CardDescription>
            </div>
            <WardFormDialog stakes={stakes} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {wards.length === 0 ? (
            <Empty className="min-h-64">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon icon={MapPinpoint01Icon} strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>Aún no hay barrios</EmptyTitle>
                <EmptyDescription>
                  Crea un barrio y asígnalo a una estaca.
                </EmptyDescription>
                <WardFormDialog stakes={stakes} />
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barrio</TableHead>
                  <TableHead>Estaca</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wards.map((ward) => (
                  <TableRow key={ward.id}>
                    <TableCell className="font-medium">{ward.name}</TableCell>
                    <TableCell>{ward.stakeName}</TableCell>
                    <TableCell>
                      <Badge variant={ward.participantCount > 0 ? "secondary" : "outline"}>
                        {ward.participantCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <WardFormDialog stakes={stakes} ward={ward} />
                        <DeleteWardButton ward={ward} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
