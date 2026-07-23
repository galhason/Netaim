'use client';

import QRCode from 'react-qr-code';

/*
 * The badge's QR and share control — client-only because the QR draws
 * on the client and sharing uses the device's own share sheet.
 */
interface BadgeQrProps {
  value: string;
  shareLabel: string;
  copiedLabel: string;
}

const BadgeQr = ({ value, shareLabel, copiedLabel }: BadgeQrProps) => {
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: value });
        return;
      }
      await navigator.clipboard.writeText(value);
      window.alert(copiedLabel);
    } catch {
      /* the guest closed the share sheet — nothing to do */
    }
  };

  return (
    <>
      <span className="mx-auto block w-fit rounded-2xl bg-white p-3">
        <QRCode value={value} size={184} />
      </span>
      <button
        type="button"
        onClick={share}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-medium text-white transition-colors hover:border-white/60"
      >
        {shareLabel}
      </button>
    </>
  );
};

export default BadgeQr;
