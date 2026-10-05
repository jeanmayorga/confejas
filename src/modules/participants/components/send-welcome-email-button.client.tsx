"use client";

import MailSend02Icon from "@hugeicons/core-free-icons/MailSend02Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { sendParticipantWelcomeEmailAction } from "@/modules/participants/server/welcome-actions";

type SendWelcomeEmailButtonProps = {
  participantId: string;
  email: string | null;
  onSent?: () => void;
  size?: "default" | "sm";
};

export function SendWelcomeEmailButton({
  participantId,
  email,
  onSent,
  size = "sm",
}: SendWelcomeEmailButtonProps) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasValidEmail = Boolean(
    email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
  );

  useEffect(() => {
    if (!sent) return;

    const timeoutId = window.setTimeout(() => setSent(false), 3_000);
    return () => window.clearTimeout(timeoutId);
  }, [sent]);

  function handleSend() {
    startTransition(async () => {
      try {
        const result = await sendParticipantWelcomeEmailAction(participantId);

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        setSent(true);
        onSent?.();
        router.refresh();
      } catch {
        toast.error("No se pudo enviar la invitación. Inténtalo nuevamente.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={!hasValidEmail || pending || sent}
      title={hasValidEmail ? `Enviar PDF a ${email}` : "Agrega un correo válido al perfil para enviar el PDF"}
      onClick={handleSend}
    >
      {sent ? (
        <HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" />
      ) : pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <HugeiconsIcon icon={MailSend02Icon} data-icon="inline-start" />
      )}
      {sent
        ? "Enviado"
        : pending
          ? "Enviando…"
          : hasValidEmail
            ? "Enviar PDF por correo"
            : "Sin correo válido"}
    </Button>
  );
}
