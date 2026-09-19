"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import UserRemove01Icon from "@hugeicons/core-free-icons/UserRemove01Icon";
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
import { clearCompanyParticipantsAction } from "@/modules/companies/server/actions";

const destructiveOutlineClassName =
  "border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground";

export function ClearCompanyParticipantsButton({
  participantCount,
}: {
  participantCount: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (participantCount === 0) {
    return null;
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearCompanyParticipantsAction();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["company-unassigned-participants"],
      });
      router.refresh();
    });
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
            variant="outline"
            className={destructiveOutlineClassName}
          >
            <HugeiconsIcon
              icon={UserRemove01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Vaciar compañías
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Vaciar todas las compañías?</AlertDialogTitle>
          <AlertDialogDescription>
            {participantCount.toLocaleString("es-EC")} {participantCount === 1 ? "participante quedará" : "participantes quedarán"} sin compañía. Sus registros se conservarán y podrás distribuirlos nuevamente después.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={handleClear}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Vaciando…" : "Vaciar compañías"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
