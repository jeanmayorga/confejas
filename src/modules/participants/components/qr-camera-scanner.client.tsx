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
import FlashlightIcon from "@hugeicons/core-free-icons/FlashlightIcon";
import FlashlightOffIcon from "@hugeicons/core-free-icons/FlashlightOffIcon";
import QrCodeScanIcon from "@hugeicons/core-free-icons/QrCodeScanIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
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
import { findParticipantForQrCheckInAction } from "@/modules/participants/server/actions";

type ScannerStatus = "idle" | "starting" | "scanning" | "searching";

type CameraTrackConstraints = MediaTrackConstraints & {
  focusMode?: ConstrainDOMString;
};

const RETRY_DELAY_MS = 1_500;
const SCAN_BEEP_DURATION_SECONDS = 0.14;

function playScanBeep(audioContext: AudioContext) {
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  const startTime = audioContext.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, startTime);
  volume.gain.setValueAtTime(0.0001, startTime);
  volume.gain.exponentialRampToValueAtTime(0.15, startTime + 0.015);
  volume.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + SCAN_BEEP_DURATION_SECONDS,
  );

  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    volume.disconnect();
  };
  oscillator.start(startTime);
  oscillator.stop(startTime + SCAN_BEEP_DURATION_SECONDS);
}

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

type QrCameraScannerProps = {
  initialCameraEnabled?: boolean;
};

export function QrCameraScanner({
  initialCameraEnabled = true,
}: QrCameraScannerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const hasScannedRef = useRef(false);
  const lastQrValueRef = useRef<string | null>(null);
  const waitingForQrRemovalRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>(
    initialCameraEnabled ? "starting" : "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(initialCameraEnabled);
  const [scannerRun, setScannerRun] = useState(0);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchPending, setTorchPending] = useState(false);
  const [isLookingUp, startLookupTransition] = useTransition();

  const getAudioContext = useCallback(() => {
    if (typeof window.AudioContext === "undefined") {
      return null;
    }

    try {
      audioContextRef.current ??= new window.AudioContext();
      return audioContextRef.current;
    } catch {
      return null;
    }
  }, []);

  const unlockAudio = useCallback(() => {
    const audioContext = getAudioContext();

    if (audioContext?.state === "suspended") {
      void audioContext.resume().catch(() => undefined);
    }
  }, [getAudioContext]);

  const playSuccessFeedback = useCallback(() => {
    try {
      navigator.vibrate?.(80);
    } catch {
      // Feedback support varies by browser and must not interrupt check-in.
    }

    const audioContext = getAudioContext();

    if (!audioContext) {
      return;
    }

    const scannedAt = performance.now();
    const playIfReady = () => {
      if (
        audioContext.state === "running" &&
        performance.now() - scannedAt < 400
      ) {
        try {
          playScanBeep(audioContext);
        } catch {
          // The participant lookup still succeeds when sound is unavailable.
        }
      }
    };

    if (audioContext.state === "running") {
      playIfReady();
    } else if (audioContext.state === "suspended") {
      void audioContext.resume().then(playIfReady).catch(() => undefined);
    }
  }, [getAudioContext]);

  useEffect(() => {
    unlockAudio();
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);

      const audioContext = audioContextRef.current;
      audioContextRef.current = null;

      if (audioContext) {
        window.setTimeout(() => {
          void audioContext.close().catch(() => undefined);
        }, 300);
      }
    };
  }, [unlockAudio]);

  const activateScanner = useCallback(() => {
    unlockAudio();
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    hasScannedRef.current = false;
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
  }, [unlockAudio]);

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

          playSuccessFeedback();
          safelyStopScanner(controlsRef.current);
          controlsRef.current = null;
          setCameraEnabled(false);
          setTorchAvailable(false);
          setTorchEnabled(false);
          setStatus("idle");
          setMessage(null);
          router.replace(
            `/dashboard/check-in/scan?participantId=${result.participantId}`,
            { scroll: false },
          );
        } catch {
          resumeScannerAfterMessage(
            "No pudimos buscar al participante. Inténtalo nuevamente.",
          );
        }
      });
    },
    [playSuccessFeedback, resumeScannerAfterMessage, router],
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

  const cameraActive = status === "starting" || status === "scanning";

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
    </>
  );
}
