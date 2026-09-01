import type { Metadata } from "next";
import Link from "next/link";
import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { requireCheckInAccess } from "@/modules/auth/server/session";
import { ParticipantCheckInSheetLoader } from "@/modules/participants/components/participant-check-in-sheet-loader";
import { QrCameraScanner } from "@/modules/participants/components/qr-camera-scanner.client";

export const metadata: Metadata = {
  title: "Escanear QR | Confejas",
};

type ScanCheckInPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    participantId?: string | string[];
    saved?: string | string[];
  }>;
};

export default async function ScanCheckInPage({
  searchParams,
}: ScanCheckInPageProps) {
  await requireCheckInAccess();
  const query = await searchParams;
  const participantId = Array.isArray(query.participantId)
    ? query.participantId[0]
    : query.participantId;
  const savedValue = Array.isArray(query.saved) ? query.saved[0] : query.saved;
  const errorValue = Array.isArray(query.error) ? query.error[0] : query.error;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Recepción</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Escanear por código QR
          </h1>
          <p className="mt-1 text-muted-foreground">
            Escanea el QR que contiene la cédula del participante.
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

      <QrCameraScanner key={participantId ?? "scanner"} />
      <ParticipantCheckInSheetLoader
        assignmentError={errorValue === "assignment"}
        participantId={participantId}
        returnPath="/dashboard/check-in/scan"
        saved={savedValue === "1"}
      />
    </div>
  );
}
