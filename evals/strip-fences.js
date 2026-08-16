/**
 * Normalize model output before assertions, mirroring the app's post-processing,
 * so the eval reflects the FULL pipeline (not just raw model text):
 *   1. strip ```json ... ``` fences the model sometimes adds
 *   2. strip tracking params from each event's url (shared urlUtils.stripTracking)
 *
 * Because URL normalization runs here (not in the scorer), the eval genuinely
 * tests it: if this step breaks, a tracker leaks through and the url assertion fails.
 */
const { stripTracking } = require('../urlUtils');

module.exports = (output) => {
  const text = String(output)
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const events = JSON.parse(text);
    if (Array.isArray(events)) {
      for (const e of events) {
        if (e && typeof e === 'object') {
          if (e.url) e.url = stripTracking(e.url);
          if (e.ticket_url) e.ticket_url = stripTracking(e.ticket_url);
        }
      }
      return JSON.stringify(events);
    }
  } catch (e) {
    // Not JSON (or partial) — fall through and return the fence-stripped text.
  }
  return text;
};
