'use client';

import QRCode from 'react-qr-code';

/*
 * The ticket card's inline QR — client-only because the library draws
 * on the client, small because the full-screen pass does the real work.
 */
const TICKET_QR_SIZE = 108;

const MyPassQr = ({ value }: { value: string }) => (
  <QRCode value={value} size={TICKET_QR_SIZE} />
);

export default MyPassQr;
