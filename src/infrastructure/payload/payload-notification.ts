import { relationshipId, type RelationshipValue } from '@/auth';
import {
  MAX_ATTEMPTS,
  type DeliveryStatus,
  type NotificationOutboxRepository,
} from '@/notification-engine';
import { getSystemPayload } from './payload-context';

/*
 * A feed, not a set: the newest announcements are what a guest reads,
 * and nothing downstream treats this as the complete history. Named so
 * the ceiling is visible rather than a number nobody questions.
 */
const ANNOUNCEMENT_FEED_LIMIT = 200;

/*
 * The outbox adapter. Records live under the event's organization so the
 * Studio (and Payload ops view) surface them within tenancy isolation.
 * Account-level messages (platform sign-in) carry no conference: the
 * organization is then resolved from the participant.
 */
interface FailedRow {
  id: number | string;
  /*
   * Typed as the relationship shape rather than `unknown`: Payload
   * returns either the id or the resolved row depending on `depth`, and
   * `relationshipId` is the one place that knows the difference.
   */
  participant?: RelationshipValue;
  event?: { slug?: string } | number | string | null;
  type?: string;
  locale?: string;
  subject?: string;
  body?: string;
  attempts?: number;
  updatedAt?: string;
  createdAt?: string;
}

export const payloadNotificationOutboxRepository: NotificationOutboxRepository =
  {
    listFailed: async (limit) => {
      const payload = await getSystemPayload();
      const found = await payload
        .find({
          collection: 'notifications',
          where: {
            and: [
              { status: { equals: 'failed' } },
              {
                /*
                 * `attempts < 5` alone would drop every row where the
                 * column is null — SQL comparison against null is null,
                 * not true — and a row written before this column
                 * existed has exactly that. Those are the oldest failed
                 * messages, so the bug would have quietly excluded the
                 * ones most in need of a retry.
                 */
                or: [
                  { attempts: { less_than: MAX_ATTEMPTS } },
                  { attempts: { exists: false } },
                ],
              },
            ],
          },
          sort: 'updatedAt',
          limit,
          depth: 1,
          overrideAccess: true,
        })
        .catch(() => null);

      return ((found?.docs ?? []) as unknown as FailedRow[]).flatMap((row) => {
        const participantId = relationshipId(row.participant);
        /* `depth: 1` resolves the relationship, so the slug is here. */
        const eventSlug =
          row.event && typeof row.event === 'object' ? (row.event.slug ?? '') : '';
        if (!participantId) {
          return [];
        }
        return [
          {
            id: String(row.id),
            participantId: String(participantId),
            eventSlug,
            type: row.type ?? '',
            locale: row.locale ?? '',
            subject: row.subject ?? '',
            body: row.body ?? '',
            attempts: row.attempts ?? 0,
            lastAttemptAt: Date.parse(row.updatedAt ?? row.createdAt ?? '') || 0,
          },
        ];
      });
    },

    markAttempt: async (id, status, error) => {
      const payload = await getSystemPayload();
      const current = await payload
        .findByID({ collection: 'notifications', id, depth: 0, overrideAccess: true })
        .catch(() => null);
      const attempts =
        ((current as { attempts?: number } | null)?.attempts ?? 0) + 1;
      await payload
        .update({
          collection: 'notifications',
          id,
          data: {
            status,
            attempts,
            ...(status === 'sent'
              ? { sentAt: new Date().toISOString(), lastError: null }
              : { lastError: error ?? 'delivery failed' }),
          },
          overrideAccess: true,
        })
        .catch(() => undefined);
    },

    enqueue: async (record) => {
      const payload = await getSystemPayload();
      /*
       * A broadcast carries no recipient: an empty participantId stays
       * undefined (Number('') is 0, which would point at nobody's id).
       */
      const participantId =
        record.participantId && !Number.isNaN(Number(record.participantId))
          ? Number(record.participantId)
          : undefined;

      let organization: number | null = null;
      let eventId: number | null = null;

      if (record.eventSlug) {
        const event = await payload.find({
          collection: 'events',
          where: { slug: { equals: record.eventSlug } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        const eventRow = event.docs[0] as
          | {
              id: number | string;
              organization: number | string | { id: number | string };
            }
          | undefined;
        if (eventRow) {
          organization = Number(relationshipId(eventRow.organization));
          eventId = Number(eventRow.id);
        }
      }

      if (organization === null && participantId !== undefined) {
        const participant = await payload
          .findByID({
            collection: 'participants',
            id: participantId,
            depth: 0,
            overrideAccess: true,
          })
          .catch(() => null);
        const owner = (participant as { organization?: unknown } | null)
          ?.organization;
        if (owner !== undefined && owner !== null) {
          organization = Number(
            relationshipId(owner as number | string | { id: number | string }),
          );
        }
      }

      if (organization === null || Number.isNaN(organization)) {
        return;
      }

      await payload.create({
        collection: 'notifications',
        data: {
          organization,
          participant: participantId,
          ...(eventId === null ? {} : { event: eventId }),
          type: record.type,
          channel: 'email',
          status: record.status,
          locale: record.locale,
          subject: record.subject,
          body: record.body,
          sentAt: record.status === 'sent' ? new Date().toISOString() : undefined,
          /*
           * `queued` means no provider was configured, so nothing was
           * tried; `sent` and `failed` each represent one attempt. The
           * dispatcher's backoff reads this, so counting a non-attempt
           * would delay the first real retry by a minute for nothing.
           */
          attempts: record.status === 'queued' ? 0 : 1,
        },
        overrideAccess: true,
      });
    },
    listFeedFor: async (slug, participantId) => {
      const payload = await getSystemPayload();
      const event = await payload.find({
        collection: 'events',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const eventRow = event.docs[0] as { id: number | string } | undefined;
      if (!eventRow) {
        return [];
      }
      const pid = Number(participantId);
      const found = await payload.find({
        collection: 'notifications',
        where: {
          and: [
            { event: { equals: Number(eventRow.id) } },
            {
              or: [
                { participant: { exists: false } },
                ...(Number.isNaN(pid)
                  ? []
                  : [{ participant: { equals: pid } }]),
              ],
            },
          ],
        },
        sort: '-createdAt',
        limit: 100,
        depth: 0,
        overrideAccess: true,
      });
      return found.docs.map((doc) => {
        const row = doc as {
          id: number | string;
          type?: string;
          channel?: string;
          status?: DeliveryStatus;
          locale?: string;
          subject?: string;
          body?: string;
          createdAt?: string;
          sentAt?: string;
        };
        return {
          id: String(row.id),
          type: row.type ?? '',
          channel: row.channel ?? 'email',
          status: (row.status ?? 'queued') as DeliveryStatus,
          locale: row.locale ?? 'he',
          subject: row.subject ?? '',
          body: row.body ?? '',
          recipient: null,
          createdAt: row.createdAt,
          sentAt: row.sentAt,
        };
      });
    },
    listByEvent: async (slug) => {
      const payload = await getSystemPayload();
      const event = await payload.find({
        collection: 'events',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      const eventRow = event.docs[0] as { id: number | string } | undefined;
      if (!eventRow) {
        return [];
      }
      const found = await payload.find({
        collection: 'notifications',
        where: { event: { equals: Number(eventRow.id) } },
        sort: '-createdAt',
        limit: ANNOUNCEMENT_FEED_LIMIT,
        depth: 1,
        overrideAccess: true,
      });
      return found.docs.map((doc) => {
        const row = doc as {
          id: number | string;
          type?: string;
          channel?: string;
          status?: DeliveryStatus;
          locale?: string;
          subject?: string;
          body?: string;
          participant?:
            | { name?: string; email?: string }
            | number
            | string
            | null;
          createdAt?: string;
          sentAt?: string;
        };
        const participant = row.participant;
        const recipient =
          participant && typeof participant === 'object'
            ? (participant.name ?? participant.email ?? null)
            : null;
        return {
          id: String(row.id),
          type: row.type ?? '',
          channel: row.channel ?? 'email',
          status: (row.status ?? 'queued') as DeliveryStatus,
          locale: row.locale ?? 'he',
          subject: row.subject ?? '',
          body: row.body ?? '',
          recipient,
          createdAt: row.createdAt,
          sentAt: row.sentAt,
        };
      });
    },
  };
