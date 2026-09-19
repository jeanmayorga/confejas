"use client";

import QrCode01Icon from "@hugeicons/core-free-icons/QrCode01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((module) => module.QRCodeSVG),
  {
    ssr: false,
    loading: () => <Skeleton className="size-64 rounded-xl" />,
  },
);

type ParticipantQrDialogProps = {
  participantCode: number | null;
  participantName: string;
};

export function ParticipantQrDialog({
  participantCode,
  participantName,
}: ParticipantQrDialogProps) {
  const qrValue = participantCode?.toString() ?? "";

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!participantCode}
          />
        }
      >
        <HugeiconsIcon icon={QrCode01Icon} data-icon="inline-start" />
        Ver código QR
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle>Código QR del participante</DialogTitle>
          <DialogDescription>{participantName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted p-5">
          <div className="rounded-2xl bg-white p-3">
            <QRCodeSVG
              value={qrValue}
              size={256}
              level="H"
              marginSize={1}
              role="img"
              title={`Código QR de ${participantName}`}
            />
          </div>
          <Badge variant="secondary" className="bg-background text-base">
            # {participantCode}
          </Badge>
          <p className="text-center text-xs text-muted-foreground">
            Escanea este código durante el check-in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
