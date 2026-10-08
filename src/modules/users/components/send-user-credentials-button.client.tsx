"use client";

import { useState, useTransition } from "react";
import MailSend02Icon from "@hugeicons/core-free-icons/MailSend02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { sendUserCredentialsAction } from "@/modules/users/server/actions";

export function SendUserCredentialsButton({
  user,
  disabled = false,
}: {
  user: { id: string; name: string; email: string };
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSend() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await sendUserCredentialsAction(user.id);
        if (!result.success) {
          setError(result.message);
          return;
        }
        toast.success(result.message);
        setOpen(false);
      } catch {
        setError(
          "No pudimos confirmar el envío. Revisa la conexión e inténtalo nuevamente.",
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`Enviar credenciales a ${user.name}`}
          />
        }
      >
        <HugeiconsIcon icon={MailSend02Icon} data-icon="inline-start" />
        Enviar credenciales
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>Enviar credenciales</DialogTitle>
          <DialogDescription className="break-words">
            Se enviarán los datos de acceso de {user.name} a {user.email}. Se
            generará una nueva contraseña que reemplazará la actual.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button disabled={pending} onClick={handleSend}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon icon={MailSend02Icon} data-icon="inline-start" />
            )}
            {pending ? "Enviando…" : "Generar y enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
