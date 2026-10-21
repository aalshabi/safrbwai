/**
 * Normalizes a WhatsApp number to international digits without "+"
 * (the form Wati expects), or returns null.
 *
 * Accepts Saudi mobiles in local form ("05X XXX XXXX", "5XXXXXXXX") and any
 * number written internationally ("+9665…", "009665…", "+971…"). Arabic-Indic
 * digits are converted first. A bare local number from another country is
 * rejected: without its country code it cannot be addressed.
 */
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

function toLatinDigits(value: string): string {
  return value.replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) - 0x0660) % 0x90 % 10));
}

export function normalizeWhatsAppNumber(input: string): string | null {
  const compact = toLatinDigits(input.trim()).replace(/[\s\-().]/g, "");
  let digits: string;
  if (/^\+\d+$/.test(compact)) digits = compact.slice(1);
  else if (/^00\d+$/.test(compact)) digits = compact.slice(2);
  else if (/^05\d{8}$/.test(compact)) digits = `966${compact.slice(1)}`;
  else if (/^5\d{8}$/.test(compact)) digits = `966${compact}`;
  else return null;

  // A Saudi number must be a mobile: 966 5X XXX XXXX.
  if (digits.startsWith("966")) return /^9665\d{8}$/.test(digits) ? digits : null;
  // E.164 allows up to 15 digits; shorter than 8 cannot be a full mobile number.
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
