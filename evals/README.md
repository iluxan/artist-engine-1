# Event-extraction evals (promptfoo)

Golden-set evaluation for the event-extraction prompt. Real pages are snapshotted
as frozen **fixtures** (the model INPUT); we hand-label the **expected** events
(the answer key); `score.js` compares extracted vs expected with precision/recall.

The point: **train the prompt to extract only real events, not random posts** — by
punishing hallucinations (false positives) and misses (false negatives) on real content.

## Requirements

Uses Node **22.23.2** (see `../.nvmrc`) — promptfoo needs ≥22.22, the app's default
22.11 is too old. In this repo run `nvm use` first.

```bash
nvm use                 # picks up .nvmrc -> 22.23.2
npm run eval            # run the golden set
npm run eval:view       # open the web UI (http://localhost:15500)
npm run eval:watch      # re-run on file changes
```

## Layout

```
prompts/event-extraction.txt   # THE prompt (shared with the app; vars: {{person}}, {{content}})
evals/
  promptfooconfig.yaml         # provider (Claude Haiku), transform, points at golden/cases.yaml
  golden/cases.yaml            # inputs (person + fixture) + hand-labeled expected events
  fixtures/*.txt               # frozen real page text (the model INPUT)
  fixtures/MANIFEST.md         # provenance: which URL each fixture came from + when
  score.js                     # precision/recall/F1 set-match; PASS = exact set match
  strip-fences.js              # normalizes ```json fences before assertions (as the app does)
  fetch-fixture.js             # helper: snapshot a URL as a fixture (axios+cheerio, like the app)
```

## How to add a new real event to the library

1. **Snapshot the real page** the way the app scrapes it:
   ```bash
   node evals/fetch-fixture.js "https://example.com/tour" some-slug
   ```
   For pages that hard-block scrapers (Songkick 406, Bandsintown 403), capture the
   visible text by hand into `evals/fixtures/some-slug.txt` and note the source in
   `fixtures/MANIFEST.md`.

2. **Read the fixture** and hand-label what a correct extraction should return.
   Cross-check dates/venues against an authoritative source (Songkick/Bandsintown/
   the official page).

3. **Add a case** to `golden/cases.yaml`:
   ```yaml
   - description: "Person @ Place — what this case tests"
     vars:
       person: "Person Name"
       content: file://fixtures/some-slug.txt
       expected:
         - { title: "...", date: "YYYY-MM-DD", venue: "...", city: "..." }
     assert:
       - type: is-json
       - type: javascript
         value: file://score.js
   ```
   For a **negative** case (page has no real events for this person), set `expected: []`.

4. `npm run eval` and check the score. Failures print the exact false-positives and
   misses so you can see whether the prompt or the label is wrong.

## Case-design guidance

Weight the set toward the hard cases, because those are where extraction fails:
- **Negatives / traps** — hype pages, "coming soon", non-event posts → `expected: []`
- **Scoping** — pages listing OTHER people's events ("you might also like") → extract only the tracked person's
- **Recall** — one page, many dates → catch them all
- **Grounding** — never invent a date/venue not in the text

## Scoring model

`score.js` matches on **date** (objective) with a fuzzy venue/city check, then:
- **precision** = matched / extracted (junk lowers it)
- **recall** = matched / expected (misses lower it)
- **PASS** = zero false-positives AND zero misses (exact set match)

Negative cases pass only when the model returns `[]`.
