export const EVENT_CAPABILITIES = [
  'registration',
  'payments',
  'networking',
  'certificates',
  'checkIn',
  'notifications',
  'waitlist',
  'liveUpdates',
  'surveys',
  'resources',
  'streaming',
] as const;

export type EventCapability = (typeof EVENT_CAPABILITIES)[number];

/*
 * Capability dependencies are declarative: a capability that builds on
 * another names it here, and resolution reports violations instead of
 * silently enabling broken combinations.
 */
const CAPABILITY_REQUIRES: Partial<
  Record<EventCapability, readonly EventCapability[]>
> = {
  payments: ['registration'],
  certificates: ['registration'],
  checkIn: ['registration'],
  waitlist: ['registration'],
};

export interface CapabilityResolution {
  enabled: EventCapability[];
  invalid: { capability: EventCapability; missing: EventCapability[] }[];
}

export const resolveCapabilities = (
  declared: readonly EventCapability[],
): CapabilityResolution => {
  const unique = Array.from(new Set(declared));
  const enabled: EventCapability[] = [];
  const invalid: CapabilityResolution['invalid'] = [];

  for (const capability of unique) {
    const requires = CAPABILITY_REQUIRES[capability] ?? [];
    const missing = requires.filter((required) => !unique.includes(required));
    if (missing.length > 0) {
      invalid.push({ capability, missing });
    } else {
      enabled.push(capability);
    }
  }

  return { enabled, invalid };
};

export const hasCapability = (
  enabled: readonly EventCapability[],
  capability: EventCapability,
): boolean => enabled.includes(capability);
