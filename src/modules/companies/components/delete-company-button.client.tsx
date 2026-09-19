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
import { deleteCompanyAction } from "@/modules/companies/server/actions";

type DeleteCompanyButtonProps = {
  disabled?: boolean;
  label?: string;
  company: {
    id: string;
    name: string;
    participantCount: number;
    counselorCount: number;
  };
};

export function DeleteCompanyButton({
  company,
  label,
  disabled = false,
}: DeleteCompanyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const hasAssignments =
    company.participantCount > 0 || company.counselorCount > 0;
  const companyLabel = label ?? company.name;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCompanyAction(company.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  if (hasAssignments) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled
              aria-label={`No se puede eliminar ${companyLabel} porque tiene asignaciones`}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
            </Button>
          }
        />
        <TooltipContent>Primero reasigna sus participantes y consejeros</TooltipContent>
      </Tooltip>
    );
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
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive"
                  disabled={disabled}
                  aria-label={`Eliminar ${companyLabel}`}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Eliminar compañía</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirmationStep === 1 ? "¿Eliminar compañía?" : "Última confirmación"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirmationStep === 1
              ? `${companyLabel} se eliminará permanentemente. Selecciona continuar para revisar la confirmación final.`
              : `Esta es la última confirmación. ${companyLabel} se eliminará permanentemente. Esta acción no se puede deshacer.`}
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
