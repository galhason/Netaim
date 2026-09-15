import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import type { OutboxMessage } from '../channel/channel';

/*
 * What an email from the platform looks like.
 *
 * Every message the platform sends already carries plain words — that
 * text is the canonical content: it is what the outbox persists, what
 * the Studio's log shows, what an organizer edits in an override, and
 * what a reader with images off or a text-only client receives. This
 * module does not replace it. It wraps it, once, at the boundary where
 * a message becomes an email, so a verification code and a conference
 * announcement arrive looking like they came from the same place.
 *
 * The HTML is deliberately old-fashioned: tables, inline styles, web-safe
 * fonts, no external stylesheet and no image. Mail clients are not
 * browsers — Outlook renders with Word's engine, Gmail strips <style>,
 * and many readers block remote images by default. A layout that needs
 * any of those to be legible is a layout that arrives broken for a
 * share of 400 people, and there is no way to tell which share.
 */

const PALETTE = {
  ground: '#f4f5fa',
  surface: '#ffffff',
  ink: '#182031',
  soft: '#5b6273',
  faint: '#8b93a3',
  line: '#e4e7f0',
  primary: '#6e56cf',
  primaryWash: '#f1eefc',
  navy: '#0e1b2e',
} as const;

const FONT_HE =
  "'Segoe UI', Arial, 'Helvetica Neue', Helvetica, sans-serif";

const FOOTER = {
  he: 'הודעה זו נשלחה בעקבות פעולה שביצעתם באתר נטעים. לשאלות אפשר להשיב להודעה זו.',
  en: 'This message was sent following an action you took on the Netaim site. You are welcome to reply to it with any question.',
} as const;

const escape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/*
 * The one number in the message, set apart. A person copying a code out
 * of a paragraph misreads it; a person copying it out of a box does not.
 * Always LTR and letter-spaced: a code is a number, and it reads the
 * same way in both languages.
 */
const highlightBlock = (code: string, label: string): string => `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 22px;">
        <tbody>
          <tr>
            <td align="center" style="background-color:${PALETTE.primaryWash};border-radius:12px;padding:20px 16px;">
              <div style="color:${PALETTE.soft};font-size:12px;letter-spacing:0.08em;margin:0 0 8px;">${escape(label)}</div>
              <div dir="ltr" style="color:${PALETTE.ink};font-size:32px;font-weight:700;letter-spacing:0.28em;text-indent:0.28em;font-family:${FONT_HE};">${escape(code)}</div>
            </td>
          </tr>
        </tbody>
      </table>`;

const ctaBlock = (label: string, href: string, align: string): string => `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
        <tbody>
          <tr>
            <td align="${align}" bgcolor="${PALETTE.primary}" style="border-radius:10px;">
              <a href="${escape(href)}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;font-family:${FONT_HE};">${escape(label)}</a>
            </td>
          </tr>
        </tbody>
      </table>`;

/*
 * The plain body, paragraph by paragraph. A blank line starts a new
 * paragraph; a line opening with a bullet becomes a list row.
 *
 * A paragraph that is nothing but the code, or nothing but the link, is
 * there for the text-only reader — in HTML it becomes the box or the
 * button, in the very place the sentence before it points to. That is
 * why the code is not appended at the end: "enter the following code"
 * has to be followed by the code, not by three more paragraphs.
 */
const paragraphs = (
  body: string,
  align: string,
  highlight?: { label: string; value: string },
  cta?: { label: string; href: string },
): { html: string; placedHighlight: boolean; placedCta: boolean } => {
  let placedHighlight = false;
  let placedCta = false;
  const html = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (highlight && block === highlight.value) {
        placedHighlight = true;
        return highlightBlock(highlight.value, highlight.label);
      }
      if (cta && block === cta.href) {
        placedCta = true;
        return ctaBlock(cta.label, cta.href, align);
      }
      const lines = block.split('\n').map((line) => line.trim());
      if (lines.every((line) => line.startsWith('•'))) {
        const items = lines
          .map(
            (line) =>
              `<tr><td style="padding:0 0 8px;color:${PALETTE.soft};font-size:15px;line-height:1.7;text-align:${align};">${escape(line)}</td></tr>`,
          )
          .join('');
        return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;"><tbody>${items}</tbody></table>`;
      }
      return `<p style="margin:0 0 18px;color:${PALETTE.soft};font-size:15px;line-height:1.75;text-align:${align};">${escape(block).replace(/\n/g, '<br />')}</p>`;
    })
    .join('');
  return { html, placedHighlight, placedCta };
};

export interface EmailLayoutInput {
  locale: string;
  subject: string;
  body: string;
  /* The one value to set apart — a verification code. */
  highlight?: { label: string; value: string };
  cta?: { label: string; href: string };
}

export const renderEmailHtml = ({
  locale,
  subject,
  body,
  highlight,
  cta,
}: EmailLayoutInput): string => {
  const lang: Locale = isSupportedLocale(locale) ? locale : 'he';
  const rtl = lang === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  const brand = brandFor(lang);
  const rendered = paragraphs(body, align, highlight, cta);

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PALETTE.ground};font-family:${FONT_HE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(subject)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${PALETTE.ground};padding:28px 12px;">
  <tbody>
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;">
          <tbody>
            <tr>
              <td style="background-color:${PALETTE.navy};border-radius:14px 14px 0 0;padding:22px 28px;text-align:${align};">
                <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:0.12em;">${escape(brand)}</div>
              </td>
            </tr>
            <tr>
              <td style="background-color:${PALETTE.surface};border-radius:0 0 14px 14px;padding:30px 28px 26px;">
                <h1 style="margin:0 0 18px;color:${PALETTE.ink};font-size:21px;font-weight:700;line-height:1.35;text-align:${align};">${escape(subject)}</h1>
                ${rendered.html}
                ${highlight && !rendered.placedHighlight ? highlightBlock(highlight.value, highlight.label) : ''}
                ${cta && !rendered.placedCta ? ctaBlock(cta.label, cta.href, align) : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 0;text-align:${align};">
                <p style="margin:0;color:${PALETTE.faint};font-size:12px;line-height:1.7;">${escape(FOOTER[lang])}</p>
                <p style="margin:10px 0 0;color:${PALETTE.faint};font-size:12px;">${escape(brand)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

/*
 * The HTML for one outgoing message. The body, the code and the button
 * all come off the message itself, so a channel needs to know nothing
 * about what kind of notification it is carrying.
 */
export const htmlFor = (message: OutboxMessage): string =>
  renderEmailHtml({
    locale: message.locale,
    subject: message.subject,
    body: message.body,
    ...(message.highlight ? { highlight: message.highlight } : {}),
    ...(message.cta ? { cta: message.cta } : {}),
  });
