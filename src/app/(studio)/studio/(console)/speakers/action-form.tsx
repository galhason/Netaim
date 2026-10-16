'use client';

import { useTransition, type ReactNode } from 'react';

/*
 * A form whose server action answers with where to go next, and goes
 * there. The library's actions do not redirect: a redirect thrown from an
 * action on a page that draws its own console shell was not followed by
 * the client router, so the page kept showing what it showed before the
 * save. The action names the next address instead, and this form goes
 * there — the same page, loaded fresh, now with its notice.
 */
interface Props {
  action: (formData: FormData) => Promise<string | null>;
  className?: string;
  children: ReactNode;
}

const ActionForm = ({ action, className, children }: Props) => {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className={className}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const to = await action(formData);
          /*
           * A plain navigation, not the client router: the action's own
           * answer re-renders the page it was sent from, and a router push
           * racing that render was sometimes undone by it.
           */
          if (to) {
            window.location.assign(to);
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
};

export default ActionForm;
