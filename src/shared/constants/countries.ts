import type { Locale } from '@/config/locales';

/*
 * The countries a guest can say they come from.
 *
 * ISO 3166-1 alpha-2, all 249 currently assigned codes, each with the
 * name in the two languages this site speaks. The code is what is
 * stored — names are translations and translations change, while "IL"
 * is the same row in every language and in every export a producer
 * takes out of the platform.
 *
 * The names come from the Unicode CLDR (generated once with
 * `Intl.DisplayNames`, then written down): reading them at runtime
 * would make the list depend on the ICU data of whichever machine
 * happens to render the page, and a country list that differs between
 * the server and the browser is a hydration mismatch.
 *
 * The flag is not stored and not written down either. A flag emoji is
 * simply the two letters of the code as regional indicator symbols, so
 * it is derived from the code and cannot drift away from it.
 */
export interface Country {
  /* ISO 3166-1 alpha-2, upper case. This is what is persisted. */
  code: string;
  en: string;
  he: string;
}

const TABLE: ReadonlyArray<readonly [string, string, string]> = [
  ['AD', 'Andorra', 'אנדורה'],
  ['AE', 'United Arab Emirates', 'איחוד האמירויות הערביות'],
  ['AF', 'Afghanistan', 'אפגניסטן'],
  ['AG', 'Antigua & Barbuda', 'אנטיגואה וברבודה'],
  ['AI', 'Anguilla', 'אנגווילה'],
  ['AL', 'Albania', 'אלבניה'],
  ['AM', 'Armenia', 'ארמניה'],
  ['AO', 'Angola', 'אנגולה'],
  ['AQ', 'Antarctica', 'אנטארקטיקה'],
  ['AR', 'Argentina', 'ארגנטינה'],
  ['AS', 'American Samoa', 'סמואה האמריקנית'],
  ['AT', 'Austria', 'אוסטריה'],
  ['AU', 'Australia', 'אוסטרליה'],
  ['AW', 'Aruba', 'ארובה'],
  ['AX', 'Åland Islands', 'איי אולנד'],
  ['AZ', 'Azerbaijan', 'אזרבייג׳ן'],
  ['BA', 'Bosnia & Herzegovina', 'בוסניה והרצגובינה'],
  ['BB', 'Barbados', 'ברבדוס'],
  ['BD', 'Bangladesh', 'בנגלדש'],
  ['BE', 'Belgium', 'בלגיה'],
  ['BF', 'Burkina Faso', 'בורקינה פאסו'],
  ['BG', 'Bulgaria', 'בולגריה'],
  ['BH', 'Bahrain', 'בחריין'],
  ['BI', 'Burundi', 'בורונדי'],
  ['BJ', 'Benin', 'בנין'],
  ['BL', 'St. Barthélemy', 'סנט ברתולומיאו'],
  ['BM', 'Bermuda', 'ברמודה'],
  ['BN', 'Brunei', 'ברוניי'],
  ['BO', 'Bolivia', 'בוליביה'],
  ['BQ', 'Caribbean Netherlands', 'האיים הקריביים ההולנדיים'],
  ['BR', 'Brazil', 'ברזיל'],
  ['BS', 'Bahamas', 'איי בהאמה'],
  ['BT', 'Bhutan', 'בהוטן'],
  ['BV', 'Bouvet Island', 'האי בובה'],
  ['BW', 'Botswana', 'בוטסואנה'],
  ['BY', 'Belarus', 'בלארוס'],
  ['BZ', 'Belize', 'בליז'],
  ['CA', 'Canada', 'קנדה'],
  ['CC', 'Cocos (Keeling) Islands', 'איי קוקוס (קילינג)'],
  ['CD', 'Congo - Kinshasa', 'קונגו - קינשאסה'],
  ['CF', 'Central African Republic', 'הרפובליקה המרכז-אפריקאית'],
  ['CG', 'Congo - Brazzaville', 'קונגו - ברזאויל'],
  ['CH', 'Switzerland', 'שווייץ'],
  ['CI', 'Côte d’Ivoire', 'חוף השנהב'],
  ['CK', 'Cook Islands', 'איי קוק'],
  ['CL', 'Chile', 'צ׳ילה'],
  ['CM', 'Cameroon', 'קמרון'],
  ['CN', 'China', 'סין'],
  ['CO', 'Colombia', 'קולומביה'],
  ['CR', 'Costa Rica', 'קוסטה ריקה'],
  ['CU', 'Cuba', 'קובה'],
  ['CV', 'Cape Verde', 'כף ורדה'],
  ['CW', 'Curaçao', 'קוראסאו'],
  ['CX', 'Christmas Island', 'אי חג המולד'],
  ['CY', 'Cyprus', 'קפריסין'],
  ['CZ', 'Czechia', 'צ׳כיה'],
  ['DE', 'Germany', 'גרמניה'],
  ['DJ', 'Djibouti', 'ג׳יבוטי'],
  ['DK', 'Denmark', 'דנמרק'],
  ['DM', 'Dominica', 'דומיניקה'],
  ['DO', 'Dominican Republic', 'הרפובליקה הדומיניקנית'],
  ['DZ', 'Algeria', 'אלג׳יריה'],
  ['EC', 'Ecuador', 'אקוודור'],
  ['EE', 'Estonia', 'אסטוניה'],
  ['EG', 'Egypt', 'מצרים'],
  ['EH', 'Western Sahara', 'סהרה המערבית'],
  ['ER', 'Eritrea', 'אריתריאה'],
  ['ES', 'Spain', 'ספרד'],
  ['ET', 'Ethiopia', 'אתיופיה'],
  ['FI', 'Finland', 'פינלנד'],
  ['FJ', 'Fiji', 'פיג׳י'],
  ['FK', 'Falkland Islands', 'איי פוקלנד'],
  ['FM', 'Micronesia', 'מיקרונזיה'],
  ['FO', 'Faroe Islands', 'איי פארו'],
  ['FR', 'France', 'צרפת'],
  ['GA', 'Gabon', 'גבון'],
  ['GB', 'United Kingdom', 'בריטניה'],
  ['GD', 'Grenada', 'גרנדה'],
  ['GE', 'Georgia', 'גאורגיה'],
  ['GF', 'French Guiana', 'גיאנה הצרפתית'],
  ['GG', 'Guernsey', 'גרנזי'],
  ['GH', 'Ghana', 'גאנה'],
  ['GI', 'Gibraltar', 'גיברלטר'],
  ['GL', 'Greenland', 'גרינלנד'],
  ['GM', 'Gambia', 'גמביה'],
  ['GN', 'Guinea', 'גינאה'],
  ['GP', 'Guadeloupe', 'גוואדלופ'],
  ['GQ', 'Equatorial Guinea', 'גינאה המשוונית'],
  ['GR', 'Greece', 'יוון'],
  ['GS', 'South Georgia & South Sandwich Islands', 'ג׳ורג׳יה הדרומית ואיי סנדוויץ׳ הדרומיים'],
  ['GT', 'Guatemala', 'גואטמלה'],
  ['GU', 'Guam', 'גואם'],
  ['GW', 'Guinea-Bissau', 'גינאה-ביסאו'],
  ['GY', 'Guyana', 'גיאנה'],
  ['HK', 'Hong Kong SAR China', 'הונג קונג (אזור מנהלי מיוחד של סין)'],
  ['HM', 'Heard & McDonald Islands', 'איי הרד ומקדונלד'],
  ['HN', 'Honduras', 'הונדורס'],
  ['HR', 'Croatia', 'קרואטיה'],
  ['HT', 'Haiti', 'האיטי'],
  ['HU', 'Hungary', 'הונגריה'],
  ['ID', 'Indonesia', 'אינדונזיה'],
  ['IE', 'Ireland', 'אירלנד'],
  ['IL', 'Israel', 'ישראל'],
  ['IM', 'Isle of Man', 'האי מאן'],
  ['IN', 'India', 'הודו'],
  ['IO', 'British Indian Ocean Territory', 'הטריטוריה הבריטית באוקיינוס ההודי'],
  ['IQ', 'Iraq', 'עיראק'],
  ['IR', 'Iran', 'איראן'],
  ['IS', 'Iceland', 'איסלנד'],
  ['IT', 'Italy', 'איטליה'],
  ['JE', 'Jersey', 'ג׳רזי'],
  ['JM', 'Jamaica', 'ג׳מייקה'],
  ['JO', 'Jordan', 'ירדן'],
  ['JP', 'Japan', 'יפן'],
  ['KE', 'Kenya', 'קניה'],
  ['KG', 'Kyrgyzstan', 'קירגיזסטן'],
  ['KH', 'Cambodia', 'קמבודיה'],
  ['KI', 'Kiribati', 'קיריבאטי'],
  ['KM', 'Comoros', 'קומורו'],
  ['KN', 'St. Kitts & Nevis', 'סנט קיטס ונוויס'],
  ['KP', 'North Korea', 'קוריאה הצפונית'],
  ['KR', 'South Korea', 'קוריאה הדרומית'],
  ['KW', 'Kuwait', 'כווית'],
  ['KY', 'Cayman Islands', 'איי קיימן'],
  ['KZ', 'Kazakhstan', 'קזחסטן'],
  ['LA', 'Laos', 'לאוס'],
  ['LB', 'Lebanon', 'לבנון'],
  ['LC', 'St. Lucia', 'סנט לוסיה'],
  ['LI', 'Liechtenstein', 'ליכטנשטיין'],
  ['LK', 'Sri Lanka', 'סרי לנקה'],
  ['LR', 'Liberia', 'ליבריה'],
  ['LS', 'Lesotho', 'לסוטו'],
  ['LT', 'Lithuania', 'ליטא'],
  ['LU', 'Luxembourg', 'לוקסמבורג'],
  ['LV', 'Latvia', 'לטביה'],
  ['LY', 'Libya', 'לוב'],
  ['MA', 'Morocco', 'מרוקו'],
  ['MC', 'Monaco', 'מונקו'],
  ['MD', 'Moldova', 'מולדובה'],
  ['ME', 'Montenegro', 'מונטנגרו'],
  ['MF', 'St. Martin', 'סן מרטן'],
  ['MG', 'Madagascar', 'מדגסקר'],
  ['MH', 'Marshall Islands', 'איי מרשל'],
  ['MK', 'North Macedonia', 'מקדוניה הצפונית'],
  ['ML', 'Mali', 'מאלי'],
  ['MM', 'Myanmar (Burma)', 'מיאנמר (בורמה)'],
  ['MN', 'Mongolia', 'מונגוליה'],
  ['MO', 'Macao SAR China', 'מקאו (אזור מנהלי מיוחד של סין)'],
  ['MP', 'Northern Mariana Islands', 'איי מריאנה הצפוניים'],
  ['MQ', 'Martinique', 'מרטיניק'],
  ['MR', 'Mauritania', 'מאוריטניה'],
  ['MS', 'Montserrat', 'מונסראט'],
  ['MT', 'Malta', 'מלטה'],
  ['MU', 'Mauritius', 'מאוריציוס'],
  ['MV', 'Maldives', 'האיים המלדיביים'],
  ['MW', 'Malawi', 'מלאווי'],
  ['MX', 'Mexico', 'מקסיקו'],
  ['MY', 'Malaysia', 'מלזיה'],
  ['MZ', 'Mozambique', 'מוזמביק'],
  ['NA', 'Namibia', 'נמיביה'],
  ['NC', 'New Caledonia', 'קלדוניה החדשה'],
  ['NE', 'Niger', 'ניז׳ר'],
  ['NF', 'Norfolk Island', 'האי נורפוק'],
  ['NG', 'Nigeria', 'ניגריה'],
  ['NI', 'Nicaragua', 'ניקרגואה'],
  ['NL', 'Netherlands', 'הולנד'],
  ['NO', 'Norway', 'נורווגיה'],
  ['NP', 'Nepal', 'נפאל'],
  ['NR', 'Nauru', 'נאורו'],
  ['NU', 'Niue', 'ניווה'],
  ['NZ', 'New Zealand', 'ניו זילנד'],
  ['OM', 'Oman', 'עומאן'],
  ['PA', 'Panama', 'פנמה'],
  ['PE', 'Peru', 'פרו'],
  ['PF', 'French Polynesia', 'פולינזיה הצרפתית'],
  ['PG', 'Papua New Guinea', 'פפואה גינאה החדשה'],
  ['PH', 'Philippines', 'הפיליפינים'],
  ['PK', 'Pakistan', 'פקיסטן'],
  ['PL', 'Poland', 'פולין'],
  ['PM', 'St. Pierre & Miquelon', 'סנט פייר ומיקלון'],
  ['PN', 'Pitcairn Islands', 'איי פיטקרן'],
  ['PR', 'Puerto Rico', 'פוארטו ריקו'],
  ['PS', 'Palestinian Territories', 'השטחים הפלסטיניים'],
  ['PT', 'Portugal', 'פורטוגל'],
  ['PW', 'Palau', 'פלאו'],
  ['PY', 'Paraguay', 'פרגוואי'],
  ['QA', 'Qatar', 'קטאר'],
  ['RE', 'Réunion', 'ראוניון'],
  ['RO', 'Romania', 'רומניה'],
  ['RS', 'Serbia', 'סרביה'],
  ['RU', 'Russia', 'רוסיה'],
  ['RW', 'Rwanda', 'רואנדה'],
  ['SA', 'Saudi Arabia', 'ערב הסעודית'],
  ['SB', 'Solomon Islands', 'איי שלמה'],
  ['SC', 'Seychelles', 'איי סיישל'],
  ['SD', 'Sudan', 'סודן'],
  ['SE', 'Sweden', 'שוודיה'],
  ['SG', 'Singapore', 'סינגפור'],
  ['SH', 'St. Helena', 'סנט הלנה'],
  ['SI', 'Slovenia', 'סלובניה'],
  ['SJ', 'Svalbard & Jan Mayen', 'סבאלברד ויאן מאיין'],
  ['SK', 'Slovakia', 'סלובקיה'],
  ['SL', 'Sierra Leone', 'סיירה לאון'],
  ['SM', 'San Marino', 'סן מרינו'],
  ['SN', 'Senegal', 'סנגל'],
  ['SO', 'Somalia', 'סומליה'],
  ['SR', 'Suriname', 'סורינאם'],
  ['SS', 'South Sudan', 'דרום סודן'],
  ['ST', 'São Tomé & Príncipe', 'סאו טומה ופרינסיפה'],
  ['SV', 'El Salvador', 'אל סלבדור'],
  ['SX', 'Sint Maarten', 'סנט מארטן'],
  ['SY', 'Syria', 'סוריה'],
  ['SZ', 'Eswatini', 'אסוואטיני'],
  ['TC', 'Turks & Caicos Islands', 'איי טרקס וקייקוס'],
  ['TD', 'Chad', 'צ׳אד'],
  ['TF', 'French Southern Territories', 'הטריטוריות הדרומיות של צרפת'],
  ['TG', 'Togo', 'טוגו'],
  ['TH', 'Thailand', 'תאילנד'],
  ['TJ', 'Tajikistan', 'טג׳יקיסטן'],
  ['TK', 'Tokelau', 'טוקלאו'],
  ['TL', 'Timor-Leste', 'טימור-לסטה'],
  ['TM', 'Turkmenistan', 'טורקמניסטן'],
  ['TN', 'Tunisia', 'תוניסיה'],
  ['TO', 'Tonga', 'טונגה'],
  ['TR', 'Türkiye', 'טורקיה'],
  ['TT', 'Trinidad & Tobago', 'טרינידד וטובגו'],
  ['TV', 'Tuvalu', 'טובאלו'],
  ['TW', 'Taiwan', 'טייוואן'],
  ['TZ', 'Tanzania', 'טנזניה'],
  ['UA', 'Ukraine', 'אוקראינה'],
  ['UG', 'Uganda', 'אוגנדה'],
  ['UM', 'U.S. Outlying Islands', 'האיים המרוחקים הקטנים של ארה״ב'],
  ['US', 'United States', 'ארצות הברית'],
  ['UY', 'Uruguay', 'אורוגוואי'],
  ['UZ', 'Uzbekistan', 'אוזבקיסטן'],
  ['VA', 'Vatican City', 'הוותיקן'],
  ['VC', 'St. Vincent & Grenadines', 'סנט וינסנט והגרנדינים'],
  ['VE', 'Venezuela', 'ונצואלה'],
  ['VG', 'British Virgin Islands', 'איי הבתולה הבריטיים'],
  ['VI', 'U.S. Virgin Islands', 'איי הבתולה של ארצות הברית'],
  ['VN', 'Vietnam', 'וייטנאם'],
  ['VU', 'Vanuatu', 'ונואטו'],
  ['WF', 'Wallis & Futuna', 'איי ווליס ופוטונה'],
  ['WS', 'Samoa', 'סמואה'],
  ['YE', 'Yemen', 'תימן'],
  ['YT', 'Mayotte', 'מאיוט'],
  ['ZA', 'South Africa', 'דרום אפריקה'],
  ['ZM', 'Zambia', 'זמביה'],
  ['ZW', 'Zimbabwe', 'זימבבואה'],
];

