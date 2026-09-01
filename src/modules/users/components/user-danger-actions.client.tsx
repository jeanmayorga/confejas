"use client";

import { useState, useTransition } from "react";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import LockIcon from "@hugeicons/core-free-icons/LockIcon";
import UserUnlock01Icon from "@hugeicons/core-free-icons/UserUnlock01Icon";
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
  deleteUserAction,
  setUserBlockedAction,
} from "@/modules/users/server/actions";

type UserDangerActionsProps = {
  user: { id: string; name: string; banned: boolean | null };
  isCurrentUser: boolean;
};

export function UserDangerActions({ user, isCurrentUser }: UserDangerActionsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"status" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(kind: "status" | "delete") {
    startTransition(async () => {
      const result =
        kind === "delete"
          ? await deleteUserAction(user.id)
          : await setUserBlockedAction(user.id, !user.banned);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setDialog(null);
      router.refresh();
    });
  }

  if (isCurrentUser) {
    return null;
  }

  return (
    <>
      <AlertDialog
        open={dialog === "status"}
        onOpenChange={(open) => setDialog(open ? "status" : null)}
      >
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={user.banned ? `Desbloquear ${user.name}` : `Bloquear ${user.name}`}
            />
          }
        >
          <HugeiconsIcon icon={user.banned ? UserUnlock01Icon : LockIcon} strokeWidth={2} />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.banned ? "¿Desbloquear usuario?" : "¿Bloquear usuario?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.banned
                ? `${user.name} podrá volver a iniciar sesión.`
                : `${user.name} perderá el acceso y sus sesiones activas se cerrarán.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={user.banned ? "default" : "destructive"}
              disabled={pending}
              onClick={() => runAction("status")}
            >
              {pending ? "Procesando…" : user.banned ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
      >
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              aria-label={`Eliminar ${user.name}`}
            />
          }
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              La cuenta de {user.name} y sus sesiones se eliminarán permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => runAction("delete")}
            >
              {pending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
