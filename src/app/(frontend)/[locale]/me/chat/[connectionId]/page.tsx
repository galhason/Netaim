import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { connectionChannels, myChatThread } from '@/features/networking';
import { formatTimeLabel } from '@/shared';
import { sendChatAction } from './actions';
import ChatRefresh from './chat-refresh';

/*
 * The HASON Messages thread (Connection Framework v1.0): the default
 * channel of every accepted connection. Two people, their words, and
 * the other channels one tap away — exactly as much as was approved.
 */
interface ChatPageProps {
  params: Promise<{ locale: string; connectionId: string }>;
}

const TEXT = {
  back: { he: 'לנטוורקינג', en: 'Networking' },
  placeholder: { he: 'כתבו הודעה…', en: 'Write a message…' },
  send: { he: 'שליחה', en: 'Send' },
  empty: {
    he: 'עוד אין הודעות. אמרו שלום — זה תמיד עובד.',
    en: 'No messages yet. Say hello — it always works.',
  },
  whatsapp: { he: 'WhatsApp', en: 'WhatsApp' },
  call: { he: 'טלפון', en: 'Phone' },
  emailBtn: { he: 'אימייל', en: 'Email' },
} as const;

const ChatPage = async ({ params }: ChatPageProps) => {
  const { locale: rawLocale, connectionId } = await params;
  if (!isSupportedLocale(rawLocale)) {
    notFound();
  }
  const locale: Locale = rawLocale;
  setRequestLocale(locale);

  const thread = await myChatThread(connectionId);
  if (!thread) {
    redirect(`/${locale}/me/networking`);
  }
  const channels = await connectionChannels(connectionId).catch(() => null);

  return (
    <main
      id="main-content"
      className="lounge flex min-h-dvh flex-col bg-[var(--l-bg)] font-body text-[var(--l-ink)]"
    >
      <ChatRefresh />
      <header className="sticky top-0 z-10 bg-[var(--l-navy)] text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-4">
          <Link
            href={`/${locale}/me/networking`}
            className="text-sm text-white/80 transition-opacity hover:opacity-75"
          >
            ←
          </Link>
          <span className="grid size-10 flex-none place-items-center rounded-full bg-[#C9A96E]/25 font-display text-[#E3CC9C]">
            {thread.otherName.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg font-semibold">
              {thread.otherName}
            </span>
          </span>
          <span className="flex items-center gap-2 text-xs">
            {channels?.whatsapp ? (
              <a
                href={`/${locale}/me/wa/${connectionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/25 px-3 py-1.5 transition-colors hover:border-white/60"
              >
                {TEXT.whatsapp[locale]}
              </a>
            ) : null}
            {channels?.phone ? (
              <a
                href={`tel:${channels.phone}`}
                className="rounded-full border border-white/25 px-3 py-1.5 transition-colors hover:border-white/60"
              >
                {TEXT.call[locale]}
              </a>
            ) : null}
            {channels?.email ? (
              <a
                href={`mailto:${channels.email}`}
                className="rounded-full border border-white/25 px-3 py-1.5 transition-colors hover:border-white/60"
              >
                {TEXT.emailBtn[locale]}
              </a>
            ) : null}
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 px-5 py-6">
        {thread.messages.length === 0 ? (
          <p className="m-auto rounded-2xl bg-white px-5 py-4 text-sm text-[var(--l-soft)] shadow-[0_10px_30px_rgba(35,40,47,0.06)]">
            {TEXT.empty[locale]}
          </p>
        ) : (
          thread.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}
            >
              <span
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-[0_6px_18px_rgba(35,40,47,0.07)] ${
                  message.mine
                    ? 'rounded-ee-md bg-[var(--l-navy)] text-white'
                    : 'rounded-es-md bg-white'
                }`}
              >
                <span className="block whitespace-pre-wrap break-words">
                  {message.body}
                </span>
                <span
                  className={`mt-1 block text-[10px] ${
                    message.mine ? 'text-white/55' : 'text-[var(--l-faint)]'
                  }`}
                >
                  {formatTimeLabel(message.createdAt, locale)}
                </span>
              </span>
            </div>
          ))
        )}
      </div>

      <footer className="sticky bottom-0 border-t border-[var(--l-hair)] bg-[var(--l-bg)]/95 backdrop-blur">
        <form
          action={sendChatAction}
          className="mx-auto flex max-w-2xl items-end gap-2 px-5 py-4"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="connectionId" value={connectionId} />
          <textarea
            name="body"
            rows={1}
            required
            maxLength={2000}
            placeholder={TEXT.placeholder[locale]}
            className="min-h-12 flex-1 resize-none rounded-2xl border border-[var(--l-hair)] bg-white px-4 py-3 text-sm"
          />
          <button
            type="submit"
            className="inline-flex min-h-12 items-center rounded-2xl bg-[var(--l-navy)] px-6 text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
          >
            {TEXT.send[locale]}
          </button>
        </form>
      </footer>
    </main>
  );
};

export default ChatPage;
