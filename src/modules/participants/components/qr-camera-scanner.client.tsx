"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Camera01Icon from "@hugeicons/core-free-icons/Camera01Icon";
import CameraOff01Icon from "@hugeicons/core-free-icons/CameraOff01Icon";
import QrCodeScanIcon from "@hugeicons/core-free-icons/QrCodeScanIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IScannerControls } from "@zxing/browser";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { normalizeGovernmentId } from "@/modules/participants/identity";
import { findParticipantForCheckInAction } from "@/modules/participants/server/actions";

type ScannerStatus = "idle" | "starting" | "scanning" | "searching";

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "No se pudo acceder a la cámara. Revisa el permiso del navegador e inténtalo otra vez.";
    }

    if (error.name === "NotFoundError") {
      return "No encontramos una cámara disponible en este dispositivo.";
    }
  }

  return "No pudimos iniciar la cámara. Puedes regresar y escribir la cédula.";
}

export function QrCameraScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const hasScannedRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  function lookupQrValue(rawValue: string) {
    if (!navigator.onLine) {
      setMessage(
        "No hay conexión a internet. Conéctate para buscar al participante.",
      );
      return;
    }

    const governmentId = normalizeGovernmentId(rawValue);

    if (!governmentId) {
      setMessage("El QR no contiene una cédula válida.");
      return;
    }

    hasScannedRef.current = true;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("searching");
    setMessage("Cédula leída. Buscando participante…");

    startSearchTransition(async () => {
      const result = await findParticipantForCheckInAction(governmentId);

      if (!result.success) {
        hasScannedRef.current = false;
        setStatus("idle");
        setMessage(result.message);
        return;
      }

      navigator.vibrate?.(100);
      router.replace(
        `/dashboard/check-in/scan?participantId=${result.participantId}`,
        { scroll: false },
      );
    });
  }

  async function startScanner() {
    setMessage(null);
    hasScannedRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(
        "La cámara no está disponible aquí. Abre la app desde una conexión segura o escribe la cédula.",
      );
      return;
    }

    if (!videoRef.current) {
      return;
    }

    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("starting");

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        },
        videoRef.current,
        (result) => {
          if (!result || hasScannedRef.current) {
            return;
          }

          lookupQrValue(result.getText());
        },
      );

      controlsRef.current = controls;

      if (hasScannedRef.current) {
        controls.stop();
        controlsRef.current = null;
      } else {
        setStatus("scanning");
      }
    } catch (error) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      setStatus("idle");
      setMessage(getCameraErrorMessage(error));
    }
  }

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    hasScannedRef.current = false;
    setStatus("idle");
    setMessage(null);
  }

  const cameraActive = status !== "idle";

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Escanear código QR</CardTitle>
        <CardDescription>
          El contenido del QR debe ser únicamente la cédula del participante.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div
          className={cn(
            "relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-2xl bg-foreground",
            status === "idle" && "hidden",
          )}
        >
          <video
            ref={videoRef}
            className="size-full object-cover"
            aria-label="Vista de la cámara para escanear el código QR"
            autoPlay
            muted
            playsInline
          />
          <div
            className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-primary-foreground/90 shadow-[0_0_0_999px_rgb(0_0_0/0.35)]"
            aria-hidden="true"
          />
          {status === "starting" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-primary-foreground">
              <div className="flex items-center gap-2 rounded-full bg-foreground/70 px-4 py-2 text-sm">
                <Spinner />
                Iniciando cámara…
              </div>
            </div>
          ) : null}
        </div>

        {status === "idle" ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/30 p-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <HugeiconsIcon icon={QrCodeScanIcon} strokeWidth={2} />
            </div>
            <div className="flex max-w-sm flex-col gap-1">
              <p className="font-medium">Cámara lista</p>
              <p className="text-sm text-muted-foreground">
                Presiona el botón y apunta al QR del participante.
              </p>
            </div>
          </div>
        ) : null}

        <div aria-live="polite">
          {message ? (
            <p
              className={cn(
                "text-sm",
                status === "searching"
                  ? "text-muted-foreground"
                  : "text-destructive",
              )}
            >
              {message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {status === "scanning"
                ? "Buscando un código QR…"
                : "Necesitarás permitir el acceso a la cámara."}
            </p>
          )}
        </div>

        {status === "searching" ? (
          <Button type="button" size="lg" disabled>
            <Spinner data-icon="inline-start" />
            Buscando participante…
          </Button>
        ) : cameraActive ? (
          <Button type="button" variant="outline" size="lg" onClick={stopScanner}>
            <HugeiconsIcon icon={CameraOff01Icon} data-icon="inline-start" />
            Cerrar cámara
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={startScanner}
            disabled={isSearching}
          >
            <HugeiconsIcon icon={Camera01Icon} data-icon="inline-start" />
            Abrir cámara
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
