"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

type QrCameraScannerProps = {
  active: boolean;
  onDecode: (token: string) => void;
  onError?: (message: string) => void;
};

export function QrCameraScanner({ active, onDecode, onError }: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !videoRef.current) return;

    let controls: { stop: () => void } | undefined;
    let cancelled = false;

    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _error, ctrls) => {
        if (cancelled) return;
        if (result) {
          controls = ctrls;
          ctrls.stop();
          onDecode(result.getText());
        }
      })
      .then((ctrls) => {
        if (cancelled) {
          ctrls.stop();
          return;
        }
        controls = ctrls;
      })
      .catch(() => {
        if (cancelled) return;
        const message =
          "No se pudo acceder a la cámara. Podés ingresar el código manualmente.";
        setCameraError(message);
        onError?.(message);
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active, onDecode, onError]);

  if (cameraError) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {cameraError}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} muted playsInline autoPlay className="w-full" />
    </div>
  );
}
