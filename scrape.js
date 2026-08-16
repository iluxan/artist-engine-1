/**
 * Page scraping — single source of truth for turning a URL into clean text.
 * Used by the app's extraction pipeline AND by evals/fetch-fixture.js, so the
 * content the model sees in production is byte-for-byte what the eval fixtures hold.
 */
const axios = require('axios');
const cheerio = require('cheerio');

const MAX_CHARS = 15000;

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Fetch a URL and return cleaned body text.
 * @returns {Promise<{status:number, content:string}>}
 * @throws  Error with `.status` set when the HTTP request fails.
 */
async function fetchAndClean(url) {
  try {
    const res = await axios.get(url, { timeout: 20000, headers: BROWSER_HEADERS });
    const $ = cheerio.load(res.data);
    $('script, style, noscript, svg').remove();

    // Preserve links INLINE so the model can attach an event to its own URL.
    // e.g. <a href="/events/x">More info</a>  ->  "More info (https://host/events/x)"
    // Without this, $('body').text() discards every href and per-event URLs are lost.
    annotateLinks($, url);

    const content = $('body').text().replace(/\s+/g, ' ').trim().substring(0, MAX_CHARS);
    return { status: res.status, content };
  } catch (err) {
    const e = new Error(err.message);
    e.status = err.response ? err.response.status : null;
    throw e;
  }
}

/** Rewrite each meaningful anchor's text to include its absolute URL, in reading order. */
function annotateLinks($, baseUrl) {
  $('a').each((i, el) => {
    const $el = $(el);
    const text = $el.text().replace(/\s+/g, ' ').trim();
    const href = $el.attr('href');
    if (!text || !href) return;
    if (/^(#|javascript:|mailto:|tel:)/i.test(href)) return;

    let abs;
    try {
      abs = new URL(href, baseUrl).href;
    } catch (e) {
      return; // unresolvable href — leave text as-is
    }
    // Skip self-referential fragment links; keep real navigation to distinct pages.
    $el.text(`${text} (${abs})`);
  });
}

module.exports = { fetchAndClean, MAX_CHARS };
