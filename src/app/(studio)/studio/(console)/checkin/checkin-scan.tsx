'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/*
 * The door's camera: reads a ticket QR (the signed entrance token) and
 * hands it to the server for the verdict. No detector or no camera —
 * the manual field below the video does the same work.
 */
interface CheckinScanProps {
  startingLabel: string;
  unavailableLabel: string;
}

interface DetectedCode {
  rawValue: string;
}

interface Detector {
  detect: (source: CanvasImageSource) => Promise<DetectedCode[]>;
}

const CheckinScan = ({ startingLabel, unavailableLabel }: CheckinScanProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();
  const [state, setState] = useState<'starting' | 'live' | 'unavailable'>(
    'starting',
  );
  const lastRef = useRef<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      const DetectorClass = (
        window as unknown as {
          BarcodeDetector?: new (options: { formats: string[] }) => Detector;
        }
      ).BarcodeDetector;
      if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
        setState('unavailable');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        setState('unavailable');
        return;
      }
      if (stopped || !videoRef.current) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
      setState('live');
      const detector = new DetectorClass({ formats: ['qr_code'] });
      timer = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          const token = codes[0]?.rawValue ?? '';
          if (token && token !== lastRef.current) {
            lastRef.current = token;
            router.push(`/studio/checkin?token=${encodeURIComponent(token)}`);
          }
        } catch {
          /* a frame failed to decode — the next one will try again */
        }
      }, 400);
    };

    void start();
    return () => {
      stopped = true;
      if (timer) {
        clearInterval(timer);
      }
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [router]);

  if (state === 'unavailable') {
    return (
      <p className="rounded-xl border border-[var(--c-line)] bg-[var(--c-panel)] p-4 text-sm text-[var(--c-text-soft)]">
        {unavailableLabel}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--c-line)] bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="aspect-video w-full object-cover"
      />
      {state === 'starting' ? (
        <p className="p-3 text-center text-xs text-white/60">
          {startingLabel}
        </p>
      ) : null}
    </div>
  );
};

export default CheckinScan;
