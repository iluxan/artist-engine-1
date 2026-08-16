# Event pipeline — who decides what, and what's eval-covered

How a tracked person becomes events in the app, which **model/prompt** vs **plain code**
makes each decision, and where promptfoo does (and does not) test it.

## Flow

```mermaid
flowchart TD
    subgraph DISC["Source discovery (upstream, separate concern)"]
        P[People you track] --> SD["sourceDiscovery.js / aiSourceDiscovery.js"]
        SD --> SRC[(sources: candidate URLs)]
    end

    SRC --> SCR

    subgraph PIPE["Event extraction pipeline — per source URL"]
        SCR["scrape.js — CODE<br/>axios + cheerio, keep links inline<br/>login-wall shell vs full page"]
        SCR --> EXT
        EXT["Extraction — MODEL<br/>Claude Haiku + structured output json_schema<br/>PROMPT: prompts/event-extraction.txt<br/>in: person + content · out: events array<br/>title, date, venue, city, url, ticket_url"]
        EXT --> NORM["urlUtils.stripTracking — CODE<br/>drop trackers / reject truncated + broken URLs"]
        NORM --> VER
        subgraph VER["verifyEvent — 4 checks per event, SEPARATE from extraction"]
            V1["URL Works — CODE<br/>HTTP GET the url"]
            V2["Content Matches — MODEL<br/>Claude Haiku, 2nd call, ad-hoc YES/NO prompt"]
            V3["Date Valid — CODE<br/>future, under 2 years out"]
            V4["Ticket/Registration URL — CODE<br/>is ticket_url present?"]
        end
        VER --> RQ[("unverified_events<br/>= Review Events queue")]
    end

    RQ --> HUM{"Human: Approve / Reject<br/>(Review Events UI)"}
    HUM -- approve --> EV[(events table — kept forever)]
    HUM -- reject --> DEL([deleted])

    SCR -. logs .-> LOG[["logs/extractions.jsonl<br/>+ frozen content snapshots"]]
    EXT -. logs .-> LOG
    LOG -. "promote a real run" .-> GOLD[["evals/ golden set"]]

    classDef model fill:#e8ddff,stroke:#7c3aed,color:#111;
    classDef code fill:#e2f0ff,stroke:#2563eb,color:#111;
    classDef human fill:#fff3cd,stroke:#b8860b,color:#111;
    class EXT,V2 model;
    class SCR,NORM,V1,V3,V4 code;
    class HUM human;
```

**Two model calls, two prompts** — don't confuse them:
1. **Extraction** (`promptTemplate.js` → `prompts/event-extraction.txt`): content → structured events. This is the one the promptfoo golden set tests.
2. **Content-match verification** (`extractEvents.js` `validateEventContent`): a *second, separate* Haiku call with its own ad-hoc "does this page match? YES/NO" prompt. Un-eval'd today.

Everything else is plain code.

## Your question: should the verification badges go in the extraction eval JSON?

**No.** The extraction eval answers one question — *"given this content, did we pull the right
events?"* The verification badges answer a different question — *"is this extracted event real
and valid?"* — and each badge has a different grader type:

| Badge | Produced by | Grader type | Where it should be tested |
|-------|-------------|-------------|---------------------------|
| **URL Works** | `verifyEvent` HTTP GET | deterministic + network | integration test (not promptfoo) |
| **Content Matches** | 2nd Claude call (LLM-as-judge) | model | a **separate** promptfoo eval — its own prompt + labeled cases |
| **Date Valid** | code (future & <2yr) | deterministic | unit test |
| **Registration/Ticket URL** | code (is `ticket_url` set) | deterministic | unit test |

So:
- **Three of four are not model calls** — they belong in unit/integration tests, not any prompt eval.
- **One is a model call** (Content Matches). If you want to trust it, give it its *own* promptfoo
  eval with its own fixtures (event + page → should-match / should-not-match). That's the
  "evaled separately" you intuited — a different prompt is a different eval.
- **Don't merge them into the extraction JSON.** That would test the extraction prompt against
  fields it never produces.

### The clean way to improve a badge: push the fact upstream into extraction

The "No Registration URL" warning is the example. Rather than make the *verification* smarter,
we taught the *extraction* prompt to pull the "Get tickets" link into a `ticket_url` field —
which **is** eval-covered (the Carnegie Hall golden case enforces it). The badge then just
reflects `ticket_url`. General rule (same as the extract-vs-enrich split):

> If the fact is in the content, extract it in the model (and guard it in the golden set).
> If it's a deterministic check, do it in code (and guard it in a unit test).
> Only reach for an LLM-judge when the check is genuinely fuzzy — and eval that judge on its own.

## Eval coverage today

| Stage | Decider | Covered by |
|-------|---------|-----------|
| Extraction (events, URLs, ticket_url) | Haiku + `event-extraction.txt` | ✅ promptfoo golden set (`evals/`) |
| URL normalization / tracker stripping | `urlUtils.stripTracking` | ✅ via eval transform (runs the real code) |
| URL Works | code (HTTP) | ⬜ integration test — not built |
| Content Matches | Haiku (2nd, ad-hoc prompt) | ⬜ separate promptfoo eval — not built |
| Date Valid | code | ⬜ unit test — not built |
| Registration/Ticket URL present | code | ✅ indirectly — `ticket_url` is eval'd upstream |
