'use client';

import { useState } from 'react';
import type { Locale } from '@/config/locales';
import { IconStar, IconStarFilled } from '../ui/icons';
import { useToast } from '../ui/feedback';

/*
 * Follow a speaker. Today this is an intentional, local affordance — a
 * toggle with confirmation — but the seam is deliberate: a real
 * followSpeaker(participantId, speakerId) action would persist the follow
 * and, because the Registration Engine already emits domain events when a
 * session is created, a subscriber could notify followers of a speaker's
 * new activity ("Gal Hason added a new talk"). No social graph — just a
 * quiet way to keep up with the people you came to hear.
 */
const FollowButton = ({
  speakerName,
  locale,
  initialFollowing = false,
}: {
  speakerName: string;
  locale: Locale;
  initialFollowing?: boolean;
}) => {
  const he = locale === 'he';
  const toast = useToast();
  const [following, setFollowing] = useState(initialFollowing);

  const toggle = () => {
    setFollowing((v) => !v);
    toast.show(
      following
        ? he
          ? `הפסקת לעקוב אחר ${speakerName}`
          : `Unfollowed ${speakerName}`
        : he
          ? `עוקב/ת אחרי ${speakerName} — נעדכן על פעילויות חדשות`
          : `Following ${speakerName} — we’ll flag new activities`,
      'success',
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={following}
      className={`inline-flex items-center gap-2 rounded-[var(--x-r-field)] px-5 py-2.5 text-sm font-medium transition-colors ${
        following
          ? 'bg-[var(--x-primary-wash)] text-[var(--x-primary-strong)] ring-1 ring-inset ring-[var(--x-primary)]/25'
          : 'bg-[var(--x-primary)] text-white hover:bg-[var(--x-primary-strong)]'
      }`}
    >
      {following ? (
        <IconStarFilled className="size-4" />
      ) : (
        <IconStar className="size-4" />
      )}
      {following
        ? he
          ? 'עוקב/ת'
          : 'Following'
        : he
          ? 'עקוב אחר הדובר'
          : 'Follow speaker'}
    </button>
  );
};

export default FollowButton;
