"use client";

import { useTransition } from "react";
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import FileAddIcon from "@hugeicons/core-free-icons/FileAddIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { createCompanyAction } from "@/modules/companies/server/actions";

type CreateCompanyButtonProps = {
  disabled?: boolean;
  className?: string;
  onCreated?: (companyId: string) => void;
  appearance?: "button" | "sidebar";
};

export function CreateCompanyButton({
  disabled = false,
  className,
  onCreated,
  appearance = "button",
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
      onCreated?.(result.companyId);
      router.refresh();
    });
  }

  const content = (
    <>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <HugeiconsIcon
          icon={appearance === "sidebar" ? FileAddIcon : Add01Icon}
          strokeWidth={appearance === "sidebar" ? 1.5 : 2}
          data-icon="inline-start"
          aria-hidden="true"
        />
      )}
      <span>{pending ? "Creando…" : "Nueva compañía"}</span>
    </>
  );

  return appearance === "sidebar" ? (
    <SidebarMenuButton
      type="button"
      className={cn(
        "h-9 gap-2 rounded-sidebar-item! bg-sidebar-accent px-3 font-normal",
        className,
      )}
      disabled={disabled || pending}
      onClick={handleCreate}
    >
      {content}
    </SidebarMenuButton>
  ) : (
    <Button
      type="button"
      className={className}
      disabled={disabled || pending}
      onClick={handleCreate}
    >
      {content}
    </Button>
  );
}
