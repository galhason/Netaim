import type { ChannelAdapter } from './channel/channel';
import type { NotificationOutboxRepository } from './outbox/outbox';
import type { RecipientLookup } from './notification-service';
import { isDue } from './outbox/retry';

export interface DispatchReport {
  considered: number;
  retried: number;
  sent: number;
  stillFailing: number;
}

/*
 * Reconsiders failed deliveries. Called on a schedule — a cron on the
 * server hitting the dispatch route — rather than on a timer inside the
 * app: a timer dies with the process and leaves a queue nobody drains,
 * and it multiplies if the app is ever run as more than one instance.
 *
 * Messages not yet due for another attempt are counted and skipped, so
 * a sweep every minute is cheap and the backoff still holds.
 */
export const createDispatcher =
  (
    outbox: NotificationOutboxRepository,
    channel: ChannelAdapter,
    recipientFor: RecipientLookup,
    batchSize = 50,
  ) =>
  async (now: number = Date.now()): Promise<DispatchReport> => {
    const failed = await outbox.listFailed(batchSize);
    const report: DispatchReport = {
      considered: failed.length,
      retried: 0,
      sent: 0,
      stillFailing: 0,
    };

    for (const message of failed) {
      if (!isDue(message, now)) {
        continue;
      }
      report.retried += 1;
      const recipient = await recipientFor(message.participantId).catch(
        () => null,
      );
      /*
       * One at a time rather than in parallel: this runs unattended
       * against someone else's mail relay, and a burst of retries is
       * what gets a sender rate-limited or blocked outright.
       */
      const status = await channel
        .deliver(message, recipient)
        .catch(() => 'failed' as const);

      if (status === 'sent') {
        report.sent += 1;
        await outbox.markAttempt(message.id, 'sent');
      } else {
        report.stillFailing += 1;
        await outbox.markAttempt(
          message.id,
          'failed',
          recipient ? 'delivery refused' : 'no recipient address',
        );
      }
    }

    return report;
  };
