"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Camera01Icon from "@hugeicons/core-free-icons/Camera01Icon";
import CameraOff01Icon from "@hugeicons/core-free-icons/CameraOff01Icon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import FlashlightIcon from "@hugeicons/core-free-icons/FlashlightIcon";
import FlashlightOffIcon from "@hugeicons/core-free-icons/FlashlightOffIcon";
import QrCodeScanIcon from "@hugeicons/core-free-icons/QrCodeScanIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IScannerControls } from "@zxing/browser";

import { completeParticipantQrCheckInAction } from "@/app/(dashboard)/dashboard/check-in/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  findParticipantForQrCheckInAction,
  type QrCheckInParticipant,
} from "@/modules/participants/server/actions";

type ScannerStatus = "idle" | "starting" | "scanning" | "searching";

type CameraTrackConstraints = MediaTrackConstraints & {
  focusMode?: ConstrainDOMString;
};

const RETRY_DELAY_MS = 1_500;

function safelyStopScanner(controls: IScannerControls | null) {
  if (!controls) {
    return;
  }

  void Promise.resolve(controls.stop()).catch(() => undefined);
}

function hasLiveVideoStream(videoElement: HTMLVideoElement | null) {
  const stream = videoElement?.srcObject;

  return (
    stream instanceof MediaStream &&
    stream.getVideoTracks().some((track) => track.readyState === "live")
  );
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "No se pudo acceder a la cámara. Revisa el permiso del navegador e inténtalo otra vez.";
    }

    if (error.name === "NotFoundError") {
      return "No encontramos una cámara disponible en este dispositivo.";
    }

    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return "Otra aplicación está usando la cámara. Ciérrala e inténtalo otra vez.";
    }
  }

  return "No pudimos iniciar la cámara. Puedes cerrarla e intentarlo nuevamente.";
}

function getLodgingDetails(roomName: string | null) {
  if (!roomName) {
    return {
      hasAssignedBed: false,
      buildingName: "Sin asignar",
      roomLabel: "Sin asignar",
    };
  }

  const [buildingName, ...roomParts] = roomName
    .split(/·/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    hasAssignedBed: true,
    buildingName: buildingName || "No especificado",
    roomLabel: roomParts.join(" · ") || roomName,
  };
}

function launchConfetti() {
  void import("canvas-confetti")
    .then(({ default: confetti }) =>
      confetti({
        particleCount: 110,
        spread: 78,
        startVelocity: 34,
        ticks: 160,
        origin: { x: 0.5, y: 0.68 },
        disableForReducedMotion: true,
      }),
    )
    .catch(() => undefined);
}

