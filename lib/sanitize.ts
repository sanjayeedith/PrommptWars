/**
 * Coercion helpers for text and URIs that originate from the language model.
 *
 * Everything EVI writes into a tool-call parameter is untrusted input. It is
 * rendered as text nodes (never `dangerouslySetInnerHTML`) and any value that
 * reaches an `href` is rebuilt here from an allowlist rather than passed
 * through, so a model-authored `javascript:` payload cannot become a link.
 */

const PHONE_ALLOWED = /[^0-9+]/g;

/** Collapses arbitrary model output into bounded, control-character-free text. */
export function toPlainText(input: unknown, maxLength = 2000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Builds a `tel:` href from a phone number, or returns null if the input
 * cannot be reduced to a plausible number. Never returns a passthrough string.
 */
export function telHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(PHONE_ALLOWED, "");
  const bare = digits.startsWith("+") ? digits.slice(1) : digits;
  if (bare.length < 3 || bare.length > 15 || !/^\d+$/.test(bare)) return null;
  return `tel:${digits}`;
}

/** Builds an `sms:` href with a URI-encoded body, or null for an unusable number. */
export function smsHref(rawPhone: unknown, body: string): string | null {
  const tel = telHref(rawPhone);
  if (!tel) return null;
  return `sms:${tel.slice(4)}?&body=${encodeURIComponent(toPlainText(body, 900))}`;
}
