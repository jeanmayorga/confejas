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
import { deleteCompanyAction } from "@/modules/companies/server/actions";

type DeleteCompanyButtonProps = {
  company: {
    id: string;
    name: string;
    participantCount: number;
    counselorCount: number;
  };
};

export function DeleteCompanyButton({ company }: DeleteCompanyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasAssignments =
    company.participantCount > 0 || company.counselorCount > 0;

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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled
        title="Primero debes reasignar sus participantes y consejeros"
        aria-label={`No se puede eliminar ${company.name} porque tiene asignaciones`}
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            aria-label={`Eliminar ${company.name}`}
          />
        }
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar compañía?</AlertDialogTitle>
          <AlertDialogDescription>
            {company.name} se eliminará permanentemente. Esta acción no se puede
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
            {pending ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
