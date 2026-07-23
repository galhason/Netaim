/*
 * One line of the production log: something the team touched, and
 * when. The Studio narrates it — the source stays an implementation
 * detail.
 */
export interface ProductionLogEntry {
  kind: 'experience' | 'media';
  title: string;
  slug?: string;
  live: boolean;
  at: string;
}

export type ProductionLogSource = () => Promise<ProductionLogEntry[]>;
