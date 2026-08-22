import { describe, expect, it } from 'vitest';
import {
  MAX_ATTEMPTS,
  backoffMs,
  createDispatcher,
  createNotificationSender,
  devChannel,
  isDue,
  isExhausted,
  type ChannelAdapter,
  type DeliveryStatus,
  type NotificationOutboxRepository,
  type NotificationRecord,
  type PendingDelivery,
  type Recipient,
} from '@/notification-engine';

const message = {
  participantId: '7',
  eventSlug: 'summit',
  type: 'registration.confirmed',
  locale: 'he',
  subject: 'נרשמת',
  body: 'מקומך שמור.',
};

const fakeOutbox = () => {
  const records: NotificationRecord[] = [];
  const attempts: { id: string; status: DeliveryStatus; error?: string }[] = [];
  const repository: NotificationOutboxRepository = {
    enqueue: async (record) => {
      records.push(record);
    },
    listByEvent: async () => [],
    listFeedFor: async () => [],
    listFailed: async () => [],
    markAttempt: async (id, status, error) => {
      attempts.push({ id, status, error });
    },
  };
  return { repository, records, attempts };
};

const channelReturning = (status: DeliveryStatus) => {
  const seen: { recipient: Recipient }[] = [];
  const channel: ChannelAdapter = {
    deliver: async (_message, recipient) => {
      seen.push({ recipient });
      return status;
    },
  };
  return { channel, seen };
};

describe('sending a notification', () => {
  it('offers the message to the channel with the resolved address', async () => {
    const { repository } = fakeOutbox();
    const { channel, seen } = channelReturning('sent');
    const send = createNotificationSender(repository, channel, async () => ({
      email: 'guest@example.org',
      name: 'Guest',
    }));

    await send(message);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.recipient).toEqual({
      email: 'guest@example.org',
      name: 'Guest',
    });
  });

  it('never writes the address into the outbox record', async () => {
    /*
     * The whole point of passing the recipient separately. If this ever
     * fails, every participant's email has been copied into a second
     * table that nothing needs it in.
     */
    const { repository, records } = fakeOutbox();
    const { channel } = channelReturning('sent');
    const send = createNotificationSender(repository, channel, async () => ({
      email: 'guest@example.org',
    }));

    await send(message);

    expect(records).toHaveLength(1);
    expect(JSON.stringify(records[0])).not.toContain('guest@example.org');
  });

  it('records what actually happened, not what was hoped', async () => {
    for (const status of ['sent', 'failed', 'queued'] as DeliveryStatus[]) {
      const { repository, records } = fakeOutbox();
      const { channel } = channelReturning(status);
      const send = createNotificationSender(repository, channel, async () => ({
        email: 'guest@example.org',
      }));
      await send(message);
      expect(records[0]?.status).toBe(status);
    }
  });

  it('still records when the address cannot be resolved', async () => {
    /* A deleted or anonymised account must not lose the record. */
    const { repository, records } = fakeOutbox();
    const { channel, seen } = channelReturning('failed');
    const send = createNotificationSender(repository, channel, async () => null);

    await send(message);

    expect(seen[0]?.recipient).toBeNull();
    expect(records).toHaveLength(1);
  });

  it('survives a lookup that throws', async () => {
    const { repository, records } = fakeOutbox();
    const { channel } = channelReturning('failed');
    const send = createNotificationSender(repository, channel, async () => {
      throw new Error('database unreachable');
    });

    await expect(send(message)).resolves.toBe('failed');
    expect(records).toHaveLength(1);
  });

  it('queues without sending when no provider is configured', async () => {
    const { repository, records } = fakeOutbox();
    const send = createNotificationSender(repository, devChannel, async () => ({
      email: 'guest@example.org',
    }));

    expect(await send(message)).toBe('queued');
    expect(records[0]?.status).toBe('queued');
  });
});

