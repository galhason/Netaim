'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';
import type { ActivityVM } from '../types';
import { Avatar, RegistrationButton, TypePill, surface } from '../ui/kit';
import {
  IconBulb,
  IconCalendar,
  IconCheck,
  IconCoffee,
  IconCompass,
  IconGathering,
  IconMic,
  IconPin,
  IconShare,
  IconStar,
  IconStarFilled,
  IconUsers,
} from '../ui/icons';
import { useToast } from '../ui/feedback';
import { useFavorites } from '../ui/favorites';

interface Props {
  activity: ActivityVM;
  locale: Locale;
  slug: string;
  onOpen: (id: string) => void;
  registerAction: (formData: FormData) => void | Promise<void>;
  leaveAction: (formData: FormData) => void | Promise<void>;
  index?: number;
}

const COPY = {
  favorite: { he: 'מועדף', en: 'Favorite' },
  share: { he: 'שיתוף', en: 'Share' },
  addedFav: { he: 'נוסף למועדפים', en: 'Added to favorites' },
  removedFav: { he: 'הוסר מהמועדפים', en: 'Removed from favorites' },
  copied: { he: 'הקישור הועתק', en: 'Link copied' },
  copyFailed: { he: 'לא ניתן להעתיק', en: 'Could not copy' },
  lastSeats: { he: 'נשארו מקומות אחרונים', en: 'Last places left' },
};

/*
 * The picture an activity shows when it has none of its own: a quiet
 * wash in the kind's own tone with the kind's icon — so a grid of
 * tiles keeps its rhythm whether or not every activity was given a cover.
 */
const KIND_ICON: Record<string, typeof IconMic> = {
  keynote: IconMic,
  talk: IconMic,
  workshop: IconBulb,
  tour: IconCompass,
  break: IconCoffee,
  gathering: IconGathering,
  panel: IconUsers,
};


/* The kind's colour, thinned to a wash for the ground and whole for the icon — the same variable the pill reads. */
const KIND_COVER: Record<string, string> = {
  keynote: 'bg-[color-mix(in_srgb,var(--x-kind-keynote,var(--x-primary))_12%,var(--x-surface))] text-[var(--x-kind-keynote,var(--x-primary))]',
  talk: 'bg-[color-mix(in_srgb,var(--x-kind-talk,var(--x-primary))_12%,var(--x-surface))] text-[var(--x-kind-talk,var(--x-primary))]',
  workshop: 'bg-[color-mix(in_srgb,var(--x-kind-workshop,var(--x-primary))_12%,var(--x-surface))] text-[var(--x-kind-workshop,var(--x-primary))]',
  panel: 'bg-[color-mix(in_srgb,var(--x-kind-panel,var(--x-primary))_12%,var(--x-surface))] text-[var(--x-kind-panel,var(--x-primary))]',
  tour: 'bg-[color-mix(in_srgb,var(--x-kind-tour,var(--x-primary))_12%,var(--x-surface))] text-[var(--x-kind-tour,var(--x-primary))]',
  break: 'bg-[color-mix(in_srgb,var(--x-kind-break,var(--x-primary))_12%,var(--x-surface))] text-[var(--x-kind-break,var(--x-primary))]',
  gathering: 'bg-[color-mix(in_srgb,var(--x-kind-gathering,var(--x-primary))_12%,var(--x-surface))] text-[var(--x-kind-gathering,var(--x-primary))]',
};

const Cover = ({ activity }: { activity: ActivityVM }) => {
  if (activity.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={activity.image}
        alt=""
        loading="lazy"
        className="size-full object-cover"
      />
    );
  }
  const Icon = KIND_ICON[activity.type] ?? IconMic;
  return (
    <span className={`grid size-full place-items-center ${KIND_COVER[activity.type] ?? KIND_COVER.talk}`}>
      <Icon className="size-5 opacity-80" />
    </span>
  );
};

/*
 * One activity among the hour's choices: a cover, the kind, the title,
 * who gives it, where it is — and, when the reader holds a place in it,
 * a mark they cannot miss. Nothing else: the hour shows several of
 * these side by side, and what a reader wants from the row is to tell
 * them apart, not to read each in full. The whole tile opens the
 * activity (the drawer, as before); favourite and share act on their
 * own and never open it.
 */
