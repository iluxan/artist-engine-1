# EVALS PLAN: Event Extraction Prompt Testing & Evaluation

## Overview
We need to systematically test and improve our event extraction prompts that will scan social media posts, blog entries, and website content to extract structured event information (name, date, location, etc.).

## Use Case
- **Input**: Prompt template + actual social media/blog content
- **Expected Output**: Extracted events in structured JSON format
- **Goal**: Run many test cases to verify extraction accuracy before deploying

---

## OPTION 1: Service Comparison

### 🥇 RECOMMENDED: Promptfoo (Open Source)
**Website**: https://www.promptfoo.dev/
**GitHub**: https://github.com/promptfoo/promptfoo

#### Pros:
- ✅ 100% open source and free
- ✅ Simple YAML-based configuration
- ✅ CLI-first, easy to integrate into workflows
- ✅ Works locally - no cloud dependency
- ✅ Supports 50+ LLM providers (OpenAI, Anthropic, etc.)
- ✅ Can integrate into CI/CD pipelines
- ✅ Has built-in assertions for JSON validation
- ✅ Matrix testing (test multiple prompts × multiple providers × multiple test cases)
- ✅ Web UI for viewing results
- ✅ Version control friendly (YAML configs)

#### Cons:
- ❌ Less sophisticated metrics than paid services
- ❌ YAML-heavy (some developers prefer code)
- ❌ No hosted platform (must run locally or self-host)

#### Pricing: FREE (open source)

#### Best For:
- Teams that want full control and local testing
- Projects with budget constraints
- Integration into existing Node.js workflows
- Event extraction use case (JSON output validation)

---

### 🥈 Braintrust (Freemium Cloud Service)
**Website**: https://www.braintrust.dev/

#### Pros:
- ✅ Generous free tier (1M trace spans/month, 10K scores/month, 5 users)
- ✅ Beautiful web UI for collaboration
- ✅ Non-technical team members can review results
- ✅ Built-in autoevals library
- ✅ Good for iteration and visual feedback
- ✅ Dataset management and versioning
- ✅ Can track experiments over time

#### Cons:
- ❌ Requires cloud account (data sent to Braintrust)
- ❌ Not fully open source
- ❌ Less popular than LangSmith (smaller community)
- ❌ Paid tier at $249/month after free tier

#### Pricing:
- **Free**: 5 users, 1M traces/month, 10K scores/month
- **Pro**: $249/month for 5 users
- **Enterprise**: Custom pricing

#### Best For:
- Teams with non-technical stakeholders
- Need for visual collaboration
- Teams comfortable with cloud services

---

### 🥉 DeepEval (Open Source, Python-focused)
**Website**: https://www.confident-ai.com/
**GitHub**: https://github.com/confident-ai/deepeval

#### Pros:
- ✅ Open source
- ✅ 60+ built-in metrics
- ✅ Code-first (Pytest-like API)
- ✅ Self-explaining metrics (tells you why score is low)
- ✅ Integrated with Confident AI platform (optional)
- ✅ Great for Python teams

