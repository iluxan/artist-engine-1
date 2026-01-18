# Content Discovery API Options - Quick Reference

## Immediate Testing Priority

### 1. Perplexity API ⭐ RECOMMENDED START
**Why**: AI-powered search specifically designed for factual queries
- **URL**: https://docs.perplexity.ai/
- **Pricing**: $5/1000 requests (sonar-pro model)
- **Rate Limits**: Generous for testing
- **Setup**: Get API key from https://www.perplexity.ai/settings/api
- **Query format**: "What events, tour dates, or public appearances does [person name] have scheduled in 2025?"
- **Expected response**: Natural language answer + sources
- **Pro**: Returns structured, current information with citations
- **Con**: Costs money (but cheap for testing)

**Test command**:
```bash
curl https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar-pro",
    "messages": [{"role": "user", "content": "What events or appearances does Neil Gaiman have in 2025?"}]
  }'
```

---

### 2. Brave Search API ⭐ GOOD ALTERNATIVE
**Why**: Privacy-focused search with generous free tier
- **URL**: https://brave.com/search/api/
- **Pricing**: FREE tier: 2000 queries/month, then $5/1000
- **Rate Limits**: 1 req/second on free tier
- **Setup**: Get API key from https://brave.com/search/api/
- **Query format**: "[person name] events 2025" or "[person name] tour dates"
- **Expected response**: Search results with URLs, snippets
- **Pro**: Free tier good for testing, fast responses
- **Con**: Still need to parse results ourselves

**Test command**:
```bash
curl "https://api.search.brave.com/res/v1/web/search?q=Neil+Gaiman+events+2025" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: $BRAVE_API_KEY"
```

---

### 3. OpenAI Search (GPT-4 with Browsing)
**Why**: We already have OpenAI API access
- **URL**: https://platform.openai.com/docs/
- **Pricing**: We already have credits
- **Model**: Use `gpt-4-turbo` with search tools
- **Query**: Let GPT search the web for event information
- **Pro**: Already integrated, no new API keys needed
- **Con**: Search capability may be limited/experimental

**Test approach**:
```javascript
const completion = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [
    {
      role: "user",
      content: "Search the web for upcoming events, tour dates, or appearances for Neil Gaiman in 2025. Return structured data with event name, date, location, and source URL."
    }
  ]
});
```

---

## Social Media APIs

### 4. Mastodon API 🆓 FREE & OPEN
**Why**: Many authors/creators have Mastodon accounts, open API
- **URL**: https://docs.joinmastodon.org/api/
- **Pricing**: FREE
- **Setup**: No API key needed for public data
- **Example**: Neil Gaiman is on https://mastodon.social/@neilhimself
- **Pro**: Free, open, many creators migrated from Twitter
- **Con**: Need to know Mastodon handles first

**Test command**:
```bash
curl https://mastodon.social/api/v1/accounts/109304486607717169/statuses?limit=40
```

### 5. Twitter/X API v2
**Why**: Many announcements happen on Twitter first
- **URL**: https://developer.twitter.com/en/docs/twitter-api
- **Pricing**: FREE tier very limited, $100/month for real usage
- **Pro**: Rich event announcement data
- **Con**: Expensive, complicated auth, Elon

**Alternative**: Consider NOT using Twitter API due to cost

---

## Event Platform APIs

### 6. Bandsintown API 🎵 MUSIC EVENTS
**Why**: Comprehensive database of music events
- **URL**: https://www.bandsintown.com/api/overview
- **Pricing**: FREE for non-commercial use
- **Setup**: Request API key via form
- **Best for**: Musicians, DJs, bands
- **Pro**: Excellent coverage for music events
- **Con**: Limited to music/concerts

**Test command**:
```bash
curl "https://rest.bandsintown.com/artists/Taylor%20Swift/events?app_id=YOUR_APP_ID"
```

### 7. Songkick API 🎵 MUSIC EVENTS
**Why**: Similar to Bandsintown
- **URL**: https://www.songkick.com/developer
- **Pricing**: FREE tier available
- **Pro**: Good music event coverage
- **Con**: API access may require approval

### 8. Eventbrite API 🎟️ GENERAL EVENTS
**Why**: Wide variety of events, not just music
- **URL**: https://www.eventbrite.com/platform/api
- **Pricing**: FREE for reading public event data
- **Setup**: OAuth for private data, simple token for public
- **Best for**: Workshops, talks, book signings
- **Pro**: Diverse event types
- **Con**: Not all events are on Eventbrite

---

## RSS/Feed Options

### 9. RSS Feed Parsing 🆓 FREE
**Why**: Many blogs/sites still publish RSS feeds
- **Library**: `rss-parser` (already can install via npm)
- **Pricing**: FREE
- **Example sources**:
  - Author blogs: `https://journal.neilgaiman.com/feed`
  - Substack newsletters: `https://[author].substack.com/feed`
  - WordPress blogs: `https://blog.example.com/feed`
- **Pro**: Free, structured data, easy to parse
- **Con**: Not all sites have RSS, need to discover feeds first

**Test command**:
```bash
npm install rss-parser
node test-rss.js https://journal.neilgaiman.com/feed
```

---

## Recommendation for First Prototype

**START WITH**: Brave Search API (free tier) + OpenAI to structure results

1. **Query Brave**: Search for "[person] events 2025"
2. **Get top 10 results**: URLs + snippets
3. **Feed to OpenAI**: "Extract event data from these search results"
4. **Output**: Structured event JSON
5. **Verify**: Check 2-3 manually

**Why this combo**:
- ✅ No new API costs (both have free tiers / we have OpenAI)
- ✅ Fast to prototype (1-2 hours)
- ✅ Leverages search engine coverage
- ✅ AI extracts structure from messy data
- ✅ Can test immediately

---

## API Keys Needed

Priority order:
1. ✅ OpenAI API key (already have)
2. 🔑 Brave Search API key (free tier)
3. 🔑 Perplexity API key (if Brave doesn't work well)
4. 🔑 Bandsintown API key (for musicians)

**DO NOT NEED** (too expensive/limited):
- ❌ Twitter/X API (too expensive)
- ❌ Google Search API (expensive)
- ❌ SerpAPI (expensive)
