/*
 * Who leads only panels.
 *
 * A panel — an opening, a welcome, a word of thanks — names whoever
 * leads it, and the programme prints that name on the panel's band.
 * But a person who only hosts panels is not one of the conference's
 * speakers: listing them beside the lecturers would promise a talk
 * that is not on the programme. So the speakers' pages leave out
 * everyone whose every activity is a panel. A person who hosts a panel
 * and also gives a seminar stays — the seminar is why.
 *
 * A structural type, so the rule serves the platform's sessions and the
 * public API's rows alike. Pure: the same sessions in, the same ids out.
 */
const PANEL = 'gathering';

export interface HostedSession {
  sessionType?: string | null;
  speakers?: readonly { id: string }[] | null;
}

export const panelOnlyHosts = (sessions: readonly HostedSession[]): Set<string> => {
  const panels = new Set<string>();
  const others = new Set<string>();
  for (const session of sessions) {
    const bucket = session.sessionType === PANEL ? panels : others;
    for (const speaker of session.speakers ?? []) bucket.add(speaker.id);
  }
  return new Set([...panels].filter((id) => !others.has(id)));
};
