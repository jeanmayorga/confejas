"use client";

import { type FormEvent, useState, useTransition } from "react";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteSelectedWardsButton } from "@/modules/church-units/components/delete-selected-wards-button.client";
import { DeleteStakeButton } from "@/modules/church-units/components/delete-stake-button.client";
import { MergeWardDialog } from "@/modules/church-units/components/merge-ward-dialog.client";
import { WardFormDialog } from "@/modules/church-units/components/ward-form-dialog.client";
import { updateStakeAction } from "@/modules/church-units/server/actions";
import type { UnitConfiguration } from "@/modules/church-units/server/queries";

type StakeEditSheetProps = {
  stake: UnitConfiguration;
  stakes: { id: number; name: string }[];
};

export function StakeEditSheet({ stake, stakes }: StakeEditSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(stake.name);
  const [selectedWardIds, setSelectedWardIds] = useState<Set<number>>(
    new Set(),
  );
  const [pending, startTransition] = useTransition();
  const selectedWards = stake.wards.filter((ward) =>
    selectedWardIds.has(ward.id),
  );
  const allWardsSelected =
    stake.wards.length > 0 && selectedWardIds.size === stake.wards.length;
  const someWardsSelected =
    selectedWardIds.size > 0 && !allWardsSelected;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setName(stake.name);
      setSelectedWardIds(new Set());
    }
    setOpen(nextOpen);
  }

  function handleWardSelection(wardId: number, checked: boolean) {
    setSelectedWardIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(wardId);
      } else {
        next.delete(wardId);
      }
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    setSelectedWardIds(
      checked ? new Set(stake.wards.map((ward) => ward.id)) : new Set(),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateStakeAction(stake.id, formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label={"Editar " + stake.name + " y sus barrios"}
              onClick={() => handleOpenChange(true)}
            >
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Editar
            </Button>
          }
        />
        <TooltipContent>Editar estaca y barrios</TooltipContent>
      </Tooltip>

      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b pr-16">
          <SheetTitle className="text-xl">Editar estaca</SheetTitle>
          <SheetDescription>
            Actualiza la estaca y administra sus barrios.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 py-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={"stake-name-" + stake.id}>
                  Nombre
                </FieldLabel>
                <Input
                  id={"stake-name-" + stake.id}
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  disabled={pending}
                  required
                />
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>

          <div className="border-t pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium">Barrios</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stake.wards.length}{" "}
                  {stake.wards.length === 1 ? "barrio" : "barrios"} asignados a
                  esta estaca.
                </p>
              </div>
              <WardFormDialog
                stakes={stakes}
                triggerLabel="Agregar barrio"
                defaultStakeId={stake.id}
              />
            </div>

            {selectedWards.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  {selectedWards.length}{" "}
                  {selectedWards.length === 1
                    ? "barrio seleccionado"
                    : "barrios seleccionados"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <MergeWardDialog
                    wards={selectedWards}
                    onSuccess={() => setSelectedWardIds(new Set())}
                  />
                  <DeleteSelectedWardsButton
                    wards={selectedWards}
                    onSuccess={() => setSelectedWardIds(new Set())}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedWardIds(new Set())}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-lg border">
              <Table className="[&_tr]:h-9 [&_th]:h-9 [&_th]:py-0 [&_td]:h-9 [&_td]:py-0">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allWardsSelected}
                        indeterminate={someWardsSelected}
                        onCheckedChange={(checked) =>
                          handleSelectAll(checked === true)
                        }
                        aria-label="Seleccionar todos los barrios"
                      />
                    </TableHead>
                    <TableHead>Barrio</TableHead>
                    <TableHead>Participantes</TableHead>
                    <TableHead className="w-12" aria-label="Acciones" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stake.wards.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-20 text-center text-sm text-muted-foreground"
                      >
                        Esta estaca aún no tiene barrios.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stake.wards.map((ward) => (
                      <TableRow key={ward.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedWardIds.has(ward.id)}
                            onCheckedChange={(checked) =>
                              handleWardSelection(ward.id, checked === true)
                            }
                            aria-label={"Seleccionar " + ward.name}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {ward.name}
                        </TableCell>
                        <TableCell>{ward.participantCount}</TableCell>
                        <TableCell className="text-right">
                          <WardFormDialog
                            stakes={stakes}
                            ward={{ ...ward, stakeId: stake.id }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex justify-end">
              <DeleteStakeButton
                stake={{
                  id: stake.id,
                  name: stake.name,
                  wardCount: stake.wards.length,
                }}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
