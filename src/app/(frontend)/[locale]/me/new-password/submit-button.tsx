'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/*
 * One press, one request: the link is spent by the first, so the button
 * holds still while the new password is saved. The look is the page's
 * to give, so this file needs nothing from the registration feature.
 */
const SubmitButton = ({
  className,
  pendingLabel,
  children,
}: {
  className: string;
  pendingLabel: string;
  children: ReactNode;
}) => {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
};

export default SubmitButton;
