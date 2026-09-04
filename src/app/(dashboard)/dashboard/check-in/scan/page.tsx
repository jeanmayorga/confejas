import type { Metadata } from "next";
import Link from "next/link";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { requireCheckInAccess } from "@/modules/auth/server/session";
import { QrCameraScanner } from "@/modules/participants/components/qr-camera-scanner.client";

export const metadata: Metadata = {
  title: "Escanear QR | Confejas",
};

export default async function ScanCheckInPage() {
  await requireCheckInAccess();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Recepción</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Escanear por código QR
          </h1>
          <p className="mt-1 text-muted-foreground">
            Escanea el QR de la credencial del participante.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/dashboard/check-in" />}
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} data-icon="inline-start" />
          Cambiar método
        </Button>
      </div>

      <QrCameraScanner />
    </div>
  );
}