export const COUNTRIES: readonly Country[] = TABLE.map(([code, en, he]) => ({
  code,
  en,
  he,
}));

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

/*
 * Anything that arrives from a form is a string somebody could have
 * typed, so it is looked up rather than trusted. An unknown code is
 * `undefined` and every caller treats that as "no country given".
 */
export const countryByCode = (code: string | undefined | null): Country | undefined =>
  code ? BY_CODE.get(code.trim().toUpperCase()) : undefined;

export const isCountryCode = (code: string | undefined | null): boolean =>
  countryByCode(code) !== undefined;

export const countryName = (
  code: string | undefined | null,
  locale: Locale,
): string | undefined => {
  const country = countryByCode(code);
  return country ? country[locale] : undefined;
};

/*
 * The flag, derived from the code: 'IL' -> U+1F1EE U+1F1F1.
 *
 * Windows ships no glyphs for these, which is why the site carries a
 * flag font of its own (src/styles/flags.ts) and every flag is drawn
 * in it. Where the font cannot help, the pair degrades to the two
 * letters of the code — which is still the country, just spelled.
 */
const INDICATOR_BASE = 0x1f1e6;
const LETTER_A = 'A'.charCodeAt(0);

export const countryFlag = (code: string | undefined | null): string => {
  const country = countryByCode(code);
  if (!country) {
    return '';
  }
  return String.fromCodePoint(
    ...[...country.code].map(
      (letter) => INDICATOR_BASE + (letter.charCodeAt(0) - LETTER_A),
    ),
  );
};

/*
 * The list as a person reads it, ordered by their own alphabet — Hebrew
 * collates nothing like English, and a list sorted in the wrong one is
 * a list nobody can find their country in. Sorted once per language and
 * kept, because this runs on every registration page.
 */
const SORTED = new Map<Locale, readonly Country[]>();

export const countriesFor = (locale: Locale): readonly Country[] => {
  const cached = SORTED.get(locale);
  if (cached) {
    return cached;
  }
  const collator = new Intl.Collator(locale);
  const list = [...COUNTRIES].sort((a, b) =>
    collator.compare(a[locale], b[locale]),
  );
  SORTED.set(locale, list);
  return list;
};
