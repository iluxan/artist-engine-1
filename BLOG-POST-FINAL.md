# Building the Perfect Machine for Processing Nothing

## How I spent a day with AI building beautiful infrastructure for fake events, and what that taught me about AI-assisted development

---

I wanted to build an event discovery agent. Something simple: track artists and writers I care about, automatically find their upcoming events, and notify me.

After a full day of AI-assisted development, I had a **complete, production-ready system** with a verification pipeline, regression testing, and a polished UI.

**Real events found: 0.**

Here's what happened, what worked, and what this reveals about building with AI coding assistants.

---

## The Problem: Garbage Events Everywhere

My previous implementation was enthusiastically extracting "events" from websites. The problem? They weren't events.

Example: Neil Gaiman's homepage has a countdown timer for "All Hallow's Read" that my system dutifully extracted as an event scheduled for January 19, 2025. Except it wasn't an event. It was a JavaScript widget.

The database was filling with:
- Countdown timers
- Promotional text
- Course offerings listed as "events"
- Hallucinated dates from random page content

I needed to **stop accumulating garbage** and start finding real events with verification.

---

## Phase 1: Building Infrastructure (What AI Does Brilliantly)

I asked Claude to build a review queue system with proper verification. In about 4 hours, here's what we built:

### The Database Layer
- New `unverified_events` table for review queue
- Added `expires_at`, `approved_at`, `verification_status` to events table
- Transaction-based functions: `createUnverifiedEvent()`, `approveEvent()`, `deleteExpiredEvents()`

### The 4-Step Verification Pipeline
1. **HTTP Check** - Does the URL return 200?
2. **AI Content Validation** - Does GPT-4 confirm the page matches the event?
3. **Date Sanity** - Is it a future date, not a countdown, within 2 years?
4. **Registration URL** - Does it have a ticket/RSVP link?

### The API Layer
```
POST /api/people/:id/extract-events - Extract from all sources
GET /api/events/unverified - Review queue
POST /api/events/unverified/:id/approve - Move to approved (7-day expiry)
DELETE /api/events/unverified/:id - Reject
```

### The Frontend UI
- "Extract Events" buttons on person pages
- "Review Events" page with verification status badges
- Approve/reject workflow
- Real-time progress tracking
- Badge showing unverified count

### Regression Testing Framework
- `POST /api/test/extract-regression/:id` endpoint
- Test results page with quality scores
- Verification breakdown (HTTP ✓2/✗0, Content ✓2/✗0, etc.)

**Total bugs encountered: 1**

It was a route ordering issue (Express matched `/api/events/:id` before `/api/events/unverified`, causing "unverified" to be parsed as an ID). Diagnosed and fixed in 5 minutes.

The system was **beautiful, comprehensive, and completely working.**

---

## The Brutal Reality Check

I ran a regression test on "Snow Raven" (a person with 3 sources):

**Results:**
- Sources processed: 3/3 ✓
- Events extracted: 2
- Events saved to review queue: 2
- **Quality Score: 0%** (0/2 fully verified)

**Verification breakdown:**
- HTTP Check: ✓ 2 / ✗ 0 (both URLs worked)
- Content Match: ✓ 2 / ✗ 0 (AI confirmed pages matched)
- **Date Valid: ✓ 0 / ✗ 2** ❌ (both had invalid dates)
- **Registration URL: ✓ 0 / ✗ 2** ❌ (neither had ticket links)

The extracted "events":
1. "Dance Beyond presents Snow Raven - Arctic Beats" - Date: **2023-12-18** (past date)
2. "Envision Festival" - Date: **2024-02-23** (past date)

Then I tested Neil Gaiman. Same story. Hallucinations everywhere.

**Success rate across all testing: 0 real events.**

My assessment in the chat logs: *"it's doing really dumb shit. it's going to the URLs for the people, and finding various hallucinations - not a single event so far."*

---

## What Went Wrong: The Core Approach Was Flawed

Here's the fundamental problem: **scraping public HTML pages doesn't give you event data.**

The AI was trying to extract events from:
- Generic bio text
- Course offerings
- Promotional language like "Upcoming Tour and LIVE Performances"
- Random dates mentioned in blog posts

Even with a sophisticated 4-step verification pipeline, we had a **100% failure rate** because we were scraping the wrong data entirely.

The verification system was catching symptoms (past dates, missing registration URLs), but it couldn't fix the cause: **we were looking in the wrong places.**

---

## AI Coding: What Worked vs. What Didn't

### ✅ AI Excelled At: Engineering Infrastructure

**Speed:** Complete system in ~4 hours
- Database schema changes
- Backend API endpoints
- Frontend UI with real-time updates
- Verification pipeline
- Regression testing framework

**Code Quality:**
- Proper error handling
- Progress indicators
- Clean separation of concerns
- Only 1 bug (quickly fixed)

**User Experience:**
- Loading states
- Verification badges
- Beautiful test results page
- Comprehensive documentation

### ❌ AI Failed At: Strategic Validation

The AI never said: *"Wait, will scraping public HTML pages actually give us event data?"*

Instead, it:
- Built exactly what I requested (even though it was fundamentally flawed)
- Created sophisticated verification to detect bad data
- Never questioned whether the approach would work

**Lesson: AI is great at "how" (implementation), weak at "what" (strategy validation).**

---

## The Pivot: Rethinking the Entire Approach

After seeing the results, I told Claude:

> "I think we need to rethink our strategy. We need: 1) maybe access to social feeds, 2) prototyping/testing with no UI, 3) switch to using search APIs (Perplexity, OpenAI, Brave, whatever)."

