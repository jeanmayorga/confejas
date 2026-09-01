import type { Metadata } from "next";
import Link from "next/link";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import KeyboardIcon from "@hugeicons/core-free-icons/KeyboardIcon";
import QrCodeScanIcon from "@hugeicons/core-free-icons/QrCodeScanIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCheckInAccess } from "@/modules/auth/server/session";

export const metadata: Metadata = {
  title: "Check-in | Confejas",
};

const checkInOptions = [
  {
    title: "Escanear por código QR",
    description:
      "Abre la cámara y lee el QR que contiene la cédula del participante.",
    href: "/dashboard/check-in/scan",
    icon: QrCodeScanIcon,
  },
  {
    title: "Escribir código",
    description:
      "Ingresa manualmente la cédula cuando no sea posible escanear el QR.",
    href: "/dashboard/check-in/code",
    icon: KeyboardIcon,
  },
] as const;

export default async function CheckInPage() {
  await requireCheckInAccess();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-primary">Recepción</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Check-in de participantes
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Elige cómo identificar al participante. Antes de confirmar la llegada
          podrás revisar su perfil y asignación.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {checkInOptions.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="group rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <HugeiconsIcon icon={option.icon} strokeWidth={2} />
                </div>
                <CardTitle className="text-lg">{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
                <CardAction>
                  <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} />
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-primary">
                  Seleccionar método
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
