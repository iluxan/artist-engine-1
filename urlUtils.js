/**
 * URL normalization shared by the app AND the evals, so both strip trackers the
 * same way. Event URLs almost never need query params — they're overwhelmingly
 * trackers (srsltid, utm_*, fbclid, gclid, …) — so we drop the whole query and
 * fragment. If a source ever needs a query param, switch to a param allowlist here.
 */
function stripTracking(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Reject truncated display URLs (e.g. Twitter/X clips link text with an ellipsis,
  // yielding "eventbrite.com/e/becky-chambe…"). Prefer NO link over a broken one.
  if (/[…]|\.\.\./.test(trimmed)) return null;

  let u;
  try {
    u = new URL(trimmed);
  } catch (e) {
    // Not a valid absolute URL (e.g. scheme-less/partial) — don't store a broken link.
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;

  u.search = '';
  u.hash = '';
  return u.toString();
}

module.exports = { stripTracking };
