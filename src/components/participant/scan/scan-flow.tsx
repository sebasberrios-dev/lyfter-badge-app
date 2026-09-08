"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCameraScanner } from "@/components/participant/scan/qr-camera-scanner";
import { ManualTokenForm } from "@/components/participant/scan/manual-token-form";
import { ScanToast, type ScanOutcome } from "@/components/participant/scan/scan-toast";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  TOKEN_INVALID: "Código QR inválido.",
  TOKEN_EXPIRED: "Este código QR expiró, pedí uno nuevo.",
  BADGE_EVENT_MISMATCH: "Este código no corresponde a este evento.",
  EVENT_NOT_STARTED: "El evento todavía no comenzó.",
  EVENT_ALREADY_ENDED: "El evento ya finalizó.",
  NOT_REGISTERED: "Escaneá primero el QR de bienvenida del evento para registrarte.",
  NOT_FOUND: "No se encontró el badge o el evento.",
};
const DEFAULT_ERROR_MESSAGE = "Ocurrió un error, intentá de nuevo.";

type Mode = "camera" | "manual" | "loading";

function captureGeolocation(): Promise<{ lat: number; lon: number } | undefined> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(undefined);
      return;
    }

    const timeoutId = setTimeout(() => resolve(undefined), 3500);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      () => {
        clearTimeout(timeoutId);
        resolve(undefined);
      },
      { timeout: 3000, maximumAge: 60_000 },
    );
  });
}

export function ScanFlow() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("camera");
  const [result, setResult] = useState<ScanOutcome | null>(null);
  const originModeRef = useRef<"camera" | "manual">("camera");

  async function redeem(token: string) {
    originModeRef.current = mode === "manual" ? "manual" : "camera";
    setMode("loading");

    const geoCoords = await captureGeolocation();

    let res: Response;
    try {
      res = await fetch("/api/qr/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...(geoCoords && { geoCoords }) }),
      });
    } catch {
      setResult({ status: "error", message: "No se pudo conectar. Revisá tu conexión e intentá de nuevo." });
      setMode(originModeRef.current);
      return;
    }

    const body = await res.json();

    if (res.ok) {
      setResult(
        body.alreadyRedeemed
          ? { status: "already-redeemed", data: body }
          : { status: "success", data: body },
      );
      setMode(originModeRef.current);
      return;
    }

    if (body.code === "UNAUTHENTICATED") {
      router.push("/login");
      return;
    }

    setResult({
      status: "error",
      message: body.code ? ERROR_MESSAGES[body.code] ?? DEFAULT_ERROR_MESSAGE : DEFAULT_ERROR_MESSAGE,
    });
    setMode(originModeRef.current);
  }

  return (
    <div className="space-y-4">
      {mode === "loading" ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Verificando...</p>
      ) : mode === "manual" ? (
        <div className="space-y-4">
          <ManualTokenForm onSubmit={redeem} disabled={!!result} />
          <Button variant="link" className="w-full" onClick={() => setMode("camera")}>
            Volver a la cámara
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-16">
          <QrCameraScanner
            active={mode === "camera" && !result}
            onDecode={redeem}
            onError={() => setMode("manual")}
          />
          <Button
            variant="ghost"
            className="mx-auto flex w-fit items-center justify-center rounded-full bg-primary/15 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/25"
            onClick={() => setMode("manual")}
          >
            Ingresar código manualmente
          </Button>
        </div>
      )}

      {result && <ScanToast result={result} onDismiss={() => setResult(null)} />}
    </div>
  );
}
