"use client";

import MapPinpoint01Icon from "@hugeicons/core-free-icons/MapPinpoint01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

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
  TableFrame,
  TableHead,
  TableFooter,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StakeEditSheet } from "@/modules/church-units/components/stake-edit-sheet.client";
import type { UnitConfiguration } from "@/modules/church-units/server/queries";

type UnitsDirectoryProps = {
  units: UnitConfiguration[];
};

export function UnitsDirectory({ units }: UnitsDirectoryProps) {
  const stakes = units.map(({ id, name }) => ({ id, name }));

  return (
    <div className="flex flex-col gap-4">
      {units.length === 0 ? (
        <Empty className="min-h-64 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={MapPinpoint01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Aún no hay unidades</EmptyTitle>
            <EmptyDescription>
              No hay unidades configuradas para esta sesión.
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
              <TableFrame
                key={stake.id}
                aria-labelledby={`stake-${stake.id}`}
              >
                <div className="flex h-9 flex-col justify-center gap-3 border-b bg-muted/30 px-4 py-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 id={`stake-${stake.id}`} className="text-sm font-medium">
                      {stake.name}
                    </h2>
                  </div>
                  <div className="flex shrink-0 justify-end gap-1">
                    <StakeEditSheet stake={stake} stakes={stakes} />
                  </div>
                </div>
                <Table className="table-fixed [&_tr]:h-9 [&_th]:h-9 [&_th]:py-0 [&_td]:h-9 [&_td]:py-0">
                  <colgroup>
                    <col className="w-2/3" />
                    <col className="w-1/3" />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barrio</TableHead>
                      <TableHead>Participantes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stake.wards.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
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
                          <TableCell>{ward.participantCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="font-medium">
                        {participantCount}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableFrame>
            );
          })}
        </div>
      )}
    </div>
  );
}
