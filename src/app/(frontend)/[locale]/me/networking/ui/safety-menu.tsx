import type { Locale } from '@/config/locales';
import { blockParticipantAction, reportParticipantAction } from '../actions';

/*
 * The quiet menu. Blocking and reporting are not buttons a page should
 * shout — they sit behind one glyph, and the report asks for a reason
 * because "someone reported someone" tells the team nothing. Both
 * workflows are untouched by the redesign: the same forms, the same
 * actions, the same silence toward the other side.
 */
const SafetyMenu = ({
  locale,
  he,
  participantId,
  name,
  slug,
}: {
  locale: Locale;
  he: boolean;
  participantId: string;
  name: string;
  slug: string;
}) => (
  <details className="relative">
    <summary className="n-menu-trigger">
      ⋯
    </summary>
    <div className="n-menu-panel">
      <p className="text-xs text-[var(--n-faint)]">{name}</p>

      <form action={blockParticipantAction} className="mt-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="participantId" value={participantId} />
        <button
          type="submit"
          className="n-danger-link"
        >
          {he ? 'חסימת המשתתף' : 'Block this participant'}
        </button>
        <span className="n-sub">
          {he
            ? 'לא תראו זה את זה, ולא ניתן יהיה ליצור קשר. הוא לא יקבל על כך הודעה.'
            : 'You will not see each other and neither can make contact. They are never told.'}
        </span>
      </form>

      <details className="n-divider">
        <summary className="n-menu-heading">
          {he ? 'דיווח לצוות הכנס' : 'Report to the conference team'}
        </summary>
        <form action={reportParticipantAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="participantId" value={participantId} />
          <input type="hidden" name="slug" value={slug} />
          <label className="n-field">
            {he ? 'סיבה' : 'Reason'}
            <select
              name="reason"
              defaultValue="harassment"
              className="n-field-input"
            >
              <option value="harassment">{he ? 'הטרדה' : 'Harassment'}</option>
              <option value="spam">{he ? 'ספאם' : 'Spam'}</option>
              <option value="impersonation">
                {he ? 'התחזות' : 'Impersonation'}
              </option>
              <option value="inappropriate">
                {he ? 'תוכן לא הולם' : 'Inappropriate content'}
              </option>
              <option value="other">{he ? 'אחר' : 'Other'}</option>
            </select>
          </label>
          <label className="n-field">
            {he ? 'מה קרה (רשות)' : 'What happened (optional)'}
            <textarea
              name="details"
              rows={3}
              maxLength={1000}
              className="n-field-area"
            />
          </label>
          <label className="n-meta-line">
            <input
              type="checkbox"
              name="alsoBlock"
              defaultChecked
              className="size-4 accent-[var(--n-gold)]"
            />
            {he ? 'לחסום אותו גם' : 'Block them as well'}
          </label>
          <button
            type="submit"
            className="n-submit-dark"
          >
            {he ? 'שליחת דיווח' : 'Send report'}
          </button>
        </form>
      </details>
    </div>
  </details>
);

export default SafetyMenu;
