# Current Phase: Content Discovery Prototyping

## Problem Statement

The current website scraping approach is **not working**:
- Extracting hallucinations instead of real events
- No access to actual social media posts/updates
- Limited to what's visible on public HTML pages
- No real event data found so far (0% success rate)

## New Goal

**Rapidly prototype and test different content discovery methods** to find real events from people we care about. Focus on data quality and iteration speed, NOT UI.

## Completed Infrastructure (Available for Testing)

✅ **Review Queue System**: Events flow into `unverified_events` table, can be approved/rejected via UI
✅ **Verification Pipeline**: 4-step validation (HTTP, content match, date, registration URL)
✅ **Database Schema**: Ready to store events from any source
✅ **API Endpoints**: Can inject events from any discovery method for testing
✅ **Regression Testing**: Endpoint to validate full extraction → review workflow

## Content Discovery Approaches to Test

### Phase 1: Search API Discovery (HIGHEST PRIORITY)

**Why**: Search engines already index event announcements, tour dates, appearances
**Test without UI**: CLI scripts that output JSON results

#### Option A: Perplexity API
- **Pros**: AI-powered search, great for natural language queries, returns structured answers
- **Cons**: Requires API key, costs per query
- **Test query**: "What events or appearances is [person] doing in 2025?"
- **Prototype**: `test-perplexity.js` - query for 1 person, output event candidates

#### Option B: OpenAI Web Search
- **Pros**: We already have API key, can use GPT-4 with search grounding
- **Cons**: May require ChatGPT Plus features or specific API access
- **Test query**: Search for "[person] events 2025" and extract structured data
- **Prototype**: `test-openai-search.js`

#### Option C: Brave Search API
- **Pros**: Privacy-focused, free tier available, direct search results
- **Cons**: Need to parse HTML from search results ourselves
- **Test query**: "[person name] tour dates 2025" or "[person name] appearances 2025"
- **Prototype**: `test-brave-search.js`

#### Option D: SerpAPI / Google Search API
- **Pros**: Access to Google search results, structured data
- **Cons**: Costs money, rate limited
- **Test query**: "[person] events" with date filters
- **Prototype**: `test-serpapi.js`

**Success metric**: Find at least 1 real verifiable event per person

---

### Phase 2: Social Media Feed Access

**Why**: Artists/performers announce events on social media first
**Test without UI**: CLI scripts that fetch and parse feeds

#### Option A: RSS Feeds
- **Pros**: Free, structured, no authentication
- **Target sites**:
  - Author blogs with RSS
  - Bandsintown RSS feeds
  - Songkick artist feeds
- **Prototype**: `test-rss-feeds.js`

#### Option B: Twitter/X API
- **Pros**: Real-time announcements, structured data
- **Cons**: Requires API access (expensive), rate limits
- **Prototype**: `test-twitter-api.js`
- **Alternative**: Use Twitter search via web scraping (unreliable)

#### Option C: Mastodon API
- **Pros**: Open API, free, many authors/artists have accounts
- **Cons**: Need to know their Mastodon handles
- **Prototype**: `test-mastodon-api.js`

#### Option D: Newsletter Parsing
- **Pros**: Authors send event announcements via email
- **Cons**: Need email integration, privacy concerns
- **Approach**: Parse forwarded newsletters for event mentions
- **Prototype**: `test-email-parsing.js`

**Success metric**: Extract 3+ real events from feeds for 1 person

---

### Phase 3: Event Platform APIs

**Why**: Centralized event databases with structured data
**Test without UI**: Direct API calls, output structured events

#### Option A: Bandsintown API
- **Pros**: Comprehensive music event database, API available
- **Cons**: Music-focused only
- **Prototype**: `test-bandsintown.js`

#### Option B: Songkick API
- **Pros**: Similar to Bandsintown, good coverage
- **Cons**: Music-focused, API access unclear
- **Prototype**: `test-songkick.js`

#### Option C: Eventbrite API
- **Pros**: Wide range of events, public API
- **Cons**: Not all events listed there
- **Prototype**: `test-eventbrite.js`

