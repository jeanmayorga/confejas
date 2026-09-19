"use client";

import { useEffect, useState, useTransition } from "react";
import MailSend02Icon from "@hugeicons/core-free-icons/MailSend02Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { sendCounselorCredentialsAction } from "@/modules/counselors/server/actions";

type SendCounselorCredentialsButtonProps = {
  counselor: { id: string; name: string; email: string | null };
};

export function SendCounselorCredentialsButton({
  counselor,
}: SendCounselorCredentialsButtonProps) {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!sent) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSent(false), 3_000);

    return () => window.clearTimeout(timeoutId);
  }, [sent]);

  function handleSend() {
    startTransition(async () => {
      const result = await sendCounselorCredentialsAction(counselor.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSent(true);
    });
  }

  const hasEmail = Boolean(counselor.email);

  return (
    <Button
      type="button"
      variant={sent ? "default" : "outline"}
      size="xs"
      className={sent ? "bg-green-600 text-white hover:bg-green-600" : undefined}
      disabled={!hasEmail || pending || sent}
      aria-label={
        sent
          ? `Credenciales enviadas a ${counselor.name}`
          : hasEmail
            ? `Enviar credenciales a ${counselor.name}`
            : `No hay email para ${counselor.name}`
      }
      onClick={handleSend}
    >
      {sent ? (
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} data-icon="inline-start" />
      ) : pending ? (
        <Spinner className="size-3" data-icon="inline-start" />
      ) : (
        <HugeiconsIcon
          icon={MailSend02Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
      )}
      {sent ? "Enviado" : pending ? "Enviando…" : "Enviar"}
    </Button>
  );
}
