import type { Locale } from '@/config/locales';
import type { BlockedPerson } from '@/features/networking';
import { unblockParticipantAction } from '../actions';
import { card, ghostBtn } from './shared';

/*
 * The blocked list stays a closed drawer at the very bottom: present,
 * honest about what a block does, and never in the way of the room.
 */
const BlockedSection = ({
  locale,
  he,
  num,
  blockedPeople,
}: {
  locale: Locale;
  he: boolean;
  num: (value: number) => string;
  blockedPeople: BlockedPerson[];
}) => {
  if (blockedPeople.length === 0) {
    return null;
  }
  return (
    <section className={`${card} p-5`}>
      <details>
        <summary className="cursor-pointer list-none text-sm font-medium text-[var(--n-soft)]">
          {he
            ? `חסומים (${num(blockedPeople.length)})`
            : `Blocked (${num(blockedPeople.length)})`}
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-[var(--n-faint)]">
          {he
            ? 'הם לא רואים אתכם ואינם יכולים ליצור קשר. ביטול החסימה מחזיר אתכם להיות גלויים זה לזה — אך לא מחזיר קשר שנותק.'
            : 'They cannot see you or reach you. Lifting a block makes you visible to each other again; it does not restore a connection that ended.'}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {blockedPeople.map((person) => (
            <li
              key={person.participantId}
              className="flex items-center gap-3 border-t border-[var(--n-hair)] pt-2 first:border-0 first:pt-0"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {person.name}
              </span>
              <form action={unblockParticipantAction}>
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="participantId"
                  value={person.participantId}
                />
                <button type="submit" className={ghostBtn}>
                  {he ? 'ביטול חסימה' : 'Unblock'}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
};

export default BlockedSection;
