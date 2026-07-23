import { getStudioLocale } from '@/features/studio';
import {
  listNotifications,
  NOTIFICATION_TYPE_LABELS,
  DELIVERY_STATUS_LABELS,
} from '@/features/notifications';

interface NotificationsPageProps {
  params: Promise<{ slug: string }>;
}

const COPY = {
  heading: { he: 'הודעות', en: 'Messages' },
  intro: {
    he: 'כל ההודעות שהמערכת שלחה למשתתפים — אישורים, קידום מרשימת המתנה וקישורי כניסה.',
    en: 'Every message the system sent to participants — confirmations, waitlist promotions and sign-in links.',
  },
  empty: {
    he: 'עדיין לא נשלחו הודעות. הן יופיעו כאן אוטומטית עם כל הרשמה ואישור.',
    en: 'No messages yet. They appear here automatically with each registration and approval.',
  },
  noRecipient: { he: 'ללא נמען', en: 'No recipient' },
} as const;

const dateLabel = (iso?: string): string => {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed)
    ? ''
    : new Date(parsed).toISOString().slice(0, 16).replace('T', ' ');
};

const statusClass = (status: string): string => {
  if (status === 'failed') {
    return 'text-accent';
  }
  if (status === 'sent') {
    return 'text-text-primary';
  }
  return 'text-text-secondary';
};

const NotificationsPage = async ({ params }: NotificationsPageProps) => {
  const { slug } = await params;
  const locale = await getStudioLocale();

  const notifications = await listNotifications(slug).catch(() => []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-medium">
          {COPY.heading[locale]}
        </h2>
        <p className="text-sm text-text-secondary">{COPY.intro[locale]}</p>
      </div>

      {notifications.length === 0 ? (
        <p className="max-w-md text-sm text-text-secondary">
          {COPY.empty[locale]}
        </p>
      ) : (
        <ul className="flex flex-col">
          {notifications.map((notification) => {
            const typeLabel = NOTIFICATION_TYPE_LABELS[notification.type] ?? {
              he: notification.type,
              en: notification.type,
            };
            const statusLabel = DELIVERY_STATUS_LABELS[notification.status] ?? {
              he: notification.status,
              en: notification.status,
            };
            return (
              <li
                key={notification.id}
                className="flex flex-col gap-1 border-t border-border py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <span className="font-medium">{typeLabel[locale]}</span>
                  <span
                    className={`text-sm ${statusClass(notification.status)}`}
                  >
                    {statusLabel[locale]}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-4 text-sm text-text-secondary">
                  <span>{notification.recipient ?? COPY.noRecipient[locale]}</span>
                  {notification.subject ? (
                    <span>· {notification.subject}</span>
                  ) : null}
                </div>
                {notification.createdAt ? (
                  <span className="text-xs tabular-nums text-text-secondary">
                    {dateLabel(notification.createdAt)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPage;
