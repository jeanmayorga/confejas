"use client";

import MapPinpoint01Icon from "@hugeicons/core-free-icons/MapPinpoint01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <StakeFormDialog />
        <WardFormDialog stakes={stakes} />
      </div>
      {units.length === 0 ? (
        <Empty className="min-h-64 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={MapPinpoint01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Aún no hay unidades</EmptyTitle>
            <EmptyDescription>
              Crea una estaca para empezar a registrar sus barrios.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {units.map((stake) => {
            const participantCount = stake.wards.reduce(
              (total, ward) => total + ward.participantCount,
              0,
            );

            return (
              <section
                key={stake.id}
                className="overflow-hidden rounded-xl border"
                aria-labelledby={`stake-${stake.id}`}
              >
                <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 id={`stake-${stake.id}`} className="font-medium">
                      {stake.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {participantCount} participantes
                    </p>
                  </div>
                  <div className="flex shrink-0 justify-end gap-1">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barrio</TableHead>
                      <TableHead>Participantes</TableHead>
                      <TableHead className="w-28 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stake.wards.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-20 text-center text-muted-foreground"
                        >
                          Esta estaca aún no tiene barrios.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stake.wards.map((ward) => (
                        <TableRow key={ward.id}>
                          <TableCell className="font-medium">
                            {ward.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                ward.participantCount > 0
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {ward.participantCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <WardFormDialog
                                stakes={stakes}
                                ward={{ ...ward, stakeId: stake.id }}
                              />
                              <DeleteWardButton ward={ward} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
