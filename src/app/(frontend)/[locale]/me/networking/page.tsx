import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { getMyAccount } from '@/features/account';
import { LOUNGE_UI } from '@/features/attendee';
import {
  myConnections,
  myUnreadByConnection,
  type MyConnection,
} from '@/features/networking';
import { getMyDetails } from '@/features/registration';
import {
  listEventParticipants,
  listPlatformParticipants,
  listPublicSpeakers,
} from '@/infrastructure';
import {
  manageConnectionAction,
  respondConnectionAction,
} from '../../events/[slug]/networking/actions';
import { platformConnectAction } from './actions';

/*
 * The conference community (Connection Framework v1.0, reference
 * design): one hub — discover people and organizations, scan to
 * connect, answer requests, keep your connections. Never a giant list;
 * always by consent.
 */
interface NetworkingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; org?: string; conf?: string; request?: string }>;
}

const card =
  'lounge-rise rounded-3xl bg-white shadow-[0_14px_44px_rgba(35,40,47,0.08)]';

const chip =
  'inline-flex items-center rounded-full bg-[var(--l-bronze)]/12 px-2.5 py-0.5 text-xs text-[var(--l-bronze)]';

const connectBtn =
  'inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--l-bronze)]/50 px-5 text-sm font-medium text-[var(--l-bronze)] transition-colors hover:bg-[var(--l-bronze)]/10';

