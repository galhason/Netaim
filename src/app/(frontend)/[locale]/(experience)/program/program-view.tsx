'use client';

import { useState } from 'react';
import type { Locale } from '@/config/locales';

export interface ProgramSessionView {
  id: string;
  time: string;
  endTime?: string;
  duration?: string;
  title: string;
  speaker?: string;
  description?: string;
  room?: string;
  typeLabel: string;
}

export interface ProgramDayView {
  key: string;
  index: number;
  label: string;
  sessions: ProgramSessionView[];
}

interface ProgramViewProps {
  days: ProgramDayView[];
  locale: Locale;
  emptyLabel: string;
  dayWord: string;
}

/*
 * The reading experience: days are chapters. Switching a day replaces
 * the session list beneath — no reload, no scroll jump — so the whole
 * program feels like turning the pages of one magazine.
 */
const ProgramView = ({ days, locale, emptyLabel, dayWord }: ProgramViewProps) => {
  const [activeKey, setActiveKey] = useState(days[0]?.key ?? '');
  const active = days.find((day) => day.key === activeKey) ?? days[0];

  if (days.length === 0) {
    return (
      <p className="rounded-2xl border cine-hair px-6 py-16 text-center text-text-secondary">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div>
      {days.length > 1 ? (
        <div className="mb-10 flex flex-wrap gap-3">
          {days.map((day) => {
            const isActive = day.key === active?.key;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setActiveKey(day.key)}
                aria-pressed={isActive}
                className={`flex flex-col items-start rounded-2xl border px-6 py-4 text-start transition-all ${
                  isActive
                    ? 'cine-card border-transparent'
                    : 'cine-hair text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
                  {dayWord} {day.index}
                </span>
                <span className="mt-1 font-display text-lg text-text-primary">
                  {day.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <ol className="flex flex-col gap-4">
        {(active?.sessions ?? []).map((session) => (
          <li
            key={session.id}
            className="cine-card cine-float group flex flex-col gap-4 rounded-3xl p-6 transition-transform md:flex-row md:gap-8 md:p-8"
          >
            <div className="flex flex-none flex-row items-baseline gap-3 md:w-32 md:flex-col md:items-start md:gap-1">
              <span className="font-display text-2xl font-bold tracking-tight text-accent">
                {session.time}
              </span>
              {session.endTime ? (
                <span className="text-sm text-text-secondary">
                  {locale === 'he' ? 'עד' : 'to'} {session.endTime}
                </span>
              ) : null}
              {session.duration ? (
                <span className="text-[11px] tracking-wide text-text-secondary/80">
                  {session.duration}
                </span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                {session.typeLabel ? (
                  <span className="rounded-full border cine-hair px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-accent">
                    {session.typeLabel}
                  </span>
                ) : null}
                {session.room ? (
                  <span className="text-xs text-text-secondary">
                    {session.room}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-text-primary md:text-2xl">
                {session.title}
              </h3>
              {session.speaker ? (
                <p className="mt-2 text-sm font-medium text-text-secondary">
                  {session.speaker}
                </p>
              ) : null}
              {session.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary/90">
                  {session.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default ProgramView;
