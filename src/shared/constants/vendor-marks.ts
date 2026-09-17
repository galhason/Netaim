/*
 * Other companies' colours, in one place.
 *
 * These are not the Netaim brand and must never be drawn from it: a
 * Google logo in navy is a wrong logo, and a WhatsApp green that drifts
 * with our palette is a trademark we have altered. They are recorded
 * here, once, with the name of the company that owns each one, so the
 * brand sheet stays the brand sheet and a search for a stray hex in a
 * component turns up nothing but this file.
 *
 * Nothing here may be used as a product colour — only to draw or label
 * the vendor it belongs to.
 */
export const VENDOR_MARKS = {
  googleBlue: '#4285F4',
  googleGreen: '#34A853',
  googleYellow: '#FBBC05',
  googleRed: '#EA4335',
  outlookBlue: '#0364B8',
  outlookBlueLight: '#28A8EA',
  outlookBlueDeep: '#0F5FA8',
  whatsappGreen: '#25D366',
  linkedinBlue: '#0A66C2',
} as const;

export type VendorMark = keyof typeof VENDOR_MARKS;
