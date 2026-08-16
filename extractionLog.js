/**
 * Structured running log of every scrape + extraction, for turning real runs into
 * eval cases. Each source run appends ONE JSON line to logs/extractions.jsonl and
 * (if content was scraped) freezes the exact content to logs/scrapes/<...>.txt.
 *
 * Promote to an eval:
 *   1. copy the referenced content_file into evals/fixtures/
 *   2. copy `extracted` into evals/golden/cases.yaml as a starting `expected`,
 *      then hand-correct it (that correction is the actual labeling work).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_DIR = path.join(__dirname, 'logs');
const SCRAPE_DIR = path.join(LOG_DIR, 'scrapes');
const LOG_FILE = path.join(LOG_DIR, 'extractions.jsonl');

function slugify(s) {
  return String(s || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

/**
 * Append one extraction run to the log.
 * @param {object} entry
 * @param {string} [entry.person]        person name (for scoping + fixture naming)
 * @param {number} [entry.personId]
 * @param {number} [entry.sourceId]
 * @param {string} [entry.sourceType]
 * @param {string} [entry.url]
 * @param {number|null} [entry.httpStatus]
 * @param {string} [entry.content]       cleaned scraped text (frozen to a file)
 * @param {string} [entry.model]
 * @param {Array}  [entry.extracted]     model output events
 * @param {number} [entry.saved]         how many were saved to the review queue
 * @param {string|null} [entry.error]
 * @returns {object} the written log line
 */
function logExtractionRun(entry) {
  fs.mkdirSync(SCRAPE_DIR, { recursive: true });

  const ts = new Date().toISOString();
  let contentFile = null;
  let contentSha = null;

  if (entry.content) {
    contentSha = crypto.createHash('sha1').update(entry.content).digest('hex').slice(0, 12);
    const rel = path.join('logs', 'scrapes', `${ts.replace(/[:.]/g, '-')}-${slugify(entry.person)}-${contentSha}.txt`);
    fs.writeFileSync(path.join(__dirname, rel), entry.content);
    contentFile = rel;
  }

  const line = {
    ts,
    person: entry.person || null,
    person_id: entry.personId ?? null,
    source_id: entry.sourceId ?? null,
    source_type: entry.sourceType || null,
    url: entry.url || null,
    http_status: entry.httpStatus ?? null,
    content_chars: entry.content ? entry.content.length : 0,
    content_sha: contentSha,
    content_file: contentFile,           // snapshot -> eval fixture
    model: entry.model || null,
    extracted_count: Array.isArray(entry.extracted) ? entry.extracted.length : 0,
    extracted: entry.extracted || [],    // model output -> starting point for eval `expected`
    saved: entry.saved ?? 0,
    error: entry.error || null,
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(line) + '\n');
  return line;
}

const REPORTS_FILE = path.join(LOG_DIR, 'event-reports.jsonl');

/**
 * Log a user report of an invalid/incorrect extraction. Captures everything needed
 * to turn it into an eval correction: the extracted fields, the source, and the raw
 * original post/page text. Appends one JSON line to logs/event-reports.jsonl.
 * @param {object} event  an unverified_events row (with joins where available)
 * @param {string|null} reason  free-text note on what's wrong (optional)
 */
function logEventReport(event, reason) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const entry = {
    ts: new Date().toISOString(),
    reason: reason || null,
    event: {
      id: event.id,
      person: event.person_name || null,
      person_id: event.person_id ?? null,
      title: event.title,
      date: event.date || null,
      location: event.location || null,
      url: event.url || null,                       // extracted event page
      registration_url: event.registration_url || null,
      source_url: event.original_post_url || event.source_url || null, // where we found it
      source_type: event.source_type || null,
      original_post_text: event.original_post_text || null, // raw content -> eval fixture
      verification: {
        content_match: !!event.verification_content_match,
        date_valid: !!event.verification_date_valid,
        registration_url: !!event.verification_registration_url,
        errors: event.verification_errors || null,
      },
    },
  };
  fs.appendFileSync(REPORTS_FILE, JSON.stringify(entry) + '\n');
  return entry;
}

module.exports = { logExtractionRun, logEventReport, LOG_FILE, REPORTS_FILE, SCRAPE_DIR };