#### Option D: Seatgeek / Ticketmaster APIs
- **Pros**: Official ticketing data
- **Cons**: Commercial focus, may require partnerships
- **Prototype**: `test-ticketing-apis.js`

**Success metric**: Find 5+ verified events from platforms

---

### Phase 4: Specialized Scrapers

**Why**: Some sites have predictable structures worth targeting
**Test without UI**: Targeted scrapers for high-value sources

#### Option A: Author Tour Pages
- Many authors have dedicated "/events" or "/tour" pages
- **Prototype**: `test-author-scrapers.js`
- **Target**: Neil Gaiman's official site, other author sites

#### Option B: Venue Calendars
- Check calendars of venues known to host certain performers
- **Prototype**: `test-venue-calendars.js`

#### Option C: Festival Lineups
- Many festivals publish lineups months in advance
- **Prototype**: `test-festival-lineups.js`

**Success metric**: Extract events from 3+ different site types

---

## Testing Methodology

### CLI-First Prototyping

All prototypes should be standalone Node.js scripts:

```bash
# Example usage
node test-perplexity.js "Neil Gaiman"
# Output: JSON array of event candidates with source URLs

node test-brave-search.js "Catherynne M. Valente"
# Output: Structured events found via search

node test-rss-feeds.js "https://example.com/feed"
# Output: Events parsed from RSS feed
```

### Quality Metrics

For each approach, measure:
1. **Event count**: How many event candidates found?
2. **Precision**: What % are real, verifiable events?
3. **Recall**: Are we missing obvious events?
4. **Cost**: API cost per person per run
5. **Latency**: How long does it take?
6. **Freshness**: How current are the events?

### Integration Pattern

Once a discovery method works:
1. Create module in `/discovery` folder
2. Add route: `POST /api/test/discover-via-[method]/:personId`
3. Returns event candidates in standard format
4. Pipe through existing verification pipeline
5. Review in existing UI

---

## Implementation Plan

### Week 1: Search APIs (Fastest Path to Real Events)
- [ ] Test Perplexity API for 3 different people
- [ ] Test Brave Search API for same 3 people
- [ ] Compare results, pick best performer
- [ ] Create reusable discovery module for winner

### Week 2: Social Feeds
- [ ] Identify RSS feeds for 5 people
- [ ] Test RSS parsing
- [ ] Test Mastodon API (if people are on Mastodon)
- [ ] Measure event quality vs. search APIs

### Week 3: Event Platforms
- [ ] Sign up for Bandsintown API
- [ ] Test with musicians in database
- [ ] Evaluate coverage for authors/performers
- [ ] Build integration if coverage is good

### Week 4: Integration & Comparison
- [ ] Run all working methods on same 10 people
- [ ] Compare event counts and quality
- [ ] Calculate cost per real event found
- [ ] Pick top 2 methods to productionize

---

## Success Criteria

This phase is successful when:
- ✅ At least ONE discovery method finds real events consistently
- ✅ Precision rate >50% (at least half of candidates are real events)
- ✅ Cost per real event <$1
- ✅ Can find events for 80%+ of people in database
- ✅ Events include future dates (not past announcements)

**Current baseline**: 0 real events found from website scraping

---

## Files to Archive (Future Work)

These are complete but not current priority:
- ✅ Review Queue UI (`public/app.js` review events section)
- ✅ Verification pipeline (`extractEvents.js`)
- ✅ Regression testing (`POST /api/test/extract-regression/:id`)
- ⏸️  Auto-expiry scheduler (not needed until we have real events)
- ⏸️  UI improvements (not needed for prototyping)

---

## Next Immediate Action

**START HERE**: Test Perplexity API search discovery

1. Get Perplexity API key
2. Create `test-perplexity.js`
3. Query: "What events, appearances, or tour dates does [person] have in 2025?"
4. Parse response for event data
5. Output structured JSON
6. Manually verify 1-2 results
7. If >0 real events found → this is viable path

**Alternative if no Perplexity access**: Try Brave Search API first
