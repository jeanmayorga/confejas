"use client";

import { type FormEvent, useState, useTransition } from "react";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DeleteStakeButton } from "@/modules/church-units/components/delete-stake-button.client";
import { DeleteWardButton } from "@/modules/church-units/components/delete-ward-button.client";
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
  const [pending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setName(stake.name);
    }
    setOpen(nextOpen);
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

            <div className="mt-4 divide-y rounded-lg border">
              {stake.wards.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Esta estaca aún no tiene barrios.
                </p>
              ) : (
                stake.wards.map((ward) => (
                  <div
                    key={ward.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{ward.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ward.participantCount}{" "}
                        {ward.participantCount === 1
                          ? "participante"
                          : "participantes"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <WardFormDialog
                        stakes={stakes}
                        ward={{ ...ward, stakeId: stake.id }}
                      />
                      <MergeWardDialog
                        ward={ward}
                        candidates={stake.wards.filter(
                          (candidate) => candidate.id !== ward.id,
                        )}
                      />
                      <DeleteWardButton ward={ward} />
                    </div>
                  </div>
                ))
              )}
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
