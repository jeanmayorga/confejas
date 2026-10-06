"use client";

import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";

export function CounselorHelpButton() {
  return (
    <Button
      type="button"
      variant="destructive"
      size="lg"
      className="w-full"
      onClick={() => window.alert("Enviando emergencia")}
    >
      <HugeiconsIcon
        icon={AlertCircleIcon}
        strokeWidth={2}
        data-icon="inline-start"
        aria-hidden
      />
      Ayuda
    </Button>
  );
}