export function QrCameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const hasScannedRef = useRef(false);
  const lastQrValueRef = useRef<string | null>(null);
  const waitingForQrRemovalRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [message, setMessage] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scannerRun, setScannerRun] = useState(0);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchPending, setTorchPending] = useState(false);
  const [participant, setParticipant] =
    useState<QrCheckInParticipant | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null,
  );
  const [isLookingUp, startLookupTransition] = useTransition();
  const [isConfirming, startCheckInTransition] = useTransition();

  const activateScanner = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }

    hasScannedRef.current = false;
    setParticipant(null);
    setCelebrating(false);
    setConfirmationError(null);
    setMessage(null);

    waitingForQrRemovalRef.current = lastQrValueRef.current !== null;

    if (controlsRef.current && hasLiveVideoStream(videoRef.current)) {
      void videoRef.current?.play().catch(() => undefined);
      setStatus("scanning");
      return;
    }

    safelyStopScanner(controlsRef.current);
    controlsRef.current = null;
    setTorchAvailable(false);
    setTorchEnabled(false);
    setStatus("starting");
    setCameraEnabled(true);
    setScannerRun((currentRun) => currentRun + 1);
  }, []);

  const resumeScannerAfterMessage = useCallback(
    (nextMessage: string) => {
      setStatus("idle");
      setMessage(`${nextMessage} Volviendo a escanear…`);

      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }

      retryTimerRef.current = window.setTimeout(
        activateScanner,
        RETRY_DELAY_MS,
      );
    },
    [activateScanner],
  );

  const handleQrValue = useCallback(
    (rawValue: string) => {
      if (hasScannedRef.current) {
        return;
      }

      hasScannedRef.current = true;

      const controls = controlsRef.current;
      if (controls?.switchTorch) {
        void controls.switchTorch(false).catch(() => undefined);
      }
      setTorchEnabled(false);

      if (!navigator.onLine) {
        setStatus("idle");
        setMessage(
          "No hay conexión a internet. Conéctate para buscar al participante.",
        );
        return;
      }

      setStatus("searching");
      setMessage("Código leído. Buscando participante…");

      startLookupTransition(async () => {
        try {
          const result = await findParticipantForQrCheckInAction(rawValue);

          if (!result.success) {
            resumeScannerAfterMessage(result.message);
            return;
          }

          navigator.vibrate?.(80);
          setStatus("idle");
          setMessage(null);
          setParticipant(result.participant);
        } catch {
          resumeScannerAfterMessage(
            "No pudimos buscar al participante. Inténtalo nuevamente.",
          );
        }
      });
    },
    [resumeScannerAfterMessage],
  );

  useEffect(() => {
    if (!cameraEnabled) {
      return;
    }

    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    let active = true;
    let localControls: IScannerControls | null = null;
    hasScannedRef.current = false;

    async function startScanner(element: HTMLVideoElement) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraEnabled(false);
        setStatus("idle");
        setMessage(
          "La cámara no está disponible aquí. Abre la app desde una conexión segura.",
        );
        return;
      }

      try {
        const [{ BrowserQRCodeReader }, { DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);

        if (!active) {
          return;
        }

        const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
        const reader = new BrowserQRCodeReader(hints, {
          delayBetweenScanAttempts: 120,
          delayBetweenScanSuccess: 800,
        });
        const videoConstraints: CameraTrackConstraints = {
          facingMode: { ideal: "environment" },
          width: { ideal: 1_280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
          focusMode: { ideal: "continuous" },
        };
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: videoConstraints },
          element,
          (result) => {
            if (!result) {
              if (waitingForQrRemovalRef.current) {
                waitingForQrRemovalRef.current = false;
                lastQrValueRef.current = null;
              }
              return;
            }

            const qrValue = result.getText();

            if (
              waitingForQrRemovalRef.current &&
              qrValue === lastQrValueRef.current
            ) {
              return;
            }

            waitingForQrRemovalRef.current = false;

            if (!hasScannedRef.current) {
              lastQrValueRef.current = qrValue;
              handleQrValue(qrValue);
            }
          },
        );
        localControls = controls;

        if (!active) {
          safelyStopScanner(controls);
          return;
        }

        controlsRef.current = controls;
        setTorchAvailable(Boolean(controls.switchTorch));

        if (!hasScannedRef.current) {
          setStatus("scanning");
        }
      } catch (error) {
        if (!active) {
          return;
        }

        safelyStopScanner(localControls);
        controlsRef.current = null;
        setCameraEnabled(false);
        setStatus("idle");
        setMessage(getCameraErrorMessage(error));
      }
    }

    void startScanner(videoElement);

    return () => {
      active = false;

      if (controlsRef.current === localControls) {
        controlsRef.current = null;
      }

      safelyStopScanner(localControls);
    };
  }, [cameraEnabled, handleQrValue, scannerRun]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }

      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }

      safelyStopScanner(controlsRef.current);
      controlsRef.current = null;
    };
  }, []);

  function stopScanner() {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    safelyStopScanner(controlsRef.current);
    controlsRef.current = null;
    hasScannedRef.current = false;
    lastQrValueRef.current = null;
    waitingForQrRemovalRef.current = false;
    setCameraEnabled(false);
    setTorchAvailable(false);
    setTorchEnabled(false);
    setStatus("idle");
    setMessage(null);
  }

  async function toggleTorch() {
    const controls = controlsRef.current;

    if (!controls?.switchTorch || torchPending) {
      return;
    }

    const nextValue = !torchEnabled;
    setTorchPending(true);

    try {
      await controls.switchTorch(nextValue);
      setTorchEnabled(nextValue);
    } catch {
      setTorchAvailable(false);
      setTorchEnabled(false);
      setMessage("La linterna no está disponible en esta cámara.");
    } finally {
      setTorchPending(false);
    }
  }

  function cancelParticipantConfirmation() {
    if (isConfirming || celebrating) {
      return;
    }

    activateScanner();
  }

  function celebrateArrival() {
    setCelebrating(true);
    navigator.vibrate?.([80, 40, 120]);
    launchConfetti();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    successTimerRef.current = window.setTimeout(
      activateScanner,
      prefersReducedMotion ? 500 : 1_250,
    );
  }

  function confirmParticipantArrival() {
    if (!participant || isConfirming || celebrating) {
      return;
    }

    if (participant.checkedInAt) {
      celebrateArrival();
      return;
    }

    setConfirmationError(null);

    startCheckInTransition(async () => {
      try {
        const result = await completeParticipantQrCheckInAction(participant.id);

        if (!result.success) {
          setConfirmationError(result.message);
          return;
        }

        setParticipant((currentParticipant) =>
          currentParticipant
            ? { ...currentParticipant, checkedInAt: result.checkedInAt }
            : null,
        );
        celebrateArrival();
      } catch {
        setConfirmationError(
          "No pudimos confirmar la llegada. Inténtalo nuevamente.",
        );
      }
    });
  }

  const cameraActive = status === "starting" || status === "scanning";
  const lodging = getLodgingDetails(participant?.roomName ?? null);
  const participantAlreadyCheckedIn = Boolean(participant?.checkedInAt);

  return (
    <>
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Escanear código QR</CardTitle>
          <CardDescription>
            Apunta al QR de la credencial. Puede estar impreso o en otra
            pantalla.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div
            className={cn(
              "relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-2xl bg-foreground sm:aspect-4/3",
              !cameraActive && "hidden",
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
              className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-primary-foreground/90 shadow-[0_0_0_999px_rgb(0_0_0/0.35)]"
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

          {!cameraActive ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/30 p-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {status === "searching" || isLookingUp ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon icon={QrCodeScanIcon} strokeWidth={2} />
                )}
              </div>
              <div className="flex max-w-sm flex-col gap-1">
                <p className="font-medium">
                  {status === "searching" || isLookingUp
                    ? "Buscando participante"
                    : "Cámara lista"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {status === "searching" || isLookingUp
                    ? "Estamos verificando el código que acabas de leer."
                    : "La cámara se abrirá automáticamente para el siguiente QR."}
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
                  ? "Acerca el QR hasta que llene el recuadro."
                  : status === "starting"
                    ? "Preparando la cámara trasera…"
                    : "Necesitarás permitir el acceso a la cámara."}
              </p>
            )}
          </div>

          {status === "searching" || isLookingUp ? (
            <Button type="button" size="xl" disabled>
              <Spinner data-icon="inline-start" />
              Buscando participante…
            </Button>
          ) : cameraActive ? (
            <div
              className={cn(
                "grid gap-2",
                torchAvailable && "grid-cols-2",
              )}
            >
              {torchAvailable ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  onClick={toggleTorch}
                  disabled={torchPending}
                >
                  <HugeiconsIcon
                    icon={torchEnabled ? FlashlightOffIcon : FlashlightIcon}
                    data-icon="inline-start"
                  />
                  {torchEnabled ? "Apagar luz" : "Encender luz"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="xl"
                onClick={stopScanner}
              >
                <HugeiconsIcon
                  icon={CameraOff01Icon}
                  data-icon="inline-start"
                />
                Cerrar cámara
              </Button>
            </div>
          ) : (
            <Button type="button" size="xl" onClick={activateScanner}>
              <HugeiconsIcon icon={Camera01Icon} data-icon="inline-start" />
              Abrir cámara
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(participant)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            cancelParticipantConfirmation();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          {celebrating ? (
            <DialogHeader className="items-center py-6 text-center">
              <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
              </div>
              <DialogTitle className="text-xl">¡Llegada confirmada!</DialogTitle>
              <DialogDescription>
                La cámara queda lista para escanear al siguiente participante.
              </DialogDescription>
            </DialogHeader>
          ) : participant ? (
            <>
              <DialogHeader>
                <div className="mb-1 flex items-center gap-2">
                  <Badge
                    variant={
                      participantAlreadyCheckedIn ? "default" : "secondary"
                    }
                  >
                    {participantAlreadyCheckedIn
                      ? "Llegada registrada"
                      : "Por confirmar"}
                  </Badge>
                </div>
                <DialogTitle className="text-xl leading-tight">
                  {participant.firstNames} {participant.lastNames}
                </DialogTitle>
                <DialogDescription>
                  {participantAlreadyCheckedIn
                    ? "Este participante ya hizo check-in."
                    : "Confirma que esta es la persona que acaba de llegar."}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-2xl bg-muted/40 p-4">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Compañía
                  </dt>
                  <dd className="font-medium">
                    {participant.companyName ?? "Sin asignar"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl bg-muted/40 p-4">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Cama asignada
                  </dt>
                  <dd>
                    <Badge
                      variant={
                        lodging.hasAssignedBed ? "default" : "secondary"
                      }
                    >
                      {lodging.hasAssignedBed ? "Asignada" : "Sin asignar"}
                    </Badge>
                  </dd>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl bg-muted/40 p-4">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Edificio
                  </dt>
                  <dd className="font-medium">{lodging.buildingName}</dd>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl bg-muted/40 p-4">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Habitación
                  </dt>
                  <dd className="font-medium">{lodging.roomLabel}</dd>
                </div>
              </dl>

              {confirmationError ? (
                <p className="text-sm text-destructive" role="alert">
                  {confirmationError}
                </p>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  onClick={cancelParticipantConfirmation}
                  disabled={isConfirming}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="xl"
                  onClick={confirmParticipantArrival}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      data-icon="inline-start"
                    />
                  )}
                  {isConfirming ? "Confirmando…" : "Llego"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
