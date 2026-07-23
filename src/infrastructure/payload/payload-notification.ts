import { relationshipId } from '@/auth';
import type {
  DeliveryStatus,
  NotificationOutboxRepository,
} from '@/notification-engine';
import { getSystemPayload } from './payload-context';

/*
 * The outbox adapter. Records live under the event's organization so the
 * Studio (and Payload ops view) surface them within tenancy isolation.
 * Account-level messages (platform sign-in) carry no conference: the
 * organization is then resolved from the participant.
 */
export const payloadNotificationOutboxRepository: NotificationOutboxRepository =
  {
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
        limit: 200,
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
