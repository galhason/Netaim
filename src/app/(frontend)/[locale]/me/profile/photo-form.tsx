'use client';

import { useRef, useState } from 'react';
import type { Locale } from '@/config/locales';
import { ImageCropper, isCroppable } from '@/shared';

/*
 * The profile photo's form: pick a file, see it in a frame, crop it to
 * the square the card draws, and only then send it. The form itself is
 * the same server action as before; the crop happens on the way in,
 * and the file that travels is the one the person approved.
 */
interface Props {
  locale: Locale;
  action: (formData: FormData) => void | Promise<void>;
  /* The Lounge's quiet button, handed down by the page: this form is a client island and does not reach into the feature. */
  buttonClass: string;
}

const COPY = {
  choose: { he: 'בחירת תמונה', en: 'Choose a photo' },
  change: { he: 'תמונה אחרת', en: 'Another photo' },
  upload: { he: 'העלאה', en: 'Upload' },
  ready: { he: 'התמונה מוכנה להעלאה.', en: 'The photo is ready to upload.' },
};

const ProfilePhotoForm = ({ locale, action, buttonClass }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [ready, setReady] = useState<{ file: File; url: string } | null>(null);

  const settle = (file: File) => {
    const input = inputRef.current;
    if (input) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    }
    if (ready) URL.revokeObjectURL(ready.url);
    setReady({ file, url: URL.createObjectURL(file) });
    setPending(null);
  };

  const onPick = (file: File | undefined) => {
    if (!file) return;
    if (isCroppable(file)) {
      setPending(file);
    } else {
      settle(file);
    }
  };

  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-4">
      <input type="hidden" name="locale" value={locale} />
      {/* The file that is sent — filled by the crop, never typed into directly. */}
      <input
        ref={inputRef}
        type="file"
        name="photo"
        accept="image/*"
        required
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      {ready ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ready.url} alt="" className="size-20 rounded-full object-cover ring-2 ring-[var(--l-line,rgba(23,32,51,0.14))]" />
      ) : null}
      <label className={`${buttonClass} cursor-pointer`}>
        {ready ? COPY.change[locale] : COPY.choose[locale]}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            onPick(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {ready ? (
        <>
          <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-[var(--l-bronze)] px-5 text-sm font-medium text-white transition-colors hover:opacity-90">
            {COPY.upload[locale]}
          </button>
          <span className="text-sm text-[var(--l-soft)]">{COPY.ready[locale]}</span>
        </>
      ) : null}
      {pending ? (
        <ImageCropper
          file={pending}
          aspect={1}
          longest={1200}
          locale={locale}
          onDone={settle}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </form>
  );
};

export default ProfilePhotoForm;
