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
  try {
    const u = new URL(trimmed);
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch (e) {
    // Not a full absolute URL — best-effort strip of ?query and #fragment.
    return trimmed.split('?')[0].split('#')[0];
  }
}

module.exports = { stripTracking };
