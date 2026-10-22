import type { OutboxMessage } from './channel/channel';

/*
 * What the outbox keeps of a message is a record, not a key.
 *
 * A sign-in link carries a single-use token that opens the account for
 * fifteen minutes. The outbox used to keep the body exactly as mailed,
 * so anyone who could read the notifications table — a database backup,
 * a support query, the Content Engine's own panel — held working keys
 * to every account that had just asked for one. The person gets the
 * link; the record says a link was sent and keeps the token out. (The
 * call to action is never persisted, and is redacted all the same.)
 */
const TOKEN_IN_LINK = /([?&]token=)[^\s&#"'<>]+/g;

export const REDACTED = '[redacted]';

export const redactLinkTokens = (text: string): string =>
  text.replace(TOKEN_IN_LINK, `$1${REDACTED}`);

export const redactForRecord = <T extends OutboxMessage>(message: T): T => ({
  ...message,
  body: redactLinkTokens(message.body),
  ...(message.cta ? { cta: { ...message.cta, href: redactLinkTokens(message.cta.href) } } : {}),
});
