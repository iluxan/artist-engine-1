/**
 * Golden-set scorer for event extraction.
 *
 * Compares the model's extracted events against the hand-labeled `expected`
 * events for this case (context.vars.expected), using DATE as the anchor for
 * matching (dates are objective; venue/city strings vary in wording).
 *
 * Reports precision / recall / F1 and lists the specific false-positives and
 * misses so failures are debuggable in the promptfoo web UI.
 *
 * PASS = exact set match (no hallucinated events, none missed).
 *   - This is what enforces "only extract real events, not random posts."
 */

function stripFences(s) {
  return String(s).replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
}

function isoDate(d) {
  if (!d) return null;
  const m = String(d).match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// An extracted event matches an expected one if the dates match AND (when both
// sides supply a venue or city) at least one of venue/city is a fuzzy match.
function eventsMatch(got, exp) {
  const gd = isoDate(got.date);
  const ed = isoDate(exp.date);
  if (ed) {
    if (gd !== ed) return false;
  } else {
    // Expected has no date: fall back to title match.
    if (!norm(got.title).includes(norm(exp.title)) && !norm(exp.title).includes(norm(got.title))) {
      return false;
    }
  }
  // If expected pins a venue or city, require loose agreement on one of them.
  const wants = [norm(exp.venue), norm(exp.city)].filter(Boolean);
  if (wants.length === 0) return true;
  const haystack = norm(`${got.venue} ${got.city} ${got.title}`);
  return wants.some(w => haystack.includes(w) || w.includes(haystack.split(' ')[0] || '###'));
}

module.exports = (output, context) => {
  const expected = (context && context.vars && context.vars.expected) || [];

  let got;
  try {
    got = JSON.parse(stripFences(output));
  } catch (e) {
    return { pass: false, score: 0, reason: `Output is not valid JSON: ${e.message}` };
  }
  if (!Array.isArray(got)) {
    return { pass: false, score: 0, reason: 'Output is not a JSON array' };
  }

  // Negative case: nothing should be extracted.
  if (expected.length === 0) {
    if (got.length === 0) {
      return { pass: true, score: 1, reason: 'Correctly extracted no events ([])' };
    }
    return {
      pass: false,
      score: 0,
      reason: `Hallucinated ${got.length} event(s) from a page with none: ` +
        got.map(e => `"${e.title}" (${e.date || 'no date'})`).join('; '),
    };
  }

  const matchedExp = new Set();
  const matchedGot = new Set();
  const pairs = []; // [{exp, got}] for matched pairs, to check field-level correctness
  expected.forEach((exp, ei) => {
    got.forEach((g, gi) => {
      if (matchedGot.has(gi)) return;
      if (eventsMatch(g, exp)) { matchedExp.add(ei); matchedGot.add(gi); pairs.push({ exp, got: g }); }
    });
  });

  const tp = matchedExp.size;
  const fp = got.length - matchedGot.size;      // extracted but not expected (junk / other people)
  const fn = expected.length - matchedExp.size; // real events we missed

  // Field-level check for URL fields: when a label specifies one (a string to require,
  // or null to require ABSENCE — the "prefer null over a broken link" rule), enforce it.
  // Labels that omit a field entirely are treated as "don't care".
  const normUrl = u => String(u || '').trim().replace(/\/+$/, '').toLowerCase();
  const urlErrors = [];
  for (const p of pairs) {
    for (const field of ['url', 'ticket_url']) {
      if (Object.prototype.hasOwnProperty.call(p.exp, field) &&
          normUrl(p.got[field]) !== normUrl(p.exp[field])) {
        urlErrors.push(
          `"${p.exp.title}" expected ${field} ${p.exp[field] === null ? 'null' : p.exp[field]} but got ${p.got[field] || 'null'}`
        );
      }
    }
  }

  // Explicit DATE check: catch "same event, wrong date" (e.g. year 2024 instead of
  // 2026) so it shows up as a DATE ERROR instead of a confusing false-positive + miss.
  const looseSame = (a, b) => {
    const at = norm(a.title), bt = norm(b.title), av = norm(a.venue), bv = norm(b.venue);
    return (at && bt && (at.includes(bt) || bt.includes(at))) ||
           (av && bv && (av.includes(bv) || bv.includes(av)));
  };
  const dateErrors = [];
  const exUnmatched = expected.filter((_, i) => !matchedExp.has(i));
  const goUnmatched = got.filter((_, i) => !matchedGot.has(i));
  for (const exp of exUnmatched) {
    for (const g of goUnmatched) {
      if (looseSame(exp, g) && isoDate(exp.date) !== isoDate(g.date)) {
        dateErrors.push(`"${exp.title}" expected date ${exp.date} but got ${g.date || 'null'}`);
      }
    }
  }

  const precision = got.length ? tp / (tp + fp) : (expected.length ? 0 : 1);
  const recall = expected.length ? tp / (tp + fn) : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  const missed = exUnmatched.map(e => `"${e.title}" (${e.date})`);
  const junk = goUnmatched.map(e => `"${e.title}" (${e.date || 'no date'})`);

  const pass = fp === 0 && fn === 0 && urlErrors.length === 0;

  // Dimension-explicit reason so each check (date, grounding, url, recall) is VISIBLE
  // in the promptfoo output — not just an aggregate F1.
  const dateNote = dateErrors.length ? `✗ DATE: ${dateErrors.join('; ')}` : '✓ dates';
  const groundNote = fp === 0 ? '✓ grounded' : `✗ HALLUCINATED: ${junk.join('; ')}`;
  const urlNote = urlErrors.length ? `✗ URLs: ${urlErrors.join('; ')}` : '✓ urls';
  const recallNote = fn === 0 ? '✓ recall' : `✗ MISSED: ${missed.join('; ')}`;
  const reason =
    `matched ${tp}/${expected.length} · P=${precision.toFixed(2)} R=${recall.toFixed(2)} F1=${f1.toFixed(2)}` +
    ` | ${dateNote} | ${groundNote} | ${urlNote} | ${recallNote}`;

  return { pass, score: f1, reason };
};
