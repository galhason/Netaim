'use client';

import QRCode from 'react-qr-code';

/*
 * The enrollment QR — the authenticator app scans this once and the
 * shared secret never travels anywhere else.
 */
const TotpQr = ({ value }: { value: string }) => (
  <span className="inline-block rounded-2xl bg-white p-3 ring-1 ring-[var(--l-hair)]">
    <QRCode value={value} size={148} />
  </span>
);

export default TotpQr;
