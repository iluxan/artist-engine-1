#!/usr/bin/env node
/**
 * Snapshot a real page as an eval fixture, using the app's OWN scraper (scrape.js),
 * so eval inputs are byte-for-byte what production feeds the model (links included).
 *
 * Usage: node evals/fetch-fixture.js <url> <slug>
 * Writes: evals/fixtures/<slug>.txt   (cleaned text — becomes the model input)
 * Appends provenance to: evals/fixtures/MANIFEST.md
 */
const fs = require('fs');
const path = require('path');
const { fetchAndClean } = require('../scrape');

async function main() {
  const [url, slug] = process.argv.slice(2);
  if (!url || !slug) {
    console.error('Usage: node evals/fetch-fixture.js <url> <slug>');
    process.exit(1);
  }

  const { status, content } = await fetchAndClean(url);

  const dir = path.join(__dirname, 'fixtures');
  fs.mkdirSync(dir, { recursive: true });
  const outfile = path.join(dir, `${slug}.txt`);
  fs.writeFileSync(outfile, content);

  const manifest = path.join(dir, 'MANIFEST.md');
  const line = `- \`${slug}.txt\` — ${url} — fetched ${new Date().toISOString()} — HTTP ${status} — ${content.length} chars\n`;
  fs.appendFileSync(manifest, line);

  console.log(`✓ ${slug}.txt  (${content.length} chars, HTTP ${status}) from ${url}`);
  console.log('--- first 600 chars ---');
  console.log(content.substring(0, 600));
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
