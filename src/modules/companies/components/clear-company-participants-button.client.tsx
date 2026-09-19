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

export function ClearCompanyParticipantsButton({
  participantCount,
}: {
  participantCount: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [updating, setUpdating] = useState(false);
  const isUpdating = updating || refreshing;

  if (participantCount === 0) {
    return null;
  }

  async function handleClear() {
    if (isUpdating) return;

    setUpdating(true);
    const operation = clearCompanyParticipantsAction().then(async (result) => {
      if (!result.success) {
        throw new Error(result.message);
      }

      await queryClient.invalidateQueries({
        queryKey: ["company-unassigned-participants"],
      });
      startTransition(() => {
        router.refresh();
      });
      return result;
    });

    toast.promise(operation, {
      loading: "Vaciando compañías…",
      success: (result) => result.message,
      error: (error) =>
        error instanceof Error
          ? error.message
          : "No pudimos vaciar las compañías.",
    });

    try {
      await operation;
      setOpen(false);
    } catch {
      // El mensaje de error ya se presenta mediante el toast de la promesa.
    } finally {
      setUpdating(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isUpdating) {
          setOpen(nextOpen);
        }
      }}
    >
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive">
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
            {participantCount.toLocaleString("es-EC")}{" "}
            {participantCount === 1
              ? "participante quedará"
              : "participantes quedarán"}{" "}
            sin compañía. Sus registros se conservarán y podrás distribuirlos
            nuevamente después.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isUpdating}
            onClick={handleClear}
          >
            {isUpdating ? <Spinner data-icon="inline-start" /> : null}
            {isUpdating ? "Vaciando…" : "Vaciar compañías"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