Within **10 minutes**, Claude:

1. **Archived completed work** - Moved `CURRENT-PHASE-PLAN.md` → `OLD-PLANS/phase-review-queue-ui.md` with status: ✅ Complete, ⏸️ Deferred

2. **Created new strategic plan** - `CURRENT-PHASE-PLAN.md` with:
   - New focus: **Content discovery prototyping, NOT UI**
   - New approach: Test different APIs via CLI scripts
   - 4 testing phases: Search APIs → Social feeds → Event platforms → Specialized scrapers

3. **Researched API options** - `DISCOVERY-API-OPTIONS.md` with:
   - Detailed breakdown of 9+ discovery options
   - Pricing, setup, pros/cons for each
   - Example curl commands
   - Recommendation: Start with Brave Search (free) + OpenAI

4. **Redefined success metrics:**
   - OLD: "Build verification system" ✓ (done but useless)
   - NEW: "Find at least 1 real verifiable event per person"
   - Precision >50%, Cost <$1 per real event

---

## Key Insights: AI as a Coding Partner

This session revealed a clear pattern in how AI coding assistants work:

### AI coding assistants are EXCELLENT at:
- 🚀 Rapid implementation of well-defined requirements
- 🏗️ Building infrastructure (databases, APIs, UI)
- 🐛 Debugging technical issues
- 📝 Documentation and planning
- 🔄 Pivoting quickly when direction changes

### AI coding assistants are WEAK at:
- 🎯 Validating if an approach will actually work
- 🔍 Recognizing when core assumptions are flawed
- 💡 Proactively suggesting "wait, this won't find real data"
- 🧪 Prototyping/testing before building full systems

### The Pattern:
1. User: "Build X"
2. AI: builds beautiful, complete X in hours
3. Reality: X doesn't solve the actual problem
4. User: "This is dumb, let's try Y instead"
5. AI: immediately pivots, builds comprehensive Y plan

---

## What We Should Have Done Differently

**What we did:**
1. Build complete review queue system
2. Build verification pipeline
3. Build polished UI
4. Discover the data source doesn't work

**What we should have done:**
1. Create `test-brave-search.js "Neil Gaiman"`
2. Run it and see: **Do we get ANY real events?**
3. IF yes → build infrastructure
4. IF no → try different approach

**Validate data sources BEFORE building pipelines.**

This is Product Development 101, but AI's incredible execution velocity makes it easy to skip.

---

## The Collaboration Pattern That Emerged

What made this session effective wasn't avoiding the mistake—it was **catching it fast** and **pivoting quickly.**

The feedback loop:
1. User provides strategic direction
2. AI implements rapidly
3. Reality provides feedback
4. User course-corrects
5. AI adapts instantly

Claude never argued or got defensive. It built exactly what I requested, and when I said "this is dumb shit," it immediately reorganized everything.

**This is the ideal human-AI workflow:**
- **Human:** Strategic direction + reality checks
- **AI:** Rapid implementation + comprehensive planning
- **Together:** Fast iteration with course correction

---

## By the Numbers

- Time spent: ~6 hours
- Features built: 15+ (database, API, UI, testing)
- Bugs encountered: 1 (route ordering)
- **Real events found: 0**
- Plans reorganized: 2 (web scraping → search APIs)
- Time to pivot: 10 minutes

---

## The Takeaway

We built a complete, production-ready event review system with verification, testing, and polished UI in record time.

**It was also completely useless** because we were scraping the wrong data.

But here's what's powerful: **We found out in hours, not weeks.** And when we pivoted, the AI reorganized the entire approach in minutes.

This is AI-assisted development at its best and worst:
- **Best:** Incredible velocity, comprehensive execution
- **Worst:** No judgment about whether we're building the right thing

### The Solution? Treat AI as a Brilliant Junior Engineer

AI coding assistants are:
- Absolutely fantastic at implementation
- Need senior oversight on strategy
- Require reality checks before diving deep

**Next time: Prototype before building. Test assumptions before implementing systems.**

But credit where due: **We failed fast**, and we're ready to try something completely different.

---

## What's Next

Current status:
- ✅ Review queue infrastructure: Complete and working
- ✅ Verification pipeline: Sophisticated (waiting for real data)
- ✅ UI: Polished and functional
- ❌ Actual event discovery: 0% success rate

Next steps:
1. Get Brave Search API key (free tier)
2. Create `test-brave-discovery.js`
3. Run: `node test-brave-discovery.js "Neil Gaiman"`
4. **Manually verify:** Are these real events?
5. IF yes → integrate with existing pipeline
6. IF no → try Perplexity API next

**Success criteria:** Find at least 1 real, verifiable event for 1 person. Then we have something worth building infrastructure around.

---

## Reflection: The Beautiful Factory With No Raw Materials

We built a beautiful machine for processing events...

...but we don't have any events to process.

Classic engineering mistake: **Build the factory before confirming we have raw materials.**

This is why "fail fast" is a product principle. AI coding tools make it easier than ever to build the wrong thing beautifully. But they also make it easier to fail fast, learn, and pivot.

The trick is remembering that **velocity isn't value.** Just because we can build something in 4 hours doesn't mean we should—especially before validating it'll work.

But when you combine AI's execution speed with human strategic oversight and rapid reality testing? That's when things get interesting.

On to the next experiment.

---

*If you're building with AI coding assistants, I'd love to hear your experiences. What patterns are you seeing? Where do they excel, where do they struggle?*

*Reply or DM me on [platform] - always happy to compare notes.*
