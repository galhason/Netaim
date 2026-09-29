/*
 * A name, written in the alphabet the badge is printed in.
 *
 * The conference prints badges, seats people from name cards and hands
 * the participant list to venues and hotels abroad, none of which can
 * set Hebrew. So the two name fields take the Latin alphabet and the
 * form says so before anybody types — a rule announced beside the field
 * is a rule; a rule discovered on submit is an error message.
 *
 * "Latin", not "the twenty-six letters of English": Müller, Ríos and
 * Škoda are Latin-alphabet names that belong on a badge exactly as
 * they are spelled, and an international conference that refuses them
 * has replaced one wrong answer with another. What is refused is a
 * different alphabet — Hebrew, Arabic, Cyrillic, Greek, any of the CJK
 * scripts — which is the case the rule exists for.
 *
 * Apostrophes (both kinds), hyphens, full stops and spaces pass: they
 * are parts of names, not decoration. A string with no letter in it at
 * all does not pass, so a field holding only "-" is not a name.
 */
const LATIN_ONLY = /^[\p{Script=Latin}\p{Mark}\p{Nd}'’\-. ]+$/u;
const HAS_LETTER = /\p{Script=Latin}/u;

export const isLatinName = (value: string): boolean => {
  const name = value.trim();
  return name.length > 0 && LATIN_ONLY.test(name) && HAS_LETTER.test(name);
};

/*
 * The same sentence in both places it is needed: the quiet note under
 * the pair of fields, and the refusal when somebody types anyway.
 */
export const LATIN_NAME_HINT = {
  he: 'שם באנגלית בלבד — כך הוא מודפס על התג ונמסר לבתי המלון.',
  en: 'English letters only — this is how it is printed on your badge.',
} as const;

export const LATIN_NAME_ERROR = {
  he: 'יש להזין באותיות באנגלית',
  en: 'Please use English letters',
} as const;
