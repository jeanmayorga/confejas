"use client";

import { useState } from "react";
import Logout01Icon from "@hugeicons/core-free-icons/Logout01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/modules/auth/client/auth-client";

export function CounselorSignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);

    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isPending}
      onClick={signOut}
    >
      {isPending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <HugeiconsIcon
          icon={Logout01Icon}
          strokeWidth={2}
          data-icon="inline-start"
          aria-hidden
        />
      )}
      {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