const splitInterests = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const NetworkingPage = async ({ params, searchParams }: NetworkingPageProps) => {
  const { locale } = await params;
  const { q, org, conf, request } = await searchParams;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const account = await getMyAccount(locale);
  if (!account) {
    redirect(`/${locale}/me`);
  }
  const he = locale === 'he';

  const chosenConf = account.joined.find(
    (conference) => conference.slug === conf,
  );
  const [allPeople, details, speakers, perSlug] = await Promise.all([
    chosenConf
      ? listEventParticipants(chosenConf.slug).catch(() => [])
      : listPlatformParticipants().catch(() => []),
    getMyDetails(),
    listPublicSpeakers().catch(() => []),
    Promise.all(
      account.joined.slice(0, 5).map(async (conference) => ({
        conference,
        connections: await myConnections(conference.slug).catch(
          () => [] as MyConnection[],
        ),
      })),
    ),
  ]);

  const people = allPeople.filter(
    (person) =>
      person.participantId !== account.id &&
      (!person.email ||
        person.email.toLowerCase() !== account.email.toLowerCase()),
  );

  /* Live connection state, platform-wide */
  const incoming = perSlug.flatMap(({ conference, connections }) =>
    connections
      .filter(
        (connection) =>
          connection.status === 'pending' &&
          connection.direction === 'incoming',
      )
      .map((connection) => ({ ...connection, slug: conference.slug, title: conference.title })),
  );
  const acceptedAll = perSlug.flatMap(({ conference, connections }) =>
    connections
      .filter(
        (connection) => connection.status === 'accepted' || connection.muted,
      )
      .map((connection) => ({ ...connection, slug: conference.slug, title: conference.title })),
  );
  const unread = await myUnreadByConnection(acceptedAll);
  const activeByOther = new Map<string, 'pending' | 'accepted'>();
  for (const { connections } of perSlug) {
    for (const connection of connections) {
      if (
        connection.status === 'pending' ||
        connection.status === 'accepted' ||
        connection.muted
      ) {
        activeByOther.set(
          connection.otherId,
          connection.status === 'pending' ? 'pending' : 'accepted',
        );
      }
    }
  }

  /* Organizations as a first-class doorway */
  const orgCounts = new Map<string, number>();
  for (const person of people) {
    const name = person.orgName?.trim();
    if (name) {
      orgCounts.set(name, (orgCounts.get(name) ?? 0) + 1);
    }
  }
  const organizations = [...orgCounts.entries()].sort((a, b) => b[1] - a[1]);

  /* Search + filters */
  const query = (q ?? '').trim().toLowerCase();
  const filtered = people.filter((person) => {
    if (org && (person.orgName ?? '').trim() !== org) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [person.name, person.orgName, person.roleTitle, person.interests]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));
  });

  /* Suggestions: shared interests and shared organization, never noise */
  const myInterests = splitInterests(details?.interests);
  const myOrg = (details?.organization ?? '').trim();
  const suggested = people
    .map((person) => {
      const shared = splitInterests(person.interests).filter((interest) =>
        myInterests.includes(interest),
      );
      const sameOrg = Boolean(myOrg) && (person.orgName ?? '').trim() === myOrg;
      return { person, shared, sameOrg, score: shared.length * 2 + (sameOrg ? 1 : 0) };
    })
    .filter((entry) => entry.score > 0 && !activeByOther.has(entry.person.participantId))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const requestBanner =
    request === 'sent'
      ? he
        ? 'בקשת ההתחברות נשלחה.'
        : 'Connection request sent.'
      : request === 'noShared'
        ? he
          ? 'אין עדיין כנס משותף עם המשתתף הזה.'
          : 'No shared conference with this participant yet.'
        : null;

  return (
    <main
      id="main-content"
      className="lounge min-h-dvh bg-[var(--l-bg)] pb-16 font-body text-[var(--l-ink)]"
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--l-navy)]">
          <span
            aria-hidden="true"
            className="absolute -top-24 left-1/2 h-[22rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,110,0.35),transparent_70%)]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[var(--l-bg)]"
          />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-6 text-white">
          <div className="flex items-center justify-between text-sm text-white/85">
            <Link
              href={`/${locale}/me`}
              className="transition-opacity hover:opacity-75"
            >
              ← {LOUNGE_UI.myExperience[locale]}
            </Link>
            <span className="font-display font-semibold tracking-[0.3em]">
              נטעים
            </span>
          </div>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl font-semibold md:text-4xl">
                {he ? 'קהילת הכנס' : 'The conference community'}
              </h1>
              <p className="mt-2 text-white/75">
                {he
                  ? 'הכירו וצרו קשר עם משתתפים נוספים.'
                  : 'Meet and connect with fellow participants.'}
              </p>
              <dl className="mt-5 flex flex-wrap gap-8">
                {[
                  {
                    value: people.length + 1,
                    label: he ? 'משתתפים' : 'Participants',
                  },
                  {
                    value: orgCounts.size,
                    label: he ? 'ארגונים' : 'Organizations',
                  },
                  { value: speakers.length, label: he ? 'מרצים' : 'Speakers' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-xs text-white/60">{stat.label}</dt>
                    <dd className="font-display text-2xl font-semibold">
                      {stat.value.toLocaleString(he ? 'he-IL' : 'en-GB')}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-3xl bg-[#101B2C] p-5 text-start shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
              <p className="font-display text-lg font-semibold">
                {he ? 'סרוק כדי להתחבר' : 'Scan to connect'}
              </p>
              <p className="mt-1 max-w-52 text-xs text-white/65">
                {he
                  ? 'סרקו תג משתתף כדי לשלוח בקשת חיבור מהירה.'
                  : 'Scan a badge to send a quick connection request.'}
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/${locale}/me/scan`}
                  className="inline-flex min-h-10 items-center rounded-xl bg-[#C9A96E] px-4 text-sm font-medium text-[#1B2436]"
                >
                  {he ? 'סרוק משתתף' : 'Scan participant'}
                </Link>
                <Link
                  href={`/${locale}/me/badge`}
                  className="inline-flex min-h-10 items-center rounded-xl border border-white/25 px-4 text-sm text-white"
                >
                  {he ? 'התג שלי' : 'My badge'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-8 flex max-w-6xl flex-col gap-6 px-6">
        {/* Search + conference filter */}
        <form
          method="get"
          className={`${card} flex flex-wrap items-center gap-3 p-4`}
        >
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder={he ? 'את מי תרצו למצוא?' : 'Who would you like to meet?'}
            className="min-h-11 min-w-56 flex-1 rounded-xl border border-[var(--l-hair)] px-4 text-sm"
          />
          <select
            name="conf"
            defaultValue={conf ?? ''}
            className="min-h-11 rounded-xl border border-[var(--l-hair)] bg-white px-3 text-sm"
          >
            <option value="">{he ? 'כל הכנסים' : 'All conferences'}</option>
            {account.joined.map((conference) => (
              <option key={conference.slug} value={conference.slug}>
                {conference.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white"
          >
            {he ? 'חיפוש' : 'Search'}
          </button>
          {org ? (
            <Link
              href={`/${locale}/me/networking`}
              className="text-xs text-[var(--l-soft)] underline underline-offset-4"
            >
              {he ? `ניקוי סינון: ${org}` : `Clear filter: ${org}`}
            </Link>
          ) : null}
        </form>

        {requestBanner ? (
          <p className={`${card} p-4 text-center text-sm text-[var(--l-ink)]`}>
            {requestBanner}
          </p>
        ) : null}

        {/* Pending requests — never miss a hand extended to you */}
        {incoming.length > 0 ? (
          <section className={`${card} p-5`}>
            <h2 className="font-display text-xl font-semibold">
              {he ? 'בקשות חיבור' : 'Connection requests'}
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {incoming.map((request0) => (
                <li
                  key={request0.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--l-hair)] p-3.5"
                >
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-[var(--l-bronze)]/15 font-display text-[var(--l-bronze)]">
                    {request0.otherName.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {request0.otherName}
                    </span>
                    <span className="block text-xs text-[var(--l-faint)]">
                      {request0.title}
                      {request0.message ? ` · “${request0.message}”` : ''}
                    </span>
                  </span>
                  {(['accept', 'decline'] as const).map((response) => (
                    <form key={response} action={respondConnectionAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="slug" value={request0.slug} />
                      <input
                        type="hidden"
                        name="connectionId"
                        value={request0.id}
                      />
                      <input type="hidden" name="response" value={response} />
                      <button
                        type="submit"
                        className={
                          response === 'accept'
                            ? 'inline-flex min-h-10 items-center rounded-xl bg-[var(--l-navy)] px-5 text-sm font-medium text-white'
                            : 'inline-flex min-h-10 items-center rounded-xl border border-[var(--l-hair)] px-4 text-sm'
                        }
                      >
                        {response === 'accept'
                          ? he
                            ? 'אשר'
                            : 'Accept'
                          : he
                            ? 'דחה'
                            : 'Decline'}
                      </button>
                    </form>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Suggested — people, not statistics */}
        {suggested.length > 0 ? (
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold">
              {he ? 'אנשים מומלצים עבורך' : 'Suggested for you'}
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {suggested.map(({ person, shared, sameOrg }) => (
                <li key={person.participantId}>
                  <article className={`${card} flex h-full flex-col items-center gap-2 p-5 text-center`}>
                    {person.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
                      <img
                        src={person.photoUrl}
                        alt=""
                        className="size-16 rounded-full object-cover ring-1 ring-[var(--l-bronze)]/40"
                      />
                    ) : (
                      <span className="grid size-16 place-items-center rounded-full bg-[var(--l-bronze)]/15 font-display text-2xl text-[var(--l-bronze)]">
                        {person.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="font-display text-lg font-semibold">
                      {person.name}
                    </span>
                    {person.roleTitle || person.orgName ? (
                      <span className="text-sm text-[var(--l-soft)]">
                        {[person.roleTitle, person.orgName]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    ) : null}
                    <span className="flex flex-wrap justify-center gap-1.5">
                      {shared.length > 0 ? (
                        <span className={chip}>
                          {he
                            ? `${shared.length} תחומי עניין משותפים`
                            : `${shared.length} shared interests`}
                        </span>
                      ) : null}
                      {sameOrg ? (
                        <span className={chip}>
                          {he ? 'אותו ארגון' : 'Same organization'}
                        </span>
                      ) : null}
                    </span>
                    <form action={platformConnectAction} className="mt-auto pt-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input
                        type="hidden"
                        name="participantId"
                        value={person.participantId}
                      />
                      <button type="submit" className={connectBtn}>
                        {he ? 'התחבר' : 'Connect'}
                      </button>
                    </form>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Organizations — a first-class doorway */}
        {organizations.length > 0 ? (
          <section>
            <h2 className="mb-3 font-display text-xl font-semibold">
              {he ? 'גלוש לפי ארגונים' : 'Browse by organization'}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {organizations.slice(0, 12).map(([name, count]) => (
                <li key={name}>
                  <Link
                    href={`/${locale}/me/networking?org=${encodeURIComponent(name)}`}
                    aria-current={org === name ? 'true' : undefined}
                    className={`${card} flex h-full flex-col items-center gap-1 p-4 text-center transition-transform hover:-translate-y-0.5 ${
                      org === name ? 'ring-1 ring-[var(--l-bronze)]' : ''
                    }`}
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-[var(--l-navy)]/8 font-display text-lg">
                      {name.slice(0, 1)}
                    </span>
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs text-[var(--l-faint)]">
                      {he ? `${count} משתתפים` : `${count} participants`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Participants */}
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">
            {he ? 'משתתפים' : 'Participants'}
            {chosenConf ? (
              <span className="ms-2 text-sm font-normal text-[var(--l-soft)]">
                · {chosenConf.title}
              </span>
            ) : null}
          </h2>
          {filtered.length === 0 ? (
            <p className={`${card} p-6 text-center text-sm text-[var(--l-soft)]`}>
              {he
                ? 'לא נמצאו משתתפים לחיפוש הזה. נסו שם, ארגון או תחום עניין.'
                : 'No participants matched. Try a name, organization or interest.'}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.slice(0, 24).map((person, index) => {
                const state = activeByOther.get(person.participantId);
                return (
                  <li key={person.participantId}>
                    <article
                      className={`${card} flex h-full items-start gap-4 p-5 ${
                        ['', '[animation-delay:60ms]', '[animation-delay:120ms]'][index % 3]
                      }`}
                    >
                      {person.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
                        <img
                          src={person.photoUrl}
                          alt=""
                          className="size-12 flex-none rounded-full object-cover ring-1 ring-[var(--l-bronze)]/40"
                        />
                      ) : (
                        <span className="grid size-12 flex-none place-items-center rounded-full bg-[var(--l-bronze)]/15 font-display text-lg text-[var(--l-bronze)]">
                          {person.name.slice(0, 1)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-lg font-semibold">
                          {person.name}
                        </span>
                        {person.roleTitle || person.orgName ? (
                          <span className="block truncate text-sm text-[var(--l-soft)]">
                            {[person.roleTitle, person.orgName]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        ) : null}
                        {person.interests ? (
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {person.interests
                              .split(',')
                              .map((entry) => entry.trim())
                              .filter(Boolean)
                              .slice(0, 3)
                              .map((entry) => (
                                <span key={entry} className={chip}>
                                  {entry}
                                </span>
                              ))}
                          </span>
                        ) : null}
                        <span className="mt-3 block">
                          {state === 'accepted' ? (
                            <span className={chip}>
                              {he ? 'מחוברים' : 'Connected'}
                            </span>
                          ) : state === 'pending' ? (
                            <span className={chip}>
                              {he ? 'ממתין לאישור' : 'Pending'}
                            </span>
                          ) : (
                            <form action={platformConnectAction}>
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="participantId"
                                value={person.participantId}
                              />
                              <button type="submit" className={connectBtn}>
                                {he ? 'התחבר' : 'Connect'}
                              </button>
                            </form>
                          )}
                        </span>
                      </span>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* My connections */}
        {acceptedAll.length > 0 ? (
          <section className={`${card} p-5`}>
            <h2 className="font-display text-xl font-semibold">
              {he ? 'הקשרים שלי' : 'My connections'}
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {acceptedAll.map((connection) => (
                <li
                  key={connection.id}
                  className="flex flex-wrap items-center gap-3 border-b border-[var(--l-hair)] pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="text-sm font-medium">
                    {connection.otherName}
                  </span>
                  <span className="text-xs text-[var(--l-faint)]">
                    {connection.title}
                  </span>
                  {connection.muted ? (
                    <span className={chip}>{he ? 'מושתק' : 'Muted'}</span>
                  ) : null}
                  <span className="ms-auto flex items-center gap-3">
                    <Link
                      href={`/${locale}/me/chat/${connection.id}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--l-navy)] px-4 text-xs font-medium text-white"
                    >
                      {he ? 'הודעה' : 'Message'}
                      {(unread.get(connection.id) ?? 0) > 0 ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-[var(--l-bronze)] px-1 text-[10px] text-[#1B2436]">
                          {unread.get(connection.id)}
                        </span>
                      ) : null}
                    </Link>
                    <form action={manageConnectionAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input
                        type="hidden"
                        name="slug"
                        value={connection.slug}
                      />
                      <input
                        type="hidden"
                        name="connectionId"
                        value={connection.id}
                      />
                      <input
                        type="hidden"
                        name="manage"
                        value={connection.muted ? 'unmute' : 'mute'}
                      />
                      <button
                        type="submit"
                        className="text-xs text-[var(--l-soft)] underline underline-offset-4"
                      >
                        {connection.muted
                          ? he
                            ? 'ביטול השתקה'
                            : 'Unmute'
                          : he
                            ? 'השתקה'
                            : 'Mute'}
                      </button>
                    </form>
                    <form action={manageConnectionAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input
                        type="hidden"
                        name="slug"
                        value={connection.slug}
                      />
                      <input
                        type="hidden"
                        name="connectionId"
                        value={connection.id}
                      />
                      <input type="hidden" name="manage" value="remove" />
                      <button
                        type="submit"
                        className="text-xs text-[var(--l-soft)] underline underline-offset-4"
                      >
                        {he ? 'הסרה' : 'Remove'}
                      </button>
                    </form>
                    <Link
                      href={`/${locale}/events/${connection.slug}/networking`}
                      className="text-xs text-[var(--l-bronze)] underline underline-offset-4"
                    >
                      {he ? 'לערוצי הקשר' : 'Contact channels'}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {account.joined.length === 0 ? (
          <p className={`${card} p-6 text-center text-sm text-[var(--l-soft)]`}>
            {he
              ? 'נטוורקינג קורה בתוך כנס. הצטרפו לכנס מהאזור האישי — ומכאן מכירים אנשים.'
              : 'Networking happens inside a conference. Join one from your space — then meet people here.'}
          </p>
        ) : null}
      </div>
    </main>
  );
};

export default NetworkingPage;
