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
import { deleteCounselorAction } from "@/modules/counselors/server/actions";

type DeleteCounselorButtonProps = {
  counselor: { id: string; name: string };
  showLabel?: boolean;
  onDeleted?: () => void;
};

export function DeleteCounselorButton({
  counselor,
  showLabel = false,
  onDeleted,
}: DeleteCounselorButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCounselorAction(counselor.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      onDeleted?.();
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
                  type="button"
                  variant={showLabel ? "outline" : "ghost"}
                  size={showLabel ? "sm" : "icon-md"}
                  className="text-destructive"
                  aria-label={`Eliminar ${counselor.name}`}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  {showLabel ? "Eliminar" : null}
                </Button>
              }
            />
          }
        />
        <TooltipContent>Eliminar consejero</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmationStep === 1 ? "¿Eliminar consejero?" : "Última confirmación"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmationStep === 1
              ? `${counselor.name} se eliminará permanentemente. Selecciona continuar para revisar la confirmación final.`
              : `Esta es la última confirmación. ${counselor.name} se eliminará permanentemente. Esta acción no se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
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
            {pending ? <Spinner data-icon="inline-start" /> : null}
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
