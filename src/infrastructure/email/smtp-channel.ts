import type {
  ChannelAdapter,
  DeliveryStatus,
  OutboxMessage,
  Recipient,
} from '@/notification-engine';
import { createLogger } from '@/shared';

const log = createLogger('smtp');

/*
 * Email over SMTP, deliberately rather than a vendor's SDK.
 *
 * Every provider worth using — Resend, SES, SendGrid, Postmark, Mailgun
 * — speaks SMTP, and so does a government mail relay and any Postfix on
 * a box. Choosing SMTP means the provider is an environment variable
 * rather than a code change, which matters here twice over: the
 * deployment target is not decided yet, and a public body may later be
 * told which server its mail must leave through. A vendor SDK would
 * make that a rewrite.
 *
 * The transport is created once and reused: a connection pool, not a
 * handshake per message. A 600-person announcement over per-message
 * connections would be refused by most relays as flooding.
 */

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  replyTo?: string;
}

const readConfig = (): SmtpConfig | null => {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) {
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    /*
     * Implicit TLS on 465, STARTTLS elsewhere. Set SMTP_SECURE to
     * override for a relay that does something unusual.
     */
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465,
    user: process.env.SMTP_USER?.trim() || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from,
    replyTo: process.env.SMTP_REPLY_TO?.trim() || undefined,
  };
};

type Transport = {
  sendMail: (options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    replyTo?: string;
  }) => Promise<unknown>;
};

let transport: Promise<Transport | null> | null = null;

const getTransport = (config: SmtpConfig): Promise<Transport | null> => {
  transport ??= import('nodemailer')
    .then((nodemailer) =>
      nodemailer.default.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        ...(config.user
          ? { auth: { user: config.user, pass: config.password ?? '' } }
          : {}),
        pool: true,
        maxConnections: 3,
      }),
    )
    .catch((error: unknown) => {
      log.error('transport unavailable', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });
  return transport;
};

/*
 * The real channel. Returns `failed` rather than throwing: the outbox
 * records the outcome and the dispatcher retries, and a registration
 * must never be rolled back because a mail server was briefly down.
 */
export const smtpChannel: ChannelAdapter = {
  deliver: async (
    message: OutboxMessage,
    recipient: Recipient,
  ): Promise<DeliveryStatus> => {
    const config = readConfig();
    if (!config) {
      return 'queued';
    }
    if (!recipient?.email) {
      /*
       * No address: a deleted or anonymised account. This is terminal,
       * not transient, so it is not worth retrying — but it is worth
       * seeing, because silently dropping a confirmation is exactly the
       * failure this whole slice exists to end.
       */
      log.warn('no recipient address', {
        type: message.type,
        eventSlug: message.eventSlug,
      });
      return 'failed';
    }
    const mailer = await getTransport(config);
    if (!mailer) {
      return 'failed';
    }
    try {
      await mailer.sendMail({
        from: config.from,
        to: recipient.email,
        subject: message.subject,
        text: message.body,
        ...(config.replyTo ? { replyTo: config.replyTo } : {}),
      });
      log.info('sent', { type: message.type, eventSlug: message.eventSlug });
      return 'sent';
    } catch (error) {
      /*
       * The address is never logged. A failed-delivery log line that
       * carries participants' email addresses turns the log file into a
       * mailing list.
       */
      log.error('delivery failed', {
        type: message.type,
        eventSlug: message.eventSlug,
        error: error instanceof Error ? error.message : String(error),
      });
      return 'failed';
    }
  },
};

/* Whether a provider is configured at all — for the health endpoint. */
export const smtpConfigured = (): boolean => readConfig() !== null;
