'use client';

import { useId, useState } from 'react';
import type { Locale } from '@/config/locales';

/*
 * A long text, folded.
 *
 * An abstract or a biography can run to several paragraphs; in a panel
 * that is read standing up, the first lines are what is wanted, and
 * the rest is one press away. Short text is printed whole, with no
 * button — a "read more" that reveals nothing is a broken promise. The
 * fold is a line count, so a reader with a narrow screen and a reader
 * with a wide one get the same number of lines, not the same number of
 * characters. The button says which way it goes and what it controls.
 */
const COPY = {
  more: { he: 'קרא עוד', en: 'Read more' },
  less: { he: 'הצג פחות', en: 'Show less' },
} as const;

/* Roughly how many characters fit the folded lines; above it, the fold is offered. */
const FOLD_THRESHOLD = 220;

interface ReadMoreProps {
  text: string;
  locale: Locale;
  lines?: 3 | 4 | 5;
  className?: string;
}

const CLAMP: Record<3 | 4 | 5, string> = {
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
};

const ReadMore = ({ text, locale, lines = 4, className = '' }: ReadMoreProps) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const foldable = text.trim().length > FOLD_THRESHOLD || text.includes('\n');
  return (
    <div>
      <p
        id={id}
        className={`${className} whitespace-pre-line ${foldable && !open ? CLAMP[lines] : ''}`}
      >
        {text}
      </p>
      {foldable ? (
        <button
          type="button"
          onClick={() => setOpen((held) => !held)}
          aria-expanded={open}
          aria-controls={id}
          className="mt-1.5 text-sm font-medium text-[var(--x-primary)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]"
        >
          {open ? COPY.less[locale] : COPY.more[locale]}
        </button>
      ) : null}
    </div>
  );
};

export default ReadMore;
