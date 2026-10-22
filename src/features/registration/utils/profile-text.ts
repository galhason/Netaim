import { MAX_PROFILE_LINKS, PROFILE_LIMITS } from '../constants/profile-limits';
import type { ParticipantDetailsInput } from '../types/identity';

/* Line breaks, tabs and other control characters become one space. */
const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]+/g;
/* A paragraph keeps its line breaks; every other control character goes. */
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]+/g;

/* Cut by code point, so a cut never splits an emoji or a surrogate pair. */
const cut = (text: string, max: number): string => {
  const points = Array.from(text);
  return points.length > max ? points.slice(0, max).join('').trimEnd() : text;
};

export const oneLine = (text: string, max: number): string =>
  cut(text.replace(CONTROL, ' ').replace(/ {2,}/g, ' ').trim(), max);

export const paragraph = (text: string, max: number): string =>
  cut(text.replace(/\r\n?/g, '\n').replace(CONTROL_EXCEPT_NEWLINE, ' ').trim(), max);

const lineOf = (value: string | undefined, max: number): string | undefined =>
  value === undefined ? undefined : oneLine(value, max);

const textOf = (value: string | undefined, max: number): string | undefined =>
  value === undefined ? undefined : paragraph(value, max);

/*
 * The details as they may be stored: every field within its limit, the
 * one-line fields on one line. Absent fields stay absent, so a form that
 * does not ask a question still leaves its answer alone.
 */
export const boundedDetails = (input: ParticipantDetailsInput): ParticipantDetailsInput => ({
  ...input,
  name: lineOf(input.name, PROFILE_LIMITS.name),
  phone: lineOf(input.phone, PROFILE_LIMITS.phone),
  organization: lineOf(input.organization, PROFILE_LIMITS.organization),
  role: lineOf(input.role, PROFILE_LIMITS.role),
  headline: lineOf(input.headline, PROFILE_LIMITS.headline),
  dietary: textOf(input.dietary, PROFILE_LIMITS.dietary),
  accessibility: textOf(input.accessibility, PROFILE_LIMITS.accessibility),
  interests: textOf(input.interests, PROFILE_LIMITS.interests),
  bio: textOf(input.bio, PROFILE_LIMITS.bio),
  links: input.links
    ?.slice(0, MAX_PROFILE_LINKS)
    .map((link) => ({ label: oneLine(link.label, PROFILE_LIMITS.linkLabel), url: link.url }))
    .filter((link) => link.url.length > 0 && link.url.length <= PROFILE_LIMITS.linkUrl),
});