describe('retry policy', () => {
  it('backs off, doubling from a minute', () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(2)).toBe(120_000);
    expect(backoffMs(3)).toBe(240_000);
  });

  it('is not due before the delay has passed', () => {
    const candidate = { attempts: 1, lastAttemptAt: 0 };
    expect(isDue(candidate, 59_000)).toBe(false);
    expect(isDue(candidate, 60_000)).toBe(true);
  });

  it('gives up after a bounded number of attempts', () => {
    const exhausted = { attempts: MAX_ATTEMPTS, lastAttemptAt: 0 };
    expect(isExhausted(exhausted)).toBe(true);
    /* Never due again, however long it waits — a permanently bad
       address must not be retried forever. */
    expect(isDue(exhausted, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});

describe('the dispatcher', () => {
  const failed = (attempts: number, lastAttemptAt: number): PendingDelivery => ({
    id: 'n1',
    ...message,
    attempts,
    lastAttemptAt,
  });

  const outboxWith = (pending: PendingDelivery[]) => {
    const attempts: { id: string; status: DeliveryStatus }[] = [];
    const repository: NotificationOutboxRepository = {
      enqueue: async () => undefined,
      listByEvent: async () => [],
      listFeedFor: async () => [],
      listFailed: async () => pending,
      markAttempt: async (id, status) => {
        attempts.push({ id, status });
      },
    };
    return { repository, attempts };
  };

  it('retries a due message and records the success', async () => {
    const { repository, attempts } = outboxWith([failed(1, 0)]);
    const { channel } = channelReturning('sent');
    const dispatch = createDispatcher(repository, channel, async () => ({
      email: 'guest@example.org',
    }));

    const report = await dispatch(120_000);

    expect(report).toEqual({
      considered: 1,
      retried: 1,
      sent: 1,
      stillFailing: 0,
    });
    expect(attempts).toEqual([{ id: 'n1', status: 'sent' }]);
  });

  it('skips a message that is not due yet', async () => {
    const { repository, attempts } = outboxWith([failed(1, 0)]);
    const { channel, seen } = channelReturning('sent');
    const dispatch = createDispatcher(repository, channel, async () => ({
      email: 'guest@example.org',
    }));

    const report = await dispatch(1_000);

    expect(report.considered).toBe(1);
    expect(report.retried).toBe(0);
    expect(seen).toHaveLength(0);
    expect(attempts).toEqual([]);
  });

  it('does not retry an exhausted message', async () => {
    const { repository } = outboxWith([failed(MAX_ATTEMPTS, 0)]);
    const { channel, seen } = channelReturning('sent');
    const dispatch = createDispatcher(repository, channel, async () => ({
      email: 'guest@example.org',
    }));

    const report = await dispatch(Number.MAX_SAFE_INTEGER);

    expect(report.retried).toBe(0);
    expect(seen).toHaveLength(0);
  });

  it('counts a still-failing message and keeps its record', async () => {
    const { repository, attempts } = outboxWith([failed(1, 0)]);
    const { channel } = channelReturning('failed');
    const dispatch = createDispatcher(repository, channel, async () => ({
      email: 'guest@example.org',
    }));

    const report = await dispatch(120_000);

    expect(report.stillFailing).toBe(1);
    expect(attempts).toEqual([{ id: 'n1', status: 'failed' }]);
  });

  it('survives a channel that throws', async () => {
    const { repository, attempts } = outboxWith([failed(1, 0)]);
    const throwing: ChannelAdapter = {
      deliver: () => Promise.reject(new Error('connection reset')),
    };
    const dispatch = createDispatcher(repository, throwing, async () => ({
      email: 'guest@example.org',
    }));

    await expect(dispatch(120_000)).resolves.toMatchObject({
      stillFailing: 1,
    });
    expect(attempts[0]?.status).toBe('failed');
  });

  it('sends one at a time, not in a burst', async () => {
    /*
     * A parallel sweep against someone else's relay is what gets a
     * sender rate-limited or blocked. Proven by observing that a second
     * delivery never starts before the first resolves.
     */
    let inFlight = 0;
    let maxInFlight = 0;
    const channel: ChannelAdapter = {
      deliver: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        return 'sent';
      },
    };
    const pending = [1, 2, 3].map((n) => ({
      ...failed(1, 0),
      id: `n${n}`,
    }));
    const { repository } = outboxWith(pending);
    const dispatch = createDispatcher(repository, channel, async () => ({
      email: 'guest@example.org',
    }));

    await dispatch(120_000);

    expect(maxInFlight).toBe(1);
  });
});
