'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * The scanner (Conference QR Connect, mobile-first): camera opens
 * immediately, detects the badge QR and follows its connect link.
 * Where the browser has no detector or no camera, the manual path
 * takes over — QR is the preferred path, never the only one.
 */
interface ScanClientProps {
  locale: string;
  labels: {
    starting: string;
    unavailable: string;
    manualLabel: string;
    manualGo: string;
    hint: string;
  };
}

interface DetectedCode {
  rawValue: string;
}

interface Detector {
  detect: (source: CanvasImageSource) => Promise<DetectedCode[]>;
}

const ScanClient = ({ locale, labels }: ScanClientProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<'starting' | 'live' | 'unavailable'>(
    'starting',
  );
  const [manual, setManual] = useState('');

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
          const link = codes
            .map((entry) => entry.rawValue)
            .find((value) => value.includes('/connect/'));
          if (link) {
            if (timer) {
              clearInterval(timer);
            }
            window.location.assign(link);
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
  }, []);

  const goManual = () => {
    const value = manual.trim();
    if (!value) {
      return;
    }
    if (value.includes('/connect/')) {
      window.location.assign(value);
      return;
    }
    window.location.assign(
      `/${locale}/connect/${encodeURIComponent(value.replace(/^#/, ''))}`,
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {state !== 'unavailable' ? (
        <div className="overflow-hidden rounded-3xl bg-black shadow-[0_18px_60px_rgba(20,30,45,0.4)]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-square w-full object-cover"
          />
          {state === 'starting' ? (
            <p className="p-4 text-center text-sm text-white/70">
              {labels.starting}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-center text-sm text-[var(--l-soft)] shadow-[0_10px_30px_rgba(35,40,47,0.08)]">
          {labels.unavailable}
        </p>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(35,40,47,0.08)]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-widest text-[var(--l-soft)]">
            {labels.manualLabel}
          </span>
          <span className="flex gap-2">
            <input
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              className="min-h-11 flex-1 rounded-xl border border-[var(--l-hair)] px-3 text-sm"
            />
            <button
              type="button"
              onClick={goManual}
              className="min-h-11 rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white"
            >
              {labels.manualGo}
            </button>
          </span>
        </label>
      </div>

      <p className="text-center text-xs leading-relaxed text-[var(--l-faint)]">
        {labels.hint}
      </p>
    </div>
  );
};

export default ScanClient;
