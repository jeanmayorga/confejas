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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteParticipantAction } from "@/modules/participants/server/actions";

type DeleteParticipantButtonProps = {
  participantId: string;
  participantName: string;
};

export function DeleteParticipantButton({
  participantId,
  participantName,
}: DeleteParticipantButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteParticipantAction(participantId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setConfirmationStep(1);
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive"
                  aria-label={`Eliminar ${participantName}`}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Eliminar participante</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmationStep === 1
              ? "¿Eliminar participante?"
              : "Última confirmación"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmationStep === 1
              ? `Esta acción eliminará permanentemente el registro de ${participantName}, incluida su información médica. Selecciona continuar para revisar la confirmación final.`
              : `Esta es la última confirmación. Se eliminará permanentemente el registro de ${participantName}, incluida su información médica. Esta acción no se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (confirmationStep === 1) {
                setConfirmationStep(2);
                return;
              }
              handleDelete();
            }}
          >
            {pending
              ? "Eliminando…"
              : confirmationStep === 1
                ? "Continuar"
                : "Eliminar definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
