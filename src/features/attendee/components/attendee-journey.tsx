'use client';

import { MotionConfig } from 'motion/react';
import type { Locale } from '@/config/locales';
import type { AttendeeExperienceContent } from '../types/attendee-experience';
import WelcomeScene from './welcome-scene';
import MyEventScene from './my-event-scene';
import MyDayScene from './my-day-scene';
import NetworkingScene from './networking-scene';
import EntranceScene from './entrance-scene';
import AfterScene from './after-scene';

interface AttendeeJourneyProps {
  content: AttendeeExperienceContent;
  locale: Locale;
}

const AttendeeJourney = ({ content, locale }: AttendeeJourneyProps) => (
  <MotionConfig reducedMotion="user">
    <WelcomeScene welcome={content.welcome} />
    <MyEventScene myEvent={content.myEvent} />
    <MyDayScene myDay={content.myDay} locale={locale} />
    <NetworkingScene networking={content.networking} />
    <EntranceScene entrance={content.entrance} />
    <AfterScene after={content.after} />
  </MotionConfig>
);

export default AttendeeJourney;
