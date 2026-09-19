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
import { deleteUserAction } from "@/modules/users/server/actions";

type UserDangerActionsProps = {
  user: { id: string; name: string };
  isCurrentUser: boolean;
};

export function UserDangerActions({
  user,
  isCurrentUser,
}: UserDangerActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUserAction(user.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  if (isCurrentUser) {
    return null;
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
                  variant="destructive"
                  size="icon-md"
                  aria-label={`Eliminar ${user.name}`}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Eliminar usuario</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmationStep === 1
              ? "¿Eliminar usuario?"
              : "Última confirmación"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmationStep === 1
              ? `Esta acción eliminará permanentemente la cuenta de ${user.name} y sus sesiones. Selecciona continuar para revisar la confirmación final.`
              : `Esta es la última confirmación. Se eliminará permanentemente la cuenta de ${user.name} y sus sesiones. Esta acción no se puede deshacer.`}
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
