# Evals: Recommendations for Wiring Up a Real Eval System

> Supersedes the stale, OpenAI-centric `evals-plan.md` (written pre-Anthropic migration,
> Oct 2025). This doc reflects the Aug 2026 landscape and this project's actual stack
> (Node.js + Anthropic API) and actual problem (hallucinated / low-precision extraction).

## 1. Frame the problem correctly first

The complaint driving this work is **"the events are all crap"** — that is a
**precision** problem (we surface events that aren't real), not a prose-quality problem.
Event extraction is not a single pass/fail score. It is **set-matching against a labeled
answer key**, measured on four axes:

| Metric | Question | Why it matters here |
|--------|----------|---------------------|
| **Precision** | Of events we extracted, how many are real? | THE "crap" metric. Optimize this first. |
| **Recall** | Of real events, how many did we catch? | Don't silently drop real events chasing precision. |
| **Field accuracy** | For matched events, are date/venue/city right? | A real event with the wrong date is still useless. |
| **False-positive rate** | Do non-event posts return `[]`? | Dedicated suite; this is where hallucination shows up. |

**Implication:** the core scoring must be **deterministic, code-based assertions over a
golden dataset**. LLM-as-judge is a *secondary* tool, used only for fuzzy fields (e.g.
"is this venue string close enough to the expected one?"). Do not lead with LLM-as-judge —
it is slower, costs money per run, and is itself a source of noise on a task that is mostly
objectively checkable.

## 2. What changed since the old plan

- **Promptfoo was acquired by OpenAI (March 2026).** Still open-source, still fully
  supports Claude, but now OpenAI-owned and being folded into "OpenAI Frontier." Usable,
  not a blocker — but relevant since our stack is Anthropic.
- **Anthropic now ships native eval tooling** the old plan predates:
  - **Claude Console Evaluation tool** — test prompts across scenarios, 5-point grading.
  - **Published eval patterns** — deterministic graders → LLM-as-judge → human review
    queue, from *Demystifying evals for AI agents*
    (https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).
- **Structured Outputs** (guaranteed JSON-schema conformance) is available for Claude.
  This **eliminates the malformed-JSON failure class** — evals can focus on content
  correctness instead of parsing. Turn this on in the extractor before building evals.

## 3. Three ways to hook it up

### A. Homegrown harness (lightest)
An `evals/` folder with a JSON golden set + a Node script that runs the real extraction
function and diffs output against expected, computing precision/recall/F1 itself.
- **Deps:** zero. Fits the repo's existing CLI-first ethos.
- **Best at:** full control over set-matching logic; no vendor.
- **Downside:** you write (and maintain) the scoring code.

### B. Promptfoo (recommended middle)
YAML config, Node-native CLI, web UI, multi-model comparison, CI-friendly.
- **Deps:** `npx promptfoo@latest`. Supports Anthropic natively.
- **Best at:** fast prompt/model A-B comparison, regression testing, CI gating.
- **Downside:** now OpenAI-owned (see §2).

### C. Managed platform — Braintrust (heaviest)
Cloud platform: dataset versioning, collaborative UI, production monitoring.
- **Deps:** account + SDK. Free tier generous; $249/mo above it.
- **Best at:** non-dev review, logging real production extractions back into the eval set.
- **Downside:** data leaves your machine; overkill until there's real traffic.

| | A. Homegrown | B. Promptfoo | C. Braintrust |
|---|---|---|---|
| Deps | none | `npx promptfoo` | account + SDK |
| Node-native | ✅ | ✅ | ✅ |
| Multi-model compare | DIY | ✅ | ✅ |
| Web UI | ✗ | ✅ | ✅ (best) |
| Prod monitoring | ✗ | ✗ | ✅ |
| Cost | ~$0 + API | free + API | free tier → $249/mo |
| Vendor risk | none | OpenAI-owned | cloud lock-in |

## 4. Recommended path

**Use Promptfoo as the harness, but do precision-critical scoring with custom JS
assertions, and share one prompt file between evals and the app.**

1. **Turn on Claude Structured Outputs** in the extractor → removes malformed-JSON failures.
2. **Build a 20–30 case golden dataset** from *real* posts. Now that discovery is finding
   real events, label that output — it becomes the answer key. **Weight heavily toward
   non-event / false-positive cases**, since that is the current pain.
3. **Score with set-level metrics** (`type: javascript` assertions computing
   precision/recall/F1 over the event array), not `contains` string checks.
4. **Add `npm run eval`** and a CI job that runs on changes to the prompt or extractor.
5. **Keep the golden set as the durable asset.** If OpenAI ownership of promptfoo becomes a
   dealbreaker, the same dataset + assertion design drops onto path A or DeepEval with no
   rework. The harness is swappable; the labeled data is not.

### Directory shape
```
prompts/
  event-extraction.txt        # single source of truth, loaded by app AND evals
evals/
  promptfooconfig.yaml
  golden/
    events.jsonl              # {input_post, expected_events[]} — the answer key
    non-events.jsonl          # posts that MUST extract to []
  score.js                    # precision/recall/F1 set-matching used by JS assertions
```

## 5. Metric definitions (for `score.js`)

- **Match** an extracted event to an expected event when title similarity is high AND the
  date matches (normalize both first). Use a threshold, not exact string equality.
- **Precision** = matched / total_extracted.  **Recall** = matched / total_expected.
- **F1** = harmonic mean. Report all three per case and aggregated.
- **False-positive suite**: any output that is not `[]` fails outright.
- Targets to start: **precision ≥ 0.9** (crap is the enemy), recall ≥ 0.7, then iterate.

## 6. Open questions to decide

1. Golden-set size to start — 20–30 is enough to be useful; grow from real production misses.
2. Who labels the answer key — you, or a Claude pass you spot-check? (Recommend: Claude
   drafts, you spot-check, since that's fast and you already trust "proper Claude" for
   discovery.)
3. Do we want multi-model comparison (Haiku vs Sonnet) on cost/accuracy from day one?
   Promptfoo makes this a one-line matrix, so probably yes.

## Sources
- Anthropic, *Demystifying evals for AI agents* — https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Claude Docs, *Using the Evaluation Tool* — https://docs.claude.com/en/docs/test-and-evaluate/eval-tool
- Claude Docs, *Structured outputs* — https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Promptfoo Anthropic provider — https://www.promptfoo.dev/docs/providers/anthropic/
- Braintrust, *DeepEval alternatives (2026)* — https://www.braintrust.dev/articles/deepeval-alternatives-2026
- MarkTechPost, *Top LLM Observability and Evaluation Platforms in 2026* — https://www.marktechpost.com/2026/08/09/top-llm-observability-and-evaluation-platforms-in-2026-langfuse-langsmith-braintrust-arize-and-more-compared/
- DeepEval, *Top 5 LLM Evaluation Frameworks in 2026* — https://deepeval.com/blog/top-5-llm-evaluation-frameworks
