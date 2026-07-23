export const REGISTRATION_STATUSES = [
  'pending',
  'confirmed',
  'waitlisted',
  'cancelled',
  'declined',
  'attended',
  'expired',
  'noShow',
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const isRegistrationStatus = (value: string): value is RegistrationStatus =>
  (REGISTRATION_STATUSES as readonly string[]).includes(value);

/*
 * Terminal statuses accept no further transition. `paymentPending` is
 * reserved for the deferred PaymentProvider and deliberately absent here.
 */
export const TERMINAL_STATUSES: readonly RegistrationStatus[] = [
  'declined',
  'cancelled',
  'expired',
  'attended',
  'noShow',
];
