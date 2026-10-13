import type { SVGProps } from 'react';
import { IconCoffee, IconGathering } from '../ui/icons';

/*
 * The one picture a plain activity carries wherever it is drawn as a
 * band — the programme, the personal schedule, the hour's own line: a
 * cup for a break, people together for a gathering. Kept in one place
 * so the two screens never disagree on what a gathering looks like.
 */
export const BandIcon = ({ type, ...props }: SVGProps<SVGSVGElement> & { type: string }) =>
  type === 'gathering' ? <IconGathering {...props} /> : <IconCoffee {...props} />;