#### Cons:
- ❌ Python-based (we're using Node.js)
- ❌ Would require adding Python to tech stack
- ❌ More complex setup than promptfoo

#### Pricing: FREE (open source)

#### Best For:
- Python-native teams
- Need for advanced ML metrics
- Teams wanting deep integration with evaluation platform

---

### 🔹 LangSmith (Premium, LangChain ecosystem)
**Website**: https://www.langsmith.com/

#### Pros:
- ✅ Industry-leading observability
- ✅ Deep LangChain integration
- ✅ Production monitoring + evals
- ✅ Excellent debugging tools

#### Cons:
- ❌ Expensive ($39/user/month minimum)
- ❌ Overkill for simple eval use case
- ❌ Requires LangChain integration (we're not using it)

#### Pricing: Starts at $39/user/month

#### Best For:
- LangChain-based applications
- Large teams with budget
- Production monitoring needs

---

### 🔹 Other Options
- **PromptLayer**: Similar to LangSmith, focus on prompt versioning
- **Helicone**: Open source monitoring, lightweight
- **Langfuse**: Open source observability platform
- **OpenAI Evals**: OpenAI's own eval framework (Python)

---

## OPTION 2: Standalone Setup (Recommended Approach)

### Setup Strategy: Promptfoo Standalone

#### Step 1: Install Promptfoo
```bash
npm install -g promptfoo
# OR run without installing
npx promptfoo@latest init
```

#### Step 2: Create Evals Directory Structure
```
project1/
├── evals/
│   ├── promptfooconfig.yaml       # Main config
│   ├── prompts/
│   │   ├── extract-events-v1.txt
│   │   ├── extract-events-v2.txt
│   │   └── extract-events-v3.txt
│   ├── test-cases/
│   │   ├── twitter-posts.yaml
│   │   ├── blog-posts.yaml
│   │   └── instagram-posts.yaml
│   └── expected-outputs/
│       ├── twitter-expected.json
│       └── blog-expected.json
```

#### Step 3: Sample Configuration (promptfooconfig.yaml)
```yaml
description: "Event extraction prompt evaluation"

providers:
  - openai:gpt-4o-mini
  - openai:gpt-4o

prompts:
  - file://prompts/extract-events-v1.txt
  - file://prompts/extract-events-v2.txt

tests:
  - vars:
      content: "Excited to announce I'll be at @BookExpo in NYC on Oct 15-17! Catch me at booth 234 on Saturday at 2pm for a book signing. See you there!"
    assert:
      - type: javascript
        value: |
          const events = JSON.parse(output);
          events.length === 1 &&
          events[0].name.includes('book signing') &&
          events[0].date.includes('Oct') &&
          events[0].location.includes('NYC')
      - type: contains-json
      - type: is-json

  - vars:
      content: "Just finished my new novel! Coming out next spring. Can't wait to share it with you all 📚"
    assert:
      - type: javascript
        value: JSON.parse(output).length === 0  # No event, should return empty array

  - vars:
      content: "Performing tonight at the Fillmore, 8pm! Tickets still available at the door. This is the last show of the tour!"
    assert:
      - type: javascript
        value: |
          const events = JSON.parse(output);
          events.length === 1 &&
          events[0].venue === 'Fillmore' &&
          events[0].time === '8pm'
```

#### Step 4: Create Prompt Template (prompts/extract-events-v1.txt)
```
You are an event extraction system. Analyze the following social media post or blog content and extract any upcoming events mentioned.

Return a JSON array of events. Each event should have:
- name: string (event name/type)
- date: string (date mentioned, if available)
- time: string (time, if available)
- location: string (venue, city, or location)
- venue: string (specific venue name, if available)
- url: string (ticket link or event link, if available)

If no events are found, return an empty array: []

Content to analyze:
{{content}}

Return only valid JSON, no explanation.
```

#### Step 5: Run Evaluations
```bash
cd evals
promptfoo eval
```

#### Step 6: View Results
```bash
promptfoo view
```
Opens web UI at http://localhost:15500 to see results

---

## OPTION 3: Choose Which Service

### 🎯 RECOMMENDATION: Promptfoo

**Why Promptfoo for this project:**

1. **Perfect fit for use case**: Event extraction is a structured output task (JSON), which promptfoo handles excellently with JSON assertions
2. **Budget-friendly**: Completely free, open source
3. **Node.js friendly**: Fits naturally into existing tech stack
4. **Simple to start**: Can be running in 15 minutes
5. **Version control**: YAML configs can be committed to git
6. **Local execution**: No data sent to third parties
7. **Flexible**: Can switch to Braintrust later if team wants UI

**When to reconsider:**
- If you add non-technical team members who need to review prompts → Use Braintrust
- If you adopt LangChain framework → Use LangSmith
- If you switch to Python backend → Use DeepEval

---

## OPTION 4: Integration into Main Application

### Strategy: Shared Prompts Between Evals and App

#### Approach 1: Prompt Files as Single Source of Truth

```
project1/
├── prompts/                          # SHARED DIRECTORY
│   ├── event-extraction.txt          # Master prompt template
│   └── source-discovery.txt
├── evals/
│   ├── promptfooconfig.yaml          # References ../prompts/
│   └── test-cases/
└── lib/
    └── aiEventExtraction.js          # App code reads from ../prompts/
```

**In your app (lib/aiEventExtraction.js):**
```javascript
const fs = require('fs');
const path = require('path');

const PROMPT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../prompts/event-extraction.txt'),
  'utf8'
);

async function extractEvents(content) {
  const prompt = PROMPT_TEMPLATE.replace('{{content}}', content);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

**In promptfoo config:**
```yaml
prompts:
  - file://../prompts/event-extraction.txt

tests:
  - vars:
      content: "Concert tonight at 8pm!"
```

**Benefits:**
- ✅ One prompt file used by both evals and production
- ✅ Changes to prompt are automatically tested
- ✅ Version control tracks prompt evolution
- ✅ No drift between test prompts and production prompts

---

#### Approach 2: npm Script Integration

Add to package.json:
```json
{
  "scripts": {
    "start": "node server.js",
    "test": "npm run test:unit && npm run test:evals",
    "test:unit": "jest",
    "test:evals": "cd evals && promptfoo eval",
    "test:evals:watch": "cd evals && promptfoo eval --watch",
    "evals:ui": "cd evals && promptfoo view"
  }
}
```

**Usage:**
```bash
npm run test:evals        # Run all eval tests
npm run test:evals:watch  # Re-run on file changes
npm run evals:ui          # Open web UI to view results
```

---

#### Approach 3: CI/CD Integration

**.github/workflows/evals.yml:**
```yaml
name: Prompt Evaluations

on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'evals/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g promptfoo
      - run: cd evals && promptfoo eval
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - name: Comment results on PR
        if: failure()
        run: echo "Evals failed! Check logs."
```

**Benefits:**
- ✅ Automatic testing on every prompt change
- ✅ Prevents bad prompts from reaching production
- ✅ Team visibility into prompt performance

---

#### Approach 4: Prompt Versioning in Database

For production systems, consider storing prompt versions:

```sql
CREATE TABLE prompt_versions (
  id INTEGER PRIMARY KEY,
  name TEXT,
  version TEXT,
  content TEXT,
  created_at DATETIME,
  eval_score REAL,
  is_active BOOLEAN
);
```

**Workflow:**
1. Test new prompt version in promptfoo
2. If eval score > threshold, save to DB
3. Gradually roll out to users (A/B test)
4. Monitor production performance
5. Rollback if issues detected

---

## RECOMMENDED IMPLEMENTATION PLAN

### Phase 1: Setup (1 hour)
1. ✅ Install promptfoo globally
2. ✅ Create `evals/` directory
3. ✅ Initialize with `promptfoo init`
4. ✅ Create first prompt template
5. ✅ Add 5-10 test cases (Twitter posts with known events)

### Phase 2: Build Test Suite (2-3 hours)
1. ✅ Gather real examples from Twitter, Instagram, blogs
2. ✅ Manually label expected outputs
3. ✅ Create test cases for:
   - Clear event announcements (should extract)
   - Ambiguous posts (edge cases)
   - Non-event posts (should return empty)
   - Multiple events in one post
4. ✅ Write assertions for each test case

### Phase 3: Iterate on Prompts (ongoing)
1. ✅ Run evals: `promptfoo eval`
2. ✅ Review failures in web UI
3. ✅ Adjust prompt wording
4. ✅ Re-run evals
5. ✅ Track best-performing prompt version

### Phase 4: Integrate into App (1 hour)
1. ✅ Move prompt to shared `prompts/` directory
2. ✅ Update app code to read from file
3. ✅ Add npm scripts for running evals
4. ✅ Add to CI/CD (optional)

### Phase 5: Production Monitoring (future)
1. ⏳ Log all production extractions
2. ⏳ Sample and manually review
3. ⏳ Add failed cases to eval suite
4. ⏳ Continuously improve

---

## Sample Test Cases to Start With

### Test Case 1: Clear Concert Announcement
**Input:**
```
Performing live at the Troubadour in LA this Friday, Oct 20th at 9pm!
Tickets: https://troubadour.com/events/123
```

**Expected Output:**
```json
[{
  "name": "Live performance",
  "date": "Oct 20th",
  "time": "9pm",
  "location": "LA",
  "venue": "Troubadour",
  "url": "https://troubadour.com/events/123"
}]
```

---

### Test Case 2: Book Signing Event
**Input:**
```
Join me for a book signing at Barnes & Noble Union Square, NYC on November 5th from 2-4pm.
Bring your copy of "The Night Circus" or grab one there!
```

**Expected Output:**
```json
[{
  "name": "Book signing",
  "date": "November 5th",
  "time": "2-4pm",
  "location": "NYC",
  "venue": "Barnes & Noble Union Square",
  "url": null
}]
```

---

### Test Case 3: Non-Event (False Positive Test)
**Input:**
```
Just finished recording my new album! Can't wait for you to hear it. Coming soon to all streaming platforms.
```

**Expected Output:**
```json
[]
```

---

### Test Case 4: Multiple Events
**Input:**
```
Tour dates announced!
- Oct 15: Seattle, The Showbox
- Oct 17: Portland, Crystal Ballroom
- Oct 20: SF, The Fillmore
All shows at 8pm. Link in bio for tickets!
```

**Expected Output:**
```json
[
  {
    "name": "Concert",
    "date": "Oct 15",
    "time": "8pm",
    "location": "Seattle",
    "venue": "The Showbox",
    "url": null
  },
  {
    "name": "Concert",
    "date": "Oct 17",
    "time": "8pm",
    "location": "Portland",
    "venue": "Crystal Ballroom",
    "url": null
  },
  {
    "name": "Concert",
    "date": "Oct 20",
    "time": "8pm",
    "location": "SF",
    "venue": "The Fillmore",
    "url": null
  }
]
```

---

## Cost Estimate

### Promptfoo (Local)
- **Setup**: Free
- **Ongoing**: $0.01-0.02 per eval run (OpenAI API costs)
- **100 test cases**: ~$1-2 per full evaluation
- **Monthly** (1 eval/day): ~$30-60/month

### Braintrust (Cloud)
- **Free tier**: Plenty for this use case
- **If you exceed**: $249/month

### Recommendation: Start with Promptfoo
- Zero upfront cost
- Pay only for OpenAI API calls
- Upgrade to Braintrust if team needs visual UI

---

## Next Steps

1. **Install promptfoo**: `npm install -g promptfoo`
2. **Create evals directory**: `mkdir evals && cd evals`
3. **Initialize**: `promptfoo init`
4. **Gather 10 example posts** with known events from Twitter/Instagram
5. **Create first eval suite**
6. **Run and iterate**

---

## Resources

- **Promptfoo Docs**: https://www.promptfoo.dev/docs/intro/
- **Promptfoo GitHub**: https://github.com/promptfoo/promptfoo
- **Braintrust Docs**: https://www.braintrust.dev/docs
- **DeepEval Docs**: https://docs.confident-ai.com/
- **OpenAI Evals**: https://github.com/openai/evals

---

## Questions to Consider

1. **How many test cases do we need?**
   - Start with 10-20, grow to 50-100 over time

2. **How often should we run evals?**
   - On every prompt change (manual or CI/CD)
   - Weekly to catch model drift

3. **What's our accuracy target?**
   - Start with 80% accuracy
   - Iterate to 90%+ over time

4. **Should we test multiple models?**
   - Yes! Test gpt-4o-mini vs gpt-4o
   - Compare cost vs accuracy tradeoff

5. **How do we handle edge cases?**
   - Create dedicated test cases
   - Track improvement over time
   - Consider manual review for borderline cases

---

## Conclusion

**RECOMMENDED SETUP:**
- **Service**: Promptfoo (open source, local)
- **Integration**: Shared prompt files between evals and app
- **Workflow**: Manual evals during development → CI/CD for production
- **Budget**: ~$30-60/month in OpenAI API costs

**This gives you:**
✅ Systematic prompt testing
✅ Version control for prompts
✅ Confidence in production deployments
✅ Ability to iterate quickly
✅ Protection against regression

Start simple, iterate often, and upgrade to paid services only if needed!
