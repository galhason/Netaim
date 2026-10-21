import {
  htmlFor,
  type ChannelAdapter,
  type DeliveryStatus,
  type OutboxMessage,
  type Recipient,
} from '@/notification-engine';
import { createLogger } from '@/shared';
import { BRAND_LOGO } from '@/config/brand';
import { payloadSiteLogos } from '../payload/payload-site';
import { SITE_ORIGIN, withBasePath } from '@/config/site';

const log = createLogger('smtp');

/*
 * The logo for the mail header, as an absolute URL.
 *
 * A mail client has no site to resolve `/brand/...` against, so without
 * a deployment origin there is no image to offer and the header falls
 * back to the name in type — which is what it was before. The Studio's
 * own logo wins when one is set; a read that fails costs a picture, not
 * a message, so it is caught.
 *
 * Held for a minute, for the same reason the transport is pooled: an
 * announcement to six hundred people is six hundred calls through here,
 * and the answer changes about once in the life of an organization.
 */
const LOGO_TTL_MS = 60_000;
let logoHeld: { url: string | undefined; at: number } | null = null;

const mailLogoUrl = async (): Promise<string | undefined> => {
  const now = Date.now();
  if (logoHeld && now - logoHeld.at < LOGO_TTL_MS) {
    return logoHeld.url;
  }
  const origin = SITE_ORIGIN;
  let url: string | undefined;
  if (origin) {
    const stored = await payloadSiteLogos().catch(() => null);
    const path = stored?.onDark ?? BRAND_LOGO.onDark;
    /* Both a shipped and an uploaded logo already carry the base path. */
    url = path.startsWith('http') ? path : `${origin}${withBasePath(path)}`;
  }
  logoHeld = { url, at: now };
  return url;
};

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
    html?: string;
    replyTo?: string;
  }) => Promise<unknown>;
};

let transport: Promise<Transport | null> | null = null;

/*
 * A pooled connection that the relay closed while it sat idle. Gmail
 * does this after a few quiet minutes and answers the next command on
 * it with "421 Connection expired, try reconnecting"; a reset socket
 * says the same thing without the words. Neither is about the message
 * — a fresh connection carries it — so the pool is dropped and the one
 * send is tried once more. Anything else (a refused login, a rejected
 * address, a quota) is final and is not retried here.
 */
const STALE_CONNECTION = /\b421\b|ECONNRESET|EPIPE|ETIMEDOUT|socket close|Connection closed|Connection expired/i;

const isStaleConnection = (error: unknown): boolean =>
  error instanceof Error && STALE_CONNECTION.test(`${error.message} ${(error as { code?: string }).code ?? ''}`);

const dropTransport = async (): Promise<void> => {
  const held = transport;
  transport = null;
  const mailer = await held?.catch(() => null);
  (mailer as { close?: () => void } | null)?.close?.();
};

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
    const mail = {
      from: config.from,
      to: recipient.email,
      subject: message.subject,
      /*
       * Both parts, always. The text is the message; the HTML is the
       * same message wearing the platform's clothes. A client that
       * refuses HTML, a screen reader, and a person who reads mail in
       * plain text all get the full content from `text` alone.
       */
      text: message.body,
      html: htmlFor(message, await mailLogoUrl()),
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    };
    const send = async (): Promise<void> => {
      const mailer = await getTransport(config);
      if (!mailer) {
        throw new Error('transport unavailable');
      }
      await mailer.sendMail(mail);
    };
    try {
      try {
        await send();
      } catch (error) {
        if (!isStaleConnection(error)) {
          throw error;
        }
        log.warn('stale connection, reconnecting', {
          type: message.type,
          eventSlug: message.eventSlug,
          error: error instanceof Error ? error.message : String(error),
        });
        await dropTransport();
        await send();
      }
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