const ActivityTile = ({ activity, locale, slug, onOpen, registerAction, leaveAction, index = 0 }: Props) => {
  const reduce = useReducedMotion();
  const toast = useToast();
  const favorites = useFavorites();
  const fav = favorites.has(activity.id);
  const held = activity.registration === 'registered';
  const lead = activity.speakers[0];

  const open = () => onOpen(activity.id);
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  const toggleFav = () => {
    const on = favorites.toggle(activity.id);
    toast.show(on ? COPY.addedFav[locale] : COPY.removedFav[locale], 'success');
  };
  const share = async () => {
    const url = `${window.location.origin}${withBasePath(`/${locale}/events/${slug}/agenda?activity=${activity.id}`)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.show(COPY.copied[locale], 'info');
    } catch {
      toast.show(COPY.copyFailed[locale], 'warn');
    }
  };

  const iconBtn =
    'grid size-7 place-items-center rounded-lg text-[var(--x-faint)] transition-colors hover:bg-[var(--x-raise)] hover:text-[var(--x-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--x-primary)]';

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 7) * 0.03 }}
      className={`${surface} group relative flex h-full flex-col border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--x-shadow-lift)] ${
        held ? 'border-[var(--x-ok)]/45' : 'border-[var(--x-line)] hover:border-[var(--x-primary)]/25'
      }`}
    >
      {held ? (
        <span
          aria-hidden="true"
          className="absolute -top-2 end-3 z-[1] grid size-6 place-items-center rounded-full bg-[var(--x-ok)] text-white shadow-[var(--x-shadow)]"
        >
          <IconCheck className="size-3.5" />
        </span>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        aria-label={activity.title}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        }}
        className="flex flex-1 cursor-pointer flex-col rounded-[var(--x-r-card)] p-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--x-primary)] md:p-5"
      >
        {/* The kind and the title, the cover beside them at the row's end. */}
        <div className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <TypePill type={activity.type} label={activity.typeLabel} />
              <span className="-me-1 -mt-0.5 flex items-center opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  aria-label={COPY.favorite[locale]}
                  aria-pressed={fav}
                  onClick={(event) => {
                    stop(event);
                    toggleFav();
                  }}
                  className={`${iconBtn} ${fav ? 'text-[var(--x-primary)]' : ''}`}
                >
                  {fav ? <IconStarFilled className="size-3.5" /> : <IconStar className="size-3.5" />}
                </button>
                <button
                  type="button"
                  aria-label={COPY.share[locale]}
                  onClick={(event) => {
                    stop(event);
                    void share();
                  }}
                  className={iconBtn}
                >
                  <IconShare className="size-3.5" />
                </button>
              </span>
            </span>
            <h3 className="mt-2 line-clamp-3 font-display text-[17px] font-bold leading-snug tracking-tight text-[var(--x-ink)]">
              {activity.title}
            </h3>
          </span>
          <span className="block size-[76px] flex-none overflow-hidden rounded-2xl bg-[var(--x-raise)]">
            <Cover activity={activity} />
          </span>
        </div>

        {/* Who gives it — the face first, large enough to know. */}
        {lead ? (
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={lead.name} url={lead.photoUrl} size={48} ring={false} />
            <span className="min-w-0 truncate text-sm font-semibold text-[var(--x-ink)]">
              {activity.speakers.map((s) => s.name).join(', ')}
            </span>
          </div>
        ) : null}

        {/* When — the day and the hour, beside each other. */}
        {activity.time ? (
          <span className="mt-2.5 flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--x-soft)]">
            <IconCalendar className="size-4 flex-none text-[var(--x-faint)]" />
            <span className="truncate">{activity.dateShort}</span>
            <span aria-hidden="true">·</span>
            <span className="flex-none tabular-nums" dir="ltr">
              {activity.endTime ? `${activity.time}–${activity.endTime}` : activity.time}
            </span>
          </span>
        ) : null}

        {/* Where it is. */}
        {activity.place ? (
          <span className="mt-2.5 inline-flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--x-soft)]">
            <IconPin className="size-4 flex-none text-[var(--x-faint)]" />
            <span className="truncate">{activity.place}</span>
          </span>
        ) : null}

        {/* The foot: the one action — the same control, the same rules, as everywhere else. */}
        <div className="mt-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2 pt-4">
          {/* The last few seats, said once and quietly — never how many registered. */}
          {activity.status === 'almostFull' && activity.registration === 'available' ? (
            <span className="me-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--x-warn)]">
              <span className="size-2 rounded-full bg-[var(--x-warn)]" aria-hidden="true" />
              {COPY.lastSeats[locale]}
            </span>
          ) : null}
          <span className="flex-none" onClick={stop} onKeyDown={stop}>
            <RegistrationButton
              state={activity.registration}
              locale={locale}
              slug={slug}
              sessionId={activity.id}
              registerAction={registerAction}
              leaveAction={leaveAction}
              canLeave={activity.canCancel}
              note={activity.registrationNote}
              vote={activity.vote}
            />
          </span>
        </div>
      </div>
    </motion.article>
  );
};

export default ActivityTile;
