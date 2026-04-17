import { useState, useEffect, useCallback } from 'react';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      setError(null);
      setIsActive(true);
    } catch (err) {
      setError("Camera access denied. Please enable it in browser settings.");
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      startCamera();
    }
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isActive]);

  return { stream, error, isActive, startCamera, stopCamera };
}
