import type { Locale } from '@/config/locales';
import type { FellowParticipant } from '@/infrastructure';
import { platformConnectAction } from '../actions';
import SafetyMenu from './safety-menu';
import {
  Avatar,
  TONE_TEXT,
  card,
  connectBtn,
  liftable,
  personLine,
  type ReasonTone,
} from './shared';

/*
 * "Recommended for you" — the mock's card, faithfully: person and the
 * quiet ⋯ menu up top, the reason marked with a small star in its
 * meaning-color, and two equal actions below. "View profile" is an
 * anchor into the directory card, because on this page the directory
 * IS the profile — discovery up here, decision down there.
 */
export interface Recommendation {
  person: FellowParticipant;
  reason: string;
  tone: ReasonTone;
}

const RecommendedPeople = ({
  locale,
  he,
  recommendations,
  directorySlug,
}: {
  locale: Locale;
  he: boolean;
  recommendations: Recommendation[];
  directorySlug: string;
}) => {
  if (recommendations.length === 0) {
    return null;
  }
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold md:text-2xl">
          {he ? 'מומלצים עבורכם' : 'Recommended for you'}
        </h2>
        <a
          href="#directory"
          className="text-sm text-[var(--n-purple)] underline-offset-4 hover:underline"
        >
          {he ? 'לכל המשתתפים' : 'See all'}
        </a>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
        {recommendations.map(({ person, reason, tone }, index) => (
          <li
            key={person.participantId}
            className="w-60 flex-none snap-start md:w-auto"
          >
            <article
              className={`${card} ${liftable} flex h-full flex-col gap-1 p-3.5`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <Avatar name={person.name} photoUrl={person.photoUrl} />
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block truncate font-display text-base font-semibold">
                    {person.name}
                  </span>
                  {personLine(person) ? (
                    <span className="block truncate text-xs text-[var(--n-soft)]">
                      {personLine(person)}
                    </span>
                  ) : null}
                </span>
                <SafetyMenu
                  locale={locale}
                  he={he}
                  participantId={person.participantId}
                  name={person.name}
                  slug={directorySlug}
                />
              </div>
              <p className={`text-xs font-medium ${TONE_TEXT[tone]}`}>
                <span aria-hidden="true">★ </span>
                {reason}
              </p>
              <div className="mt-auto flex gap-2 pt-1.5">
                <form action={platformConnectAction} className="flex-1">
                  <input type="hidden" name="locale" value={locale} />
                  <input
                    type="hidden"
                    name="participantId"
                    value={person.participantId}
                  />
                  <button type="submit" className={connectBtn}>
                    {he ? 'התחברות' : 'Connect'}
                  </button>
                </form>
                <a
                  href={`#person-${person.participantId}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--n-hair)] px-4 text-sm text-[var(--n-soft)] transition-colors hover:border-[var(--n-purple)]/50 hover:text-[var(--n-purple)]"
                >
                  {he ? 'לכרטיס' : 'View profile'}
                </a>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default RecommendedPeople;
