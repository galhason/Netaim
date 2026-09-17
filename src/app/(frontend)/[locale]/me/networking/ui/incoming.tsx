import type { Locale } from '@/config/locales';
import type { MyConnection } from '@/features/networking';
import { respondConnectionAction } from '../actions';
import { Avatar } from './shared';

/*
 * "Waiting for you" — the warm panel, laid out as the mock lays it: a
 * count in the heading and a grid of compact cards, each carrying the
 * person, their line, the message they attached, and the two answers
 * side by side. Still nothing but POST forms.
 */
const IncomingRequests = ({
  locale,
  he,
  num,
  incoming,
}: {
  locale: Locale;
  he: boolean;
  num: (value: number) => string;
  incoming: (MyConnection & { slug: string; title: string })[];
}) => {
  if (incoming.length === 0) {
    return null;
  }
  return (
    <section id="requests" className="lounge-rise scroll-mt-28 rounded-3xl border border-[var(--n-gold)]/25 bg-[var(--n-cream)] p-4 shadow-[0_14px_44px_rgba(23,32,51,0.08)] md:p-6">
      <h2 className="mb-3 font-display text-xl font-semibold md:mb-4">
        {he
          ? `מחכים לכם (${num(incoming.length)})`
          : `Waiting for you (${num(incoming.length)})`}
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {incoming.map((pending) => (
          <li
            key={pending.id}
            className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-[var(--n-hair)]"
          >
            <div className="flex items-center gap-3">
              <Avatar name={pending.otherName} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {pending.otherName}
                </span>
                <span className="block truncate text-xs text-[var(--n-faint)]">
                  {pending.title}
                </span>
              </span>
            </div>
            {pending.message ? (
              <p className="line-clamp-2 text-xs text-[var(--n-soft)]">
                {pending.message}
              </p>
            ) : null}
            <div className="mt-auto flex gap-2">
              {(['accept', 'decline'] as const).map((response) => (
                <form
                  key={response}
                  action={respondConnectionAction}
                  className="flex-1"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="slug" value={pending.slug} />
                  <input type="hidden" name="connectionId" value={pending.id} />
                  <input type="hidden" name="response" value={response} />
                  <button
                    type="submit"
                    className={
                      response === 'accept'
                        ? 'inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--n-purple)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--n-purple-soft)]'
                        : 'inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--n-hair)] bg-white px-4 text-sm transition-colors hover:border-[var(--n-gold)]'
                    }
                  >
                    {response === 'accept'
                      ? he
                        ? 'אישור'
                        : 'Accept'
                      : he
                        ? 'דחייה'
                        : 'Decline'}
                  </button>
                </form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default IncomingRequests;
