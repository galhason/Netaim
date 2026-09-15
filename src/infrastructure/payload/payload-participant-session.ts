import { relationshipId } from '@/auth';
import { BRAND_LATIN } from '@/config/brand';
import { isSupportedLocale } from '@/config/locales';
import type { ParticipantSessionRepository } from '@/features/registration/types/identity';
import type { ParticipantSummary } from '@/features/registration/types/registration';
import { getSystemPayload } from './payload-context';

interface ParticipantRow {
  id: number | string;
  name?: string;
  email?: string;
  organization?: number | string | { id: number | string };
}

interface SessionRow {
  id: number | string;
  participant: number | string | ParticipantRow;
}

const toParticipant = (row: ParticipantRow): ParticipantSummary => ({
  id: String(row.id),
  name: row.name ?? '',
  email: row.email ?? '',
});

const resolveParticipant = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
  value: SessionRow['participant'],
): Promise<ParticipantSummary | null> => {
  if (typeof value === 'object') {
    return toParticipant(value);
  }
  const doc = await payload
    .findByID({
      collection: 'participants',
      id: value,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null);
  return doc ? toParticipant(doc as unknown as ParticipantRow) : null;
};

/*
 * The single-body platform's owning organization, provisioned once on
 * first contact (shared by account opening and magic-link issuing).
 */
const platformOrganizationId = async (
  payload: Awaited<ReturnType<typeof getSystemPayload>>,
): Promise<number> => {
  const organizations = await payload.find({
    collection: 'organizations',
    limit: 1,
    sort: 'createdAt',
    depth: 0,
    overrideAccess: true,
  });
  const organizationRow =
    organizations.docs[0] ??
    (await payload.create({
      collection: 'organizations',
      data: {
        name: process.env.PLATFORM_ORG_NAME ?? BRAND_LATIN,
        /*
         * The slug default is deliberately unchanged by the brand
         * rename. It is a stored key, not a label: an existing database
         * already holds a row under it, and a new default would create
         * a second organization beside the real one rather than rename
         * anything. Renaming the tenant is a data operation.
         */
        slug: process.env.PLATFORM_ORG_SLUG ?? 'hason',
      },
      overrideAccess: true,
    }));
  return Number(organizationRow.id);
};

export const payloadParticipantSessionRepository: ParticipantSessionRepository =
  {
    credentialsByEmail: async (email) => {
      const payload = await getSystemPayload();
      const found = await payload.find({
        collection: 'participants',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const row = found.docs[0] as
        | (ParticipantRow & {
            passwordHash?: string | null;
            blocked?: boolean | null;
            totpEnabledAt?: string | null;
          })
        | undefined;
      if (!row) {
        return null;
      }
      return {
        participantId: String(row.id),
        passwordHash: row.passwordHash ?? null,
        blocked: row.blocked === true,
        totpEnabled: Boolean(row.totpEnabledAt),
      };
    },

    setPasswordHash: async (participantId, passwordHash) => {
      const payload = await getSystemPayload();
      await payload.update({
        collection: 'participants',
        id: participantId,
        data: { passwordHash },
        overrideAccess: true,
      });
    },

    openAccount: async (email, name, passwordHash, preferredLocale) => {
      const payload = await getSystemPayload();
      const organization = await platformOrganizationId(payload);
      const existing = await payload.find({
        collection: 'participants',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (existing.docs[0]) {
        return { ok: false, reason: 'exists' };
      }
      try {
        const doc = await payload.create({
          collection: 'participants',
          data: {
            organization,
            name,
            email,
            passwordHash,
            preferredLocale,
          },
          overrideAccess: true,
        });
        return {
          ok: true,
          participant: toParticipant(doc as unknown as ParticipantRow),
        };
      } catch {
        return { ok: false, reason: 'failed' };
      }
    },

    issue: async (email, eventSlug, tokenHash, expiresAt) => {
      const payload = await getSystemPayload();
      const event = await payload.find({
        collection: 'events',
        where: { slug: { equals: eventSlug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const eventRow = event.docs[0] as
        | { organization: number | string | { id: number | string } }
        | undefined;
      if (!eventRow) {
        return null;
      }
      const organization = Number(relationshipId(eventRow.organization));

      const participants = await payload.find({
        collection: 'participants',
        where: {
          and: [
            { organization: { equals: organization } },
            { email: { equals: email } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const participant = participants.docs[0] as ParticipantRow | undefined;
      if (!participant) {
        return null;
      }

      await payload.create({
        collection: 'participant-sessions',
        data: {
          organization,
          participant: Number(participant.id),
          tokenHash,
          purpose: 'sign-in',
          expiresAt,
        },
        overrideAccess: true,
      });

      return { participant: toParticipant(participant) };
    },

    issueForPlatform: async (email, name, tokenHash, expiresAt) => {
      const payload = await getSystemPayload();
      const organizations = await payload.find({
        collection: 'organizations',
        limit: 1,
        sort: 'createdAt',
        depth: 0,
        overrideAccess: true,
      });
      /*
       * A single-body platform must be able to receive its first guest:
       * when no owning organization exists yet, provision it once here.
       */
      const organizationRow =
        organizations.docs[0] ??
        (await payload.create({
          collection: 'organizations',
          data: {
            name: process.env.PLATFORM_ORG_NAME ?? BRAND_LATIN,
            slug: process.env.PLATFORM_ORG_SLUG ?? 'hason',
          },
          overrideAccess: true,
        }));
      const organization = Number(organizationRow.id);

      const existing = await payload.find({
        collection: 'participants',
        where: {
          and: [
            { organization: { equals: organization } },
            { email: { equals: email } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      let participant = existing.docs[0] as ParticipantRow | undefined;
      let created = false;

      if (!participant) {
        if (!name) {
          return null;
        }
        const doc = await payload.create({
          collection: 'participants',
          data: { organization, name, email },
          overrideAccess: true,
        });
        participant = doc as unknown as ParticipantRow;
        created = true;
      }

      await payload.create({
        collection: 'participant-sessions',
        data: {
          organization,
          participant: Number(participant.id),
          tokenHash,
          purpose: 'sign-in',
          expiresAt,
        },
        overrideAccess: true,
      });

      return { participant: toParticipant(participant), created };
    },

    consume: async (tokenHash, now) => {
      const payload = await getSystemPayload();
      const sessions = await payload.find({
        collection: 'participant-sessions',
        where: {
          and: [
            { tokenHash: { equals: tokenHash } },
            { usedAt: { exists: false } },
            { expiresAt: { greater_than: now } },
          ],
        },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      });
      const session = sessions.docs[0] as SessionRow | undefined;
      if (!session) {
        return null;
      }
      await payload.update({
        collection: 'participant-sessions',
        id: session.id,
        data: { usedAt: now },
        overrideAccess: true,
      });
      const participant = await resolveParticipant(payload, session.participant);
      return participant ? { participant } : null;
    },

    openSession: async (participantId, tokenHash, expiresAt) => {
      const payload = await getSystemPayload();
      const account = await payload
        .findByID({
          collection: 'participants',
          id: participantId,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null);
      const organization = relationshipId(
        (account as ParticipantRow | null)?.organization,
      );
      if (!organization) {
        return;
      }
      await payload.create({
        collection: 'account-sessions',
        data: {
          organization: Number(organization),
          participant: Number(participantId),
          tokenHash,
          expiresAt,
        },
        overrideAccess: true,
      });
    },

    resolveSession: async (tokenHash, now) => {
      const payload = await getSystemPayload();
      const found = await payload
        .find({
          collection: 'account-sessions',
          where: {
            and: [
              { tokenHash: { equals: tokenHash } },
              { revokedAt: { exists: false } },
              { expiresAt: { greater_than: now } },
            ],
          },
          limit: 1,
          /*
           * `depth: 1` brings the participant back with the session, so
           * verifying the cookie stays a single query.
           */
          depth: 1,
          overrideAccess: true,
        })
        .catch(() => null);
      const session = found?.docs[0] as SessionRow | undefined;
      if (!session) {
        return null;
      }
      return resolveParticipant(payload, session.participant);
    },

    revokeSession: async (tokenHash, at) => {
      const payload = await getSystemPayload();
      await payload
        .update({
          collection: 'account-sessions',
          where: { tokenHash: { equals: tokenHash } },
          data: { revokedAt: at },
          overrideAccess: true,
        })
        .catch(() => undefined);
    },

    revokeAllSessions: async (participantId, at) => {
      const payload = await getSystemPayload();
      await payload
        .update({
          collection: 'account-sessions',
          where: {
            and: [
              { participant: { equals: Number(participantId) } },
              { revokedAt: { exists: false } },
            ],
          },
          data: { revokedAt: at },
          overrideAccess: true,
        })
        .catch(() => undefined);
    },

    participantDetails: async (id) => {
      const payload = await getSystemPayload();
      const doc = await payload
        .findByID({
          collection: 'participants',
          id,
          depth: 1,
          overrideAccess: true,
        })
        .catch(() => null);
      if (!doc) {
        return null;
      }
      const photo = doc.photo;
      const photoUrl =
        typeof photo === 'object' && photo !== null && photo.url
          ? photo.url
          : undefined;
      return {
        email: doc.email ?? '',
        name: doc.name ?? undefined,
        phone: doc.phone ?? undefined,
        dietary: doc.dietary ?? undefined,
        accessibility: doc.accessibilityNeeds ?? undefined,
        organization: doc.orgName ?? undefined,
        role: doc.roleTitle ?? undefined,
        interests: doc.interests ?? undefined,
        headline: doc.headline ?? undefined,
        bio: doc.bio ?? undefined,
        links: (doc.links ?? [])
          .map((link) => ({ label: link.label ?? '', url: link.url ?? '' }))
          .filter((link) => link.url.length > 0),
        photoUrl,
      };
    },

    /*
     * Self-service photo (participant self-service is an approved
     * overrideAccess path — the guest has no CMS actor to carry).
     */
    setParticipantPhoto: async (participantId, file) => {
      const payload = await getSystemPayload();
      const account = await payload
        .findByID({
          collection: 'participants',
          id: participantId,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null);
      if (!account) {
        return false;
      }
      const organization = Number(relationshipId(account.organization));
      try {
        const media = await payload.create({
          collection: 'media',
          data: {
            organization,
            alt: account.name ?? account.email ?? 'profile photo',
          },
          file: {
            name: file.name,
            mimetype: file.type,
            data: Buffer.from(file.data),
            size: file.data.byteLength,
          },
          overrideAccess: true,
        });
        await payload.update({
          collection: 'participants',
          id: participantId,
          data: { photo: Number(media.id) },
          overrideAccess: true,
        });
        return true;
      } catch {
        return false;
      }
    },
    updateParticipantDetails: async (id, input) => {
      const payload = await getSystemPayload();
      await payload.update({
        collection: 'participants',
        id,
        overrideAccess: true,
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.dietary !== undefined ? { dietary: input.dietary } : {}),
          ...(input.accessibility !== undefined
            ? { accessibilityNeeds: input.accessibility }
            : {}),
          ...(input.organization !== undefined
            ? { orgName: input.organization }
            : {}),
          ...(input.role !== undefined ? { roleTitle: input.role } : {}),
          ...(input.interests !== undefined
            ? { interests: input.interests }
            : {}),
          ...(input.headline !== undefined ? { headline: input.headline } : {}),
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.links !== undefined
            ? {
                links: input.links.map((link) => ({
                  label: link.label,
                  url: link.url,
                })),
              }
            : {}),
        },
      });
    },
    /*
     * Site language preference. Read on sign-in to seed the cookie the
     * middleware reads; written from registration and from the profile.
     */
    localePreference: async (id) => {
      const payload = await getSystemPayload();
      const doc = await payload
        .findByID({
          collection: 'participants',
          id,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null);
      const stored = (doc as { preferredLocale?: string | null } | null)
        ?.preferredLocale;
      return stored && isSupportedLocale(stored) ? stored : null;
    },
    setLocalePreference: async (id, locale) => {
      const payload = await getSystemPayload();
      await payload.update({
        collection: 'participants',
        id,
        overrideAccess: true,
        data: { preferredLocale: locale },
      });
    },
    participantById: async (id) => {
      const payload = await getSystemPayload();
      const doc = await payload
        .findByID({
          collection: 'participants',
          id,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null);
      if (!doc || (doc as { blocked?: boolean | null }).blocked === true) {
        return null;
      }
      return toParticipant(doc as unknown as ParticipantRow);
    },
    /*
     * Contact governance (Connection Framework v1.0). System read is a
     * participant self-service seam: the caller (connection service)
     * has already proven an accepted connection before asking.
     */
    contactProfileById: async (id) => {
      const payload = await getSystemPayload();
      const doc = await payload
        .findByID({
          collection: 'participants',
          id,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null);
      if (!doc || (doc as { blocked?: boolean | null }).blocked === true) {
        return null;
      }
      const row = doc as unknown as ParticipantRow & {
        phone?: string | null;
        contactPrefs?: {
          directory?: boolean | null;
          whatsapp?: boolean | null;
          phone?: boolean | null;
          email?: boolean | null;
          meetings?: boolean | null;
        } | null;
      };
      return {
        id: String(row.id),
        name: row.name ?? '',
        email: row.email ?? '',
        phone: row.phone ?? undefined,
        prefs: {
          whatsapp: row.contactPrefs?.whatsapp !== false,
          phone: row.contactPrefs?.phone !== false,
          email: row.contactPrefs?.email !== false,
          meetings: row.contactPrefs?.meetings !== false,
          directory: row.contactPrefs?.directory === true,
        },
      };
    },
    setContactPreferences: async (id, prefs) => {
      const payload = await getSystemPayload();
      await payload.update({
        collection: 'participants',
        id,
        overrideAccess: true,
        data: { contactPrefs: prefs },
      });
    },
    totpStateById: async (id) => {
      const payload = await getSystemPayload();
      const doc = await payload
        .findByID({
          collection: 'participants',
          id,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null);
      if (!doc) {
        return null;
      }
      const row = doc as {
        totpSecret?: string | null;
        totpEnabledAt?: string | null;
      };
      return {
        secret: row.totpSecret ?? null,
        enabledAt: row.totpEnabledAt ?? null,
      };
    },
    setTotpState: async (id, secret, enabledAt) => {
      const payload = await getSystemPayload();
      await payload.update({
        collection: 'participants',
        id,
        overrideAccess: true,
        data: { totpSecret: secret, totpEnabledAt: enabledAt },
      });
    },
  };
