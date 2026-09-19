"use client";

import { useState, useTransition } from "react";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteWardsAction } from "@/modules/church-units/server/actions";

type WardOption = {
  id: number;
  name: string;
  participantCount: number;
};

type DeleteSelectedWardsButtonProps = {
  wards: WardOption[];
  disabled?: boolean;
  onSuccess?: () => void;
};

export function DeleteSelectedWardsButton({
  wards,
  disabled = false,
  onSuccess,
}: DeleteSelectedWardsButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasParticipants = wards.some((ward) => ward.participantCount > 0);
  const wardNames = wards.map((ward) => ward.name).join(", ");

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWardsAction(wards.map((ward) => ward.id));

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

  if (hasParticipants) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled
              aria-label="Eliminar barrios seleccionados"
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Eliminar
            </Button>
          }
        />
        <TooltipContent>
          Solo puedes eliminar barrios sin participantes
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
        }
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={disabled}
            aria-label="Eliminar barrios seleccionados"
          >
            <HugeiconsIcon
              icon={Delete02Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Eliminar
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar barrios seleccionados?</AlertDialogTitle>
          <AlertDialogDescription>
            {wardNames} se eliminarán permanentemente. Esta acción no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Eliminando…" : "Eliminar definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
