import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { connectionChannels, myChatThread } from '@/features/networking';
import { sendChatAction } from './actions';
import ChatLive from './chat-live';

/*
 * The Netaim Messages thread (Connection Framework v1.0): the default
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
  closed: {
    he: 'השיחה הזו נסגרה.',
    en: 'This conversation is closed.',
  },
  failed: {
    he: 'ההודעה לא נשלחה. בדקו את החיבור ונסו שוב.',
    en: 'The message was not sent. Check your connection and try again.',
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

      <ChatLive
        connectionId={connectionId}
        locale={locale}
        fallback={sendChatAction}
        initial={thread.messages.map((message) => ({
          id: message.id,
          body: message.body,
          mine: message.mine,
          createdAt: message.createdAt,
        }))}
        text={{
          empty: TEXT.empty[locale],
          placeholder: TEXT.placeholder[locale],
          send: TEXT.send[locale],
          closed: TEXT.closed[locale],
          failed: TEXT.failed[locale],
        }}
      />
    </main>
  );
};

/*
 * The response is one person's conversation, so it is rendered per
 * request and never prerendered or shared. Declared rather than left to
 * Next to infer from a cookie read several calls down: an inferred
 * guard disappears the moment a refactor moves that read behind a
 * helper, and the failure would be one guest served another's thread.
 */
export const dynamic = 'force-dynamic';

export default ChatPage;
