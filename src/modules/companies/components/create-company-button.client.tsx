"use client";

import { useTransition } from "react";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createCompanyAction } from "@/modules/companies/server/actions";

type CreateCompanyButtonProps = {
  disabled?: boolean;
};

export function CreateCompanyButton({
  disabled = false,
}: CreateCompanyButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const result = await createCompanyAction();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Button type="button" disabled={disabled || pending} onClick={handleCreate}>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <HugeiconsIcon
          icon={Add01Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
      )}
      {pending ? "Creando…" : "Nueva compañía"}
    </Button>
  );
}
