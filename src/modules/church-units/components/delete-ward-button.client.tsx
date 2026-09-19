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
import { deleteWardAction } from "@/modules/church-units/server/actions";

type DeleteWardButtonProps = {
  ward: {
    id: number;
    name: string;
    participantCount: number;
  };
  disabled?: boolean;
};

export function DeleteWardButton({
  ward,
  disabled = false,
}: DeleteWardButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWardAction(ward.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  if (ward.participantCount > 0) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label={`No se puede eliminar ${ward.name} porque tiene participantes`}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            </Button>
          }
        />
        <TooltipContent>Primero reasigna sus participantes</TooltipContent>
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
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  disabled={disabled}
                  aria-label={`Eliminar ${ward.name}`}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Eliminar barrio</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar barrio?</AlertDialogTitle>
          <AlertDialogDescription>
            {ward.name} se eliminará permanentemente. Esta acción no se puede
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
