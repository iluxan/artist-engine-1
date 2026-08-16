# How to do evals well (hands-on, with promptfoo)

A practical guide for this project's event-extraction evals. Grounded in the cases
we actually built. Read alongside `README.md` (the mechanics) — this is the *thinking*.

Sources: Anthropic, *Demystifying evals for AI agents*; promptfoo docs; golden-set and
LLM-as-judge best-practice literature (2026). Links at the bottom.

---

## The one-sentence mental model

> An eval replaces "looks good to me" with a **fixed answer key that runs the same way
> every time.** You are not asking "is this output nice?" — you are asking "does the
> system still pass the cases I've decided are correct?"

Everything below serves that.

---

## 10 principles (each mapped to what we did)

### 1. Eval-driven development — TDD for prompts
Write the failing case *first*, then fix the prompt. When the Cory page leaked 5 other
authors' events, the right order was: (a) add the case with `expected` = only Cory's 2,
(b) watch it FAIL, (c) add `{{person}}` scoping to the prompt, (d) watch it pass.
The test is the spec.

### 2. Climb the grader ladder — cheap before expensive
| Grader | Use for | Cost | Ours |
|--------|---------|------|------|
| **Deterministic (code)** | anything objective | ~free, reproducible | `score.js` date-match |
| **LLM-as-judge** | genuinely fuzzy qualities only | $ + variance | (not yet — reserve for "venue close enough?") |
| **Human** | calibrate the judge, gold standard | slow | you, spot-checking labels |
Lean on exact checks wherever possible; reserve model grading for the fuzzy 10%.

### 3. Test both positive AND negative
One-sided sets are a top mistake. Our `expected: []` cases (fan-spam page) are as
important as the extract-these cases — they're the whole "don't extract random posts" goal.

### 4. 100% pass rate is a WARNING, not a trophy
"An eval at 100% provides no signal for improvement." When the suite is all-green (we are),
that means the cases are too easy — **add harder ones**, don't add more easy ones.

### 5. Grade the OUTPUT, not the reasoning path
Assert the events produced, never *how* the model got there. Checking specific steps is
"too rigid and results in overly brittle tests." We only score the event set. Good.

### 6. Every case has a reference solution
A known-good `expected` that a correct model hits. This proves two things at once: the
task is solvable, and the grader is wired correctly. Haiku hitting P=R=1.0 validated both.

### 7. When a case fails, read the transcript — is the MODEL wrong, or your LABEL?
Half of eval work is finding bugs in your own answer key. `score.js` prints exact
false-positives and misses so you can tell in one glance. Use `npm run eval:view`.

### 8. Mirror real inputs
The dataset should look like true production input. That's why we snapshot real pages
(via `fetch-fixture.js`, the same axios+cheerio path the app uses) instead of writing
tidy synthetic snippets. Real pages surface real failure modes (SEO spam, "you might
also like" lists) you'd never invent.

### 9. Isolate cases; freeze inputs
Each case starts from clean, frozen content — no live network, no shared state, no
"today's date" drift. Frozen fixtures = reproducible scores over time.

### 10. It's a living artifact — treat it like unit tests
Run in CI on prompt changes. Grow it from production misses. Give it an owner. A stale
eval suite is worse than none because it gives false confidence.

---

## The dataset: four buckets

Stratify the golden set (don't just pile on easy positives):

1. **Real traffic** — representative real inputs (our snapshotted pages)
2. **Adversarial / traps** — designed to fool it (fan-spam hype page → `[]`)
3. **Edge cases** — boundaries (multi-date recall, person-scoping, date-less events)
4. **Shipped-failure replays** — every bug that escaped becomes a permanent case

Start with **20–50 cases from real failures**. Size matters less than coverage;
~50 good cases already catch large regressions.

---

## LLM-as-judge: only when you must, and carefully

Extraction is mostly code-checkable, so we avoid a judge for now. When you add one
(e.g. a **groundedness** check: "is every extracted event actually supported by the
source text?"), respect its failure modes:

- **Position bias** — favors items appearing earlier.
- **Verbosity bias** — favors longer answers.
- **Self-enhancement bias** — favors outputs from the same model family.
- **Wrong-context bug** — a groundedness/hallucination judge MUST be fed the source text.
  (This is why we froze the fixtures — the judge can re-read the exact input.)
- **Always calibrate** the judge against a batch of human labels before trusting it.

In promptfoo this is an `llm-rubric` or `model-graded-closedqa` assertion with an
explicit rubric and (ideally) a strong judge model.

---

## Metrics: match them to the product need

- **Precision** is our primary metric — false positives ("crap") are the pain. Weight
  the suite and the pass bar toward precision.
- **pass@k vs pass^k**: for a user-facing feed you care about *consistency*, closer to
  `pass^k` (every run correct), not just "correct at least once." Consider running key
  cases at temperature > 0 a few times to check stability.
- **PASS = exact set match** in `score.js` (zero FP, zero FN) is deliberately strict —
  appropriate for a hand-labeled golden set.

---

## The working loop (do this every time)

```
1. Notice a failure (real, or anticipated)      ← from the app, bug tracker, or a trap you imagine
2. Snapshot the input as a fixture               ← fetch-fixture.js, or hand-capture blocked pages
3. Hand-label expected events (reference soln)   ← cross-check an authoritative source
4. Add the case → npm run eval → it FAILS (red)  ← proves the case has teeth
5. Fix the prompt (or model/params)              ← the actual improvement
6. npm run eval → green, everything else still green   ← no regression
7. Commit. When the whole suite saturates, add HARDER cases.
```

---

## Scaling past a handful of cases

- **CSV datasets**: promptfoo reads a CSV where column headers are vars and special
  `__expected` columns declare assertions inline — one `promptfoo eval` runs every row.
  This is the path to hundreds of cases without editing YAML.
- **Model bake-offs**: list multiple providers to compare cost/accuracy on the same set.
- **CI gating**: fail the build when pass rate drops below an explicit threshold on
  changes to `prompts/**` or the extractor.
- **`promptfoo generate dataset`** can expand coverage — but hand-verify generated
  labels; auto-generated answer keys are the fastest way to poison a golden set.

---

## Sources
- Anthropic — *Demystifying evals for AI agents*: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- promptfoo — assertions & datasets: https://www.promptfoo.dev/docs/configuration/datasets/
- promptfoo — hands-on validation guide: https://www.mager.co/blog/2026-02-23-promptfoo-llm-validation/
- Golden-set design (2026): https://futureagi.com/blog/llm-eval-golden-set-design-2026/
- LLM-as-judge survey (biases): https://arize.com/blog/llm-as-judge-survey-paper/
