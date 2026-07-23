import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  body: string;
  action?: { label: string; href: string };
}

const EmptyState = ({ title, body, action }: EmptyStateProps) => (
  <div className="flex max-w-md flex-col gap-3">
    <span aria-hidden="true" className="block h-px w-16 bg-accent" />
    <h3 className="font-display text-xl font-medium">{title}</h3>
    <p className="text-sm text-text-secondary">{body}</p>
    {action ? (
      <Link
        href={action.href}
        className="inline-flex min-h-11 items-center self-start text-sm font-medium underline decoration-current/40 underline-offset-8 transition-colors hover:decoration-current"
      >
        {action.label}
      </Link>
    ) : null}
  </div>
);

export default EmptyState;
