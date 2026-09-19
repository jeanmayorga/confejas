"use client";

import { useState, useTransition } from "react";
import MergeIcon from "@hugeicons/core-free-icons/MergeIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mergeWardAction } from "@/modules/church-units/server/actions";

type WardOption = {
  id: number;
  name: string;
  participantCount: number;
};

type MergeWardDialogProps = {
  ward: WardOption;
  candidates: WardOption[];
  disabled?: boolean;
};

export function MergeWardDialog({
  ward,
  candidates,
  disabled = false,
}: MergeWardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetWardId, setTargetWardId] = useState(
    candidates[0]?.id.toString() ?? "",
  );
  const [pending, startTransition] = useTransition();
  const targetWard = candidates.find(
    (candidate) => candidate.id.toString() === targetWardId,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (pending) {
      return;
    }

    if (nextOpen) {
      setTargetWardId(candidates[0]?.id.toString() ?? "");
    }

    setOpen(nextOpen);
  }

  function handleMerge() {
    if (!targetWard) {
      return;
    }

    startTransition(async () => {
      const result = await mergeWardAction(ward.id, targetWard.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  if (candidates.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label={"No se puede fusionar " + ward.name}
            >
              <HugeiconsIcon icon={MergeIcon} strokeWidth={2} />
            </Button>
          }
        />
        <TooltipContent>No hay otro barrio en esta estaca</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={"Fusionar " + ward.name}
                >
                  <HugeiconsIcon icon={MergeIcon} strokeWidth={2} />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Fusionar barrio</TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fusionar barrio</DialogTitle>
          <DialogDescription>
            Los participantes de {ward.name} se moverán al barrio que elijas y
            este registro se eliminará.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={"merge-ward-" + ward.id}>
              Conservar en
            </FieldLabel>
            <Select
              value={targetWardId}
              onValueChange={(nextWardId) => {
                if (nextWardId) {
                  setTargetWardId(nextWardId);
                }
              }}
              disabled={pending}
            >
              <SelectTrigger
                id={"merge-ward-" + ward.id}
                aria-label="Conservar en"
                className="w-full"
              >
                <SelectValue>
                  {targetWard
                    ? `${targetWard.name} (${targetWard.participantCount} ${targetWard.participantCount === 1 ? "participante" : "participantes"})`
                    : "Selecciona un barrio"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {candidates.map((candidate) => (
                  <SelectItem
                    key={candidate.id}
                    value={candidate.id.toString()}
                  >
                    {candidate.name} ({candidate.participantCount}{" "}
                    {candidate.participantCount === 1
                      ? "participante"
                      : "participantes"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        {targetWard ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Se moverán {ward.participantCount}{" "}
            {ward.participantCount === 1 ? "participante" : "participantes"} a{" "}
            {targetWard.name}. Esta acción no se puede deshacer.
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !targetWard}
            onClick={handleMerge}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Fusionando…" : "Fusionar barrio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
