import { getStudioLocale } from '@/features/studio';
import {
  listSponsors,
  SPONSOR_TIERS,
  SPONSOR_TIER_LABELS,
} from '@/features/sponsors';
import { addSponsorAction } from '../../../actions';

interface SponsorsPageProps {
  params: Promise<{ slug: string }>;
}

const COPY = {
  heading: { he: 'נותני חסות', en: 'Sponsors' },
  intro: {
    he: 'הארגונים התומכים באירוע, לפי רמת חסות. הסדר נקבע לפי הרמה ואז לפי מיקום.',
    en: 'The organizations supporting the event, by tier. Order follows tier, then position.',
  },
  empty: {
    he: 'עדיין אין נותני חסות. הוסיפו את הראשון.',
    en: 'No sponsors yet. Add the first one.',
  },
  add: { he: 'להוסיף נותן חסות', en: 'Add a sponsor' },
  name: { he: 'שם', en: 'Name' },
  tier: { he: 'רמה', en: 'Tier' },
  website: { he: 'אתר (רשות)', en: 'Website (optional)' },
  description: { he: 'תיאור (רשות)', en: 'Description (optional)' },
  order: { he: 'מיקום (רשות)', en: 'Position (optional)' },
  save: { he: 'להוסיף', en: 'Add' },
} as const;

const labelClass = 'text-xs tracking-widest text-text-secondary';
const fieldClass = 'border-b border-border bg-transparent py-1.5 outline-none';

const SponsorsPage = async ({ params }: SponsorsPageProps) => {
  const { slug } = await params;
  const locale = await getStudioLocale();

  const sponsors = await listSponsors(slug).catch(() => []);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-medium">
          {COPY.heading[locale]}
        </h2>
        <p className="text-sm text-text-secondary">{COPY.intro[locale]}</p>
      </div>

      {sponsors.length === 0 ? (
        <p className="max-w-md text-sm text-text-secondary">
          {COPY.empty[locale]}
        </p>
      ) : (
        <ul className="flex flex-col">
          {sponsors.map((sponsor) => (
            <li
              key={sponsor.id}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border py-4"
            >
              <span className="min-w-40 flex-1 font-medium">
                {sponsor.name}
              </span>
              <span className="text-sm text-text-secondary">
                {SPONSOR_TIER_LABELS[sponsor.tier][locale]}
              </span>
              {sponsor.website ? (
                <span className="text-sm text-text-secondary">
                  {sponsor.website}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <details className="flex flex-col gap-4 border-t border-border pt-6">
        <summary className="cursor-pointer text-xs font-medium tracking-widest text-text-secondary">
          {COPY.add[locale]}
        </summary>
        <form
          action={addSponsorAction}
          className="mt-4 flex max-w-xl flex-col gap-6"
        >
          <input type="hidden" name="slug" value={slug} />

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{COPY.name[locale]}</span>
            <input type="text" name="name" required className={fieldClass} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{COPY.tier[locale]}</span>
            <select name="tier" defaultValue="partner" className={fieldClass}>
              {SPONSOR_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {SPONSOR_TIER_LABELS[tier][locale]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{COPY.website[locale]}</span>
            <input type="url" name="website" className={fieldClass} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{COPY.description[locale]}</span>
            <textarea
              name="description"
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{COPY.order[locale]}</span>
            <input type="number" name="order" className={fieldClass} />
          </label>

          <button
            type="submit"
            className="inline-flex min-h-11 items-center self-start font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
          >
            {COPY.save[locale]}
          </button>
        </form>
      </details>
    </div>
  );
};

export default SponsorsPage;
