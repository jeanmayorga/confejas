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
  wards: WardOption[];
  disabled?: boolean;
  onSuccess?: () => void;
};

export function MergeWardDialog({
  wards,
  disabled = false,
  onSuccess,
}: MergeWardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [keepWardId, setKeepWardId] = useState(wards[0]?.id.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const canMerge = wards.length === 2;
  const keepWard = wards.find(
    (ward) => ward.id.toString() === keepWardId,
  );
  const sourceWard = wards.find((ward) => ward.id.toString() !== keepWardId);

  function handleOpenChange(nextOpen: boolean) {
    if (pending) {
      return;
    }

    if (nextOpen) {
      setKeepWardId(wards[0]?.id.toString() ?? "");
    }

    setOpen(nextOpen);
  }

  function handleMerge() {
    if (!canMerge || !keepWard || !sourceWard) {
      return;
    }

    startTransition(async () => {
      const result = await mergeWardAction(sourceWard.id, keepWard.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onSuccess?.();
      setOpen(false);
      router.refresh();
    });
  }

  if (!canMerge) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              aria-label="Fusionar barrios"
            >
              <HugeiconsIcon icon={MergeIcon} strokeWidth={2} />
              Fusionar
            </Button>
          }
        />
        <TooltipContent>Selecciona exactamente dos barrios</TooltipContent>
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
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  aria-label="Fusionar barrios"
                >
                  <HugeiconsIcon icon={MergeIcon} strokeWidth={2} />
                  Fusionar
                </Button>
              }
            />
          }
        />
        <TooltipContent>Fusionar barrio</TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fusionar barrios</DialogTitle>
          <DialogDescription>
            Los participantes del barrio que no conserves se moverán al barrio
            que elijas y ese registro se eliminará.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="merge-ward-target">
              Conservar en
            </FieldLabel>
            <Select
              value={keepWardId}
              onValueChange={(nextWardId) => {
                if (nextWardId) {
                  setKeepWardId(nextWardId);
                }
              }}
              disabled={pending}
            >
              <SelectTrigger
                id="merge-ward-target"
                aria-label="Conservar en"
                className="w-full"
              >
                <SelectValue>
                  {keepWard
                    ? keepWard.name +
                      " (" +
                      keepWard.participantCount +
                      " " +
                      (keepWard.participantCount === 1
                        ? "participante"
                        : "participantes") +
                      ")"
                    : "Selecciona un barrio"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {wards.map((ward) => (
                  <SelectItem
                    key={ward.id}
                    value={ward.id.toString()}
                  >
                    {ward.name} ({ward.participantCount}{" "}
                    {ward.participantCount === 1
                      ? "participante"
                      : "participantes"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        {keepWard && sourceWard ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Se moverán {sourceWard.participantCount}{" "}
            {sourceWard.participantCount === 1
              ? "participante"
              : "participantes"}{" "}
            a {keepWard.name}. Esta acción no se puede deshacer.
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
            disabled={pending || !keepWard || !sourceWard}
            onClick={handleMerge}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Fusionando…" : "Fusionar barrios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
