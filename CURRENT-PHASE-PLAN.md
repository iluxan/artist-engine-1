# Current Phase Plan: Event Extraction with Full Verification & 7-Day Cache

## Selected Approach
Based on user requirements:
- **Storage**: 7-day cache (events auto-expire, no permanent storage)
- **Review**: Manual review queue (user approves each event before it appears)
- **Verification**: Full 4-step validation (HTTP check + AI content validation + date sanity + registration URL)

## Goal
Extract real, verified events from discovered sources and display them in a browsable interface **without accumulating fake/stale event data**.

## The Fake Event Problem (Now Solved)

**What was happening:**
- AI extracted "All Hallow's Read" event from Neil Gaiman's site with date 2025-01-19
- This was actually a countdown timer JavaScript widget, NOT a real event
- The URL was just his homepage, not an actual event page
- No verification was performed

**How we're solving it:**
1. **HTTP Check**: Verify event URL returns HTTP 200
2. **AI Content Validation**: Fetch URL and ask GPT-4 "Does this page actually describe this event?"
3. **Date Sanity Check**: Reject past dates, countdown artifacts, dates >2 years away
4. **Registration URL Required**: Event must have ticket/RSVP/registration link
5. **Manual Review**: User sees all 4 verification results and approves/rejects each event
6. **7-Day Expiry**: No old events accumulate, auto-delete after 7 days

## Implementation Status

### ✅ Completed

**Part 1: Event Extraction with Verification**
- Added `unverified_events` table to database
- Updated `events` table with `expires_at`, `approved_at`, `verification_status` columns
- Implemented 4-step verification pipeline in `extractEvents.js`:
  - `verifyEvent()` - Main verification coordinator
  - `validateEventDate()` - Date sanity checks
  - `checkRegistrationUrl()` - Registration/ticket URL validation
  - `validateEventContent()` - AI content matching
- Modified extraction flow to save to review queue with verification results

**Part 2: API Endpoints**
- `POST /api/people/:id/extract-events` - Extract events from all sources for a person
- `GET /api/events/unverified` - Get all events awaiting review
- `GET /api/events/unverified/:id` - Get single unverified event
- `POST /api/events/unverified/:id/approve` - Approve event (moves to events table with 7-day expiry)
- `DELETE /api/events/unverified/:id` - Reject event
- `POST /api/events/cleanup` - Manually trigger expired event cleanup

**Part 3: Frontend - Extraction UI**
- Added "🎭 Extract Events" button to person detail page
- Added loading states and progress indicators
- Added success page with extraction summary
- Added "🎭 Extract All Events" button to main Events page
- Implemented sequential processing with live progress updates for batch extraction

### ⚠️ In Progress

**Part 4: Review Queue UI**
- Need "Review Events" page showing unverified events
- Need verification status badges (✓ URL works, ✓ Content matches, etc.)
- Need approve/reject buttons
- Need to display verification errors

**Part 5: Approved Events Display**
- Need "My Events" page improvements
- Need expiry countdown display ("Expires in 5 days")
- Need better event cards with all details

**Part 6: Scheduled Cleanup**
- Need `scheduler.js` with cron job
- Should run daily at 3 AM
- Should delete events where `expires_at < now()`

## How It Works Now

1. User clicks "🎭 Extract Events" (on person page or "Extract All Events" on Events page)
2. System scrapes each source's webpage
3. AI extracts event candidates from posts/articles
4. Each event runs through 4-step verification:
   - HTTP check (URL accessible?)
   - AI content validation (page matches event details?)
   - Date sanity (future date, not countdown, within 2 years?)
   - Registration URL (has ticket/RSVP link?)
5. Events saved to `unverified_events` table with verification results
6. User sees summary: "X events saved to review queue"

**Missing**: User can't actually review the events yet (no Review UI)

## Next Steps (Priority Order)

### 1. Build Review Queue UI (Highest Priority)
- Create "Review Events" page accessible from nav
- Show list of unverified events with:
  - Event title, date, location, URLs
  - Verification badges showing which checks passed/failed
  - Original post excerpt
  - Person name
- Add "Approve" button (green) - moves to approved events
- Add "Reject" button (red) - deletes event
- Show count of pending events in navigation

### 2. Improve Approved Events Display
- Show approved events on "Events" page (already works but basic)
- Add expiry countdown badges
- Group by person or date
- Add "Refresh" button to re-extract

### 3. Add Cleanup Scheduler
- Install `node-cron` package
- Create `scheduler.js` module
- Schedule daily cleanup at 3 AM
- Log cleanup results

### 4. Polish & Error Handling
- Better error messages during extraction
- Handle rate limiting gracefully
- Add retry logic for failed verifications
- Show extraction costs in UI

## Cost Estimates (OpenAI API)

**Per extraction run (10 people, 5 sources each):**
- Event extraction: $1-2 (existing AI calls)
- HTTP checks: $0 (free)
- AI content validation: ~$2-3 (verify ~50 events × $0.05 each)
- Date checks: $0 (free)
- Registration URL checks: $0 (free)

**Total per run: ~$3-5**

With 80% rejection rate (strict verification), only ~10 events approved per run.

**Optimization ideas:**
- Only re-extract from active sources (posted in last 30 days)
- Cache verification results for 24 hours
- User triggers extraction manually = $3-5 per click
- Avoid scheduled daily extraction until costs are manageable

## Success Criteria

- [x] Event extraction completes with 4-step verification
- [x] Unverified events saved to review queue with verification status
- [ ] User can see verification badges (✓ or ✗) for each check
- [ ] User can approve events → move to main events view with 7-day expiry
- [ ] User can reject events → deleted permanently
- [ ] Approved events auto-delete after 7 days
- [ ] No fake events pass verification (countdown timers, promotional content rejected)
- [ ] All approved events have working URLs (100% HTTP 200 rate)
- [ ] <5% false positive rate after manual review

## Key Safeguards Against Fake Events

1. **HTTP Check**: URL must return 200 (rejects broken links)
2. **AI Content Validation**: GPT-4 verifies URL content matches event details (rejects homepage-only events)
3. **Date Sanity**: Rejects past dates, countdown timers, dates >2 years away
4. **Registration URL**: Event must have ticket/RSVP link (strictest filter)
5. **Manual Review**: Human approval required (final safeguard)
6. **Auto-Expiry**: Old events deleted automatically (no stale data)

## Files Modified

- [x] `db.js` - Added unverified_events table and approval functions
- [x] `extractEvents.js` - Added 4-step verification pipeline
- [x] `server.js` - Added review queue and cleanup API endpoints
- [x] `public/index.html` - Added Extract All Events button, improved empty state
- [x] `public/app.js` - Added extraction UI logic and extractAllEvents function
- [ ] `public/styles.css` - Need verification badge styles
- [ ] `scheduler.js` - Create cleanup scheduler (not started)
- [ ] `package.json` - Add `node-cron` dependency (not started)
