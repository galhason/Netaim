/*
 * The best few accounts for what was typed into the picker.
 *
 * A name that begins with the letters comes first, then a name with a
 * word that does ("Gal" finds Gal Hason and Gal Or, then Magali Hason
 * behind them), then a name that merely contains them, and last a match
 * on the organisation or the email. Case does not matter; neither does
 * the script. Only a few are offered, because a list longer than that
 * is the <select> this picker replaces.
 */
export interface SearchableAccount {
  accountId: string;
  name: string;
  company?: string;
  email?: string;
}

export const ACCOUNT_SUGGESTIONS = 8;

const fold = (value: string | undefined): string => (value ?? '').trim().toLowerCase();

const rank = (account: SearchableAccount, query: string): number => {
  const name = fold(account.name);
  if (name.startsWith(query)) return 0;
  if (name.split(/\s+/).some((word) => word.startsWith(query))) return 1;
  if (name.includes(query)) return 2;
  if (fold(account.company).includes(query) || fold(account.email).includes(query)) return 3;
  return -1;
};

export const searchAccounts = <T extends SearchableAccount>(
  accounts: readonly T[],
  typed: string,
  limit: number = ACCOUNT_SUGGESTIONS,
): T[] => {
  const query = fold(typed);
  if (!query) return [];
  return accounts
    .map((account) => ({ account, rank: rank(account, query) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.account.name.localeCompare(b.account.name))
    .slice(0, limit)
    .map((entry) => entry.account);
};
