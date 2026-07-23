import Link from 'next/link';
import { getStudioLocale } from '@/features/studio';
import { listRegistrations } from '@/features/registration';
import type { Locale } from '@/config/locales';

interface ParticipantsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}

const COPY = {
  heading: { he: 'נרשמים', en: 'Registrants' },
  intro: {
    he: 'כל מי שנרשם לאירוע — לפי סטטוס ונוכחות. חיפוש לפי שם או אימייל.',
    en: 'Everyone registered for the event — by status and attendance. Search by name or email.',
  },
  search: { he: 'חיפוש שם או אימייל', en: 'Search name or email' },
  empty: {
    he: 'אין נרשמים שתואמים את הסינון.',
    en: 'No registrants match this filter.',
  },
  summary: { he: 'נרשמים', en: 'registrants' },
  attendedCount: { he: 'נכחו', en: 'attended' },
} as const;

const FILTERS = [
  { key: 'all', label: { he: 'הכל', en: 'All' } },
  { key: 'pending', label: { he: 'ממתינים', en: 'Pending' } },
  { key: 'confirmed', label: { he: 'רשומים', en: 'Registered' } },
  { key: 'waitlisted', label: { he: 'המתנה', en: 'Waitlist' } },
  { key: 'attended', label: { he: 'נכחו', en: 'Attended' } },
  { key: 'cancelled', label: { he: 'בוטלו', en: 'Cancelled' } },
] as const;

const STATUS_LABEL: Record<string, Record<Locale, string>> = {
  pending: { he: 'ממתין', en: 'Pending' },
  confirmed: { he: 'רשום', en: 'Registered' },
  waitlisted: { he: 'רשימת המתנה', en: 'Waitlist' },
  attended: { he: 'נכח', en: 'Attended' },
  declined: { he: 'נדחה', en: 'Declined' },
  cancelled: { he: 'בוטל', en: 'Cancelled' },
  expired: { he: 'פג תוקף', en: 'Expired' },
  noShow: { he: 'לא הגיע', en: 'No-show' },
};

const dateLabel = (iso?: string): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString().slice(0, 10);
};

const ParticipantsPage = async ({
  params,
  searchParams,
}: ParticipantsPageProps) => {
  const { slug } = await params;
  const { status: statusParam, q: qParam } = await searchParams;
  const locale = await getStudioLocale();

  const status = FILTERS.some((filter) => filter.key === statusParam)
    ? (statusParam as string)
    : 'all';
  const query = (qParam ?? '').trim();
  const needle = query.toLowerCase();

  const all = await listRegistrations(slug).catch(() => []);
  const attended = all.filter((row) => row.status === 'attended').length;

  const rows = all
    .filter((row) => (status === 'all' ? true : row.status === status))
    .filter((row) =>
      needle
        ? row.participant.name.toLowerCase().includes(needle) ||
          row.participant.email.toLowerCase().includes(needle)
        : true,
    )
    .sort((a, b) => a.participant.name.localeCompare(b.participant.name));

  const filterHref = (key: string): string => {
    const search = new URLSearchParams();
    if (key !== 'all') {
      search.set('status', key);
    }
    if (query) {
      search.set('q', query);
    }
    const suffix = search.toString();
    return suffix ? `?${suffix}` : '';
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-medium">
          {COPY.heading[locale]}
        </h2>
        <p className="text-sm text-text-secondary">{COPY.intro[locale]}</p>
      </div>

      <p className="text-sm text-text-secondary">
        {all.length} {COPY.summary[locale]} · {attended}{' '}
        {COPY.attendedCount[locale]}
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {FILTERS.map((filter) => {
          const active = filter.key === status;
          return (
            <Link
              key={filter.key}
              href={filterHref(filter.key)}
              className={`inline-flex min-h-9 items-center text-sm ${
                active
                  ? 'font-medium text-text-primary underline decoration-accent decoration-2 underline-offset-8'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {filter.label[locale]}
            </Link>
          );
        })}
      </div>

      <form className="flex flex-wrap items-end gap-4">
        {status !== 'all' ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={COPY.search[locale]}
          className="min-w-64 flex-1 border-b border-border bg-transparent py-2 text-sm outline-none"
        />
      </form>

      {rows.length === 0 ? (
        <p className="max-w-md text-sm text-text-secondary">
          {COPY.empty[locale]}
        </p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => {
            const label = STATUS_LABEL[row.status] ?? {
              he: row.status,
              en: row.status,
            };
            const present = row.status === 'attended';
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border py-4"
              >
                <span className="min-w-40 flex-1 font-medium">
                  {row.participant.name}
                </span>
                <span className="min-w-48 text-sm text-text-secondary">
                  {row.participant.email}
                </span>
                {row.submittedAt ? (
                  <span className="text-sm tabular-nums text-text-secondary">
                    {dateLabel(row.submittedAt)}
                  </span>
                ) : null}
                <span
                  className={`text-sm ${present ? 'font-medium text-text-primary' : 'text-text-secondary'}`}
                >
                  {label[locale]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ParticipantsPage;
