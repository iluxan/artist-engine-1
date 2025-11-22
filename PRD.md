# Product Requirements Document: Personal Event Discovery Agent

## 🎯 Current Status (Updated 2025-10-04)

### ✅ Completed Phases
- **Phase 1**: Basic Source Discovery (DONE)
- **Phase 2**: Data Persistence (DONE)
- **Phase 3a**: AI-Powered Source Discovery (DONE - see note below)

### 🚧 Current Phase
**Phase 3b: Event Extraction & Parsing** - The hardest part!

### 💡 Key Insight: What's Hardest
The **event scanning, detection, and extraction** (FR3.1) is the most challenging part:

**Challenges:**
1. **Diverse Source Formats**: Each platform structures data differently
   - Twitter/X: Unstructured text in tweets
   - Instagram: Images with captions
   - Personal websites: Custom HTML, varying structures
   - Event platforms: Different APIs and data schemas
   - Blogs: RSS feeds, varying post formats

2. **Event Detection Complexity**:
   - Natural language varies: "performing at", "will be at", "excited to announce", etc.
   - Dates in many formats: "Oct 15", "10/15", "next Tuesday", "this weekend"
   - Locations: venue names, addresses, cities, "TBA", virtual events
   - Distinguishing events from general announcements

3. **Accuracy Requirements**:
   - False positives: Non-events mistaken for events (product launches, book releases)
   - False negatives: Missing actual events due to unusual phrasing
   - Extraction errors: Wrong date, wrong venue, wrong time

4. **Technical Challenges**:
   - Rate limiting on social APIs
   - Dynamic content (JavaScript-rendered pages)
   - Anti-scraping measures (Cloudflare, etc.)
   - Different authentication requirements per platform

**Recommended Approach (Next Steps):**
- Start with 1-2 source types (e.g., Twitter + personal websites)
- Use GPT-4 for initial event detection (AI can handle varied language)
- Build pattern library for common event announcement formats
- Iteratively improve accuracy based on test cases
- Add manual verification/correction UI

---

## Overview
An intelligent agent that monitors people and topics of interest to discover and surface relevant events in the user's city, eliminating the need for manual event searching across multiple platforms.

## Problem Statement
People miss events from their favorite creators, artists, writers, and performers because information is scattered across multiple platforms (Twitter/X, blogs, mailing lists, websites). There's no unified way to track all the people you care about and get notified when they have events in your area.

## Target User
Culturally engaged individuals who:
- Follow multiple creators, artists, writers, or performers
- Want to attend live events but struggle to keep track of announcements
- Check multiple sources manually to find events
- Often miss events due to information overload

## Core User Flow
1. User enters 2-4 people/entities they want to follow
2. System does initial searches to suggest where these people publish personal event information
3. Agent continuously monitors these sources for new events (daily updates or something like that)
4. User reviews upcoming events in a clean web interface (email, etc coming later)
5. User can add events to their calendar or ignore sources/authors

## Functional Requirements

### Phase 1: Basic Source Discovery ✅ DONE
Simplest possible flow - enter people, find their sources.

#### FR1.1: People Input ✅ DONE
- **FR1.1.1**: ✅ Simple input form to add 2-4 people/entities to start
- **FR1.1.2**: ✅ Support for various entity types (writers, artists, performers, venues, organizations)
- **FR1.1.3**: ✅ Basic validation (name required)

#### FR1.2: Source Discovery ✅ DONE (Enhanced with AI)
- **FR1.2.1**: ✅ Automatically search for and identify event announcement sources for each person:
  - ✅ Twitter/X accounts
  - ✅ Personal websites
  - ✅ Blogs
  - ✅ Event platforms (Eventbrite, Dice, etc.)
  - ✅ Social media (Instagram, Facebook, Mastodon)
  - ✅ **AI-POWERED**: Uses OpenAI GPT-4 to find real, verified sources
  - ✅ **URL VERIFICATION**: Checks if sources actually exist
  - ✅ **CONTENT ANALYSIS**: Verifies sources contain event information
- **FR1.2.2**: ✅ Display discovered sources to user
- **FR1.2.3**: ✅ Show confidence level (0-100% AI scoring) or source type for each discovered source

### Phase 2: Data Persistence ✅ DONE
Store the people and sources for future use.

#### FR2.1: Database Setup ✅ DONE
- **FR2.1.1**: ✅ Permanent database to store:
  - ✅ Tracked people/entities (SQLite with better-sqlite3)
  - ✅ Discovered sources (URL, type, associated person)
  - ✅ Timestamp of when source was discovered
  - ✅ **ENHANCED**: AI confidence scores, verification status, analysis summaries

#### FR2.2: Data Retrieval ✅ DONE
- **FR2.2.1**: ✅ Ability to view previously entered people
- **FR2.2.2**: ✅ Ability to view discovered sources for each person
- **FR2.2.3**: ✅ Basic CRUD operations (add/remove people, add/remove sources)
- **FR2.2.3+**: ✅ Manual source addition, edit person details

### Phase 3: Event Extraction & Verification ⚠️ IN PROGRESS
Extract real, verified events from discovered sources using AI with strict quality controls.

**NOTE**: Phase 3a (AI-powered source discovery) is complete. Phase 3b (event extraction) uses 7-day cache model with manual review.

**Storage Model**: Events are **NOT permanently stored**. Instead:
- Events extracted via AI are cached for 7 days
- User manually reviews and approves events before they appear
- Approved events auto-expire after 7 days
- No accumulation of stale or fake event data

#### FR3.1: Event Extraction with 4-Step Verification ⚠️ IN PROGRESS
- **FR3.1.1**: ⚠️ Scan discovered sources for recent/upcoming events using OpenAI GPT-4
- **FR3.1.2**: ⚠️ Extract event details:
  - ⚠️ Event name/title
  - ⚠️ Date and time (ISO format, must be future date)
  - ⚠️ Location/venue (physical address or "Online")
  - ⚠️ Event URL (must be accessible)
  - ⚠️ Registration/ticket URL (required for verification)
  - ⚠️ Associated person/entity
- **FR3.1.3**: ⚠️ **4-Step Verification Pipeline** (ALL must pass):
  - ⚠️ **HTTP Check**: Event URL returns HTTP 200 status
  - ⚠️ **AI Content Validation**: Fetch URL content and verify it matches event details using GPT-4
  - ⚠️ **Date Sanity Check**: Reject past dates, countdown timers, or dates >2 years in future
  - ⚠️ **Registration URL Check**: Verify event has ticket/RSVP/registration link
- **FR3.1.4**: ⚠️ Save verified events to review queue (not main database yet)
- **FR3.1.5**: ⚠️ Track verification status for each check (pass/fail with reason)

#### FR3.2: Manual Review Queue ⚠️ IN PROGRESS
- **FR3.2.1**: ⚠️ "Review Events" page showing extracted events awaiting approval
- **FR3.2.2**: ⚠️ Each event card displays:
  - ⚠️ Event details (title, date, location, URLs)
  - ⚠️ Verification status badges (✓ URL works, ✓ Content validated, ✓ Date valid, ✓ Has registration)
  - ⚠️ Source it was extracted from
  - ⚠️ "Approve" and "Reject" buttons
- **FR3.2.3**: ⚠️ Approved events move to main "Events" view
- **FR3.2.4**: ⚠️ Rejected events are deleted and logged for future AI training

#### FR3.3: Event Display & Expiry ⚠️ IN PROGRESS
- **FR3.3.1**: ⚠️ "My Events" page showing approved events only
- **FR3.3.2**: ⚠️ Filter by upcoming/person
- **FR3.3.3**: ⚠️ Show expiry countdown (e.g., "Expires in 5 days")
- **FR3.3.4**: ⚠️ "Refresh Events" button to re-extract from sources
- **FR3.3.5**: ⚠️ Automatic cleanup: Delete events older than 7 days (scheduled job)

**What WAS completed in Phase 3a:**
- ✅ AI-powered source discovery (OpenAI GPT-4 integration)
- ✅ URL verification and accessibility checks for sources
- ✅ Content analysis to verify sources post event information
- ✅ Confidence scoring (0-100%) for sources
- ✅ Database schema enhancements for source verification metadata

**What's IN PROGRESS in Phase 3b:**
- ⚠️ Event extraction with OpenAI
- ⚠️ 4-step verification pipeline
- ⚠️ Manual review queue UI
- ⚠️ 7-day cache with auto-expiry
- ⚠️ Event display interface

### Phase 4+: Full Featured Application
Everything else comes later.

#### FR4: Continuous Monitoring
- Run discovery checks at regular intervals (e.g., daily)
- Track new vs. seen events
- Filter events by user's city/geographic area

#### FR5: Event Actions
- "Add to Calendar" button (.ics export)
- Mark event as "interested" or "not interested"
- "Ignore this source" action
- "Ignore this author/person" action

#### FR6: Event Display Interface
- Clean, scannable layout showing upcoming events
- Sort events chronologically
- Visual indicators for new/unseen events
- Expandable view for full details

#### FR7: User Authentication
- User account creation and login
- Support for multiple users with separate tracked lists
- Secure password storage
- Session management

#### FR8: Mobile Interface
- Responsive design that works on mobile browsers
- Touch-optimized interactions
- Mobile-first layout considerations

#### FR9: Email Notifications
- Opt-in email notifications for new events
- Configurable notification frequency (immediate, daily digest, weekly digest)
- Email template with event summary and CTA
- Unsubscribe mechanism

#### FR10: Future Considerations
- Interest-based tracking (e.g., "indie rock concerts", "poetry readings")
- Calendar integration (Google Calendar, Apple Calendar)
- Social features (share events with friends)
- Ticket price tracking
- Collaboration/shared lists with friends
- Smart recommendations based on attended events
- Integration with ticketing platforms

## Non-Functional Requirements

### NFR1: Performance
- Event discovery checks should complete within 5 minutes
- Interface should load in under 2 seconds
- Support at least 50 tracked people per user without degradation

### NFR2: Reliability
- System should gracefully handle unavailable sources
- Failed source checks should retry with exponential backoff
- No data loss in case of system failures

### NFR3: Accuracy & Verification
- **False positive rate**: <5% (events passing verification must be real)
- **4-step verification**: ALL checks must pass (HTTP 200, AI content match, valid date, registration URL)
- **Manual review**: User approves/rejects events before they appear in main view
- Accurately extract event details (date in ISO format, full location, working URLs)
- Distinguish real events from: countdown timers, promotional content, past events, book releases
- Correctly filter by user's geographic area (future phase)

### NFR4: Privacy
- User data should be stored securely
- No sharing of user tracking lists with third parties
- Comply with data protection regulations

### NFR5: Scalability
- Architecture should support 1000+ concurrent users (Phase 2)
- Database design should handle growing event history

## Technical Considerations

### Data Sources
- **Social Media APIs**: Twitter/X API, Instagram API (where available)
- **Web Scraping**: For personal websites and blogs
- **RSS Feeds**: For blogs and news sites
- **Event Platforms**: Eventbrite, Dice, Songkick APIs
- **Search Engines**: Google Custom Search or similar for discovery

### Event Detection Strategy
- Natural language processing to identify event announcements in text
- Pattern matching for dates, times, locations
- Keyword detection ("live", "performing", "appearance", "show", etc.)
- Machine learning (future) to improve accuracy over time

### Technology Stack Recommendations
- **Backend**: Python (for web scraping, NLP) or Node.js
- **Database**: PostgreSQL (structured data) + Redis (caching)
- **Frontend**: React or Vue.js
- **Task Queue**: Celery or Bull (for scheduled monitoring)
- **Hosting**: Cloud platform (AWS, GCP, or similar)

## Success Metrics

### Phase 1: Basic Source Discovery
- User successfully enters 2-4 people
- System finds at least 2-3 sources per person
- Source relevance: >70% of discovered sources are actually used by the person for event announcements

### Phase 2: Data Persistence
- Data successfully persists across sessions
- User can retrieve previously entered data without errors

### Phase 3: Event Extraction & Verification
- System extracts at least 5-10 event candidates per person from sources
- **Verification accuracy**: >95% of events passing 4-step verification are real events
- **False positive rate**: <5% (fake/incorrect events that pass verification)
- **User acceptance rate**: >60% of verified events approved by user in review queue
- Event data extraction accuracy: >90% of required fields (title, date, location, URLs) captured correctly
- URL accessibility: 100% of approved events have working URLs (HTTP 200)
- **Expiry compliance**: 100% of events >7 days old are automatically deleted

### Phase 4+
- **Discovery Effectiveness**: System finds at least 1 relevant event per week per user
- **Accuracy**: <10% false positive rate on event detection
- **Retention**: 60% of users active after 30 days
- **Engagement**: User returns to check events at least 2x per week

## Open Questions
1. **Geographic scope**: Start with single city or support multiple cities from day 1?
2. **Event definition**: Include virtual events or only in-person? ✅ **RESOLVED**: Include virtual events (marked as "Online")
3. **Source validation**: How to handle when person has multiple accounts/sources?
4. **Data retention**: How long to keep past event data? ✅ **RESOLVED**: 7-day cache model with auto-expiry, no permanent storage
5. **Rate limiting**: How to handle API rate limits on social platforms?
6. **Manual curation**: Should there be a way to manually add events not found by the system? ✅ **RESOLVED**: Manual review queue where user approves/rejects AI-extracted events
7. **Verification strictness**: Should all 4 verification steps be required, or make some optional? ✅ **RESOLVED**: All 4 required for maximum quality

## Timeline Estimate (Development)

### Phase 1: Basic Source Discovery (2-3 weeks)
- Week 1: Project setup, basic web UI with input form
- Week 2: Source discovery logic (web search, API integration)
- Week 3: Display discovered sources, basic testing

### Phase 2: Data Persistence (1-2 weeks)
- Week 1: Database setup (schema, migrations)
- Week 2: CRUD operations, data retrieval UI

### Phase 3: Event Preview (2-3 weeks)
- Week 1: Event scanning logic for discovered sources
- Week 2: Event extraction and parsing
- Week 3: Event preview display UI, testing

### Phase 4+: Full Featured Application (8-12 weeks)
- Weeks 1-3: Continuous monitoring system
- Weeks 4-6: Event actions and advanced UI
- Weeks 7-9: Authentication and multi-user support
- Weeks 10-12: Mobile UI, email notifications, polish

## Dependencies
- Access to social media APIs (may require developer accounts)
- Geocoding service for location matching
- Email service provider (for Phase 2 notifications)
- Hosting infrastructure

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Social media API access restricted | High | Implement web scraping fallback |
| Event detection accuracy too low | High | Start with manual validation; iterate on detection rules |
| Rate limiting on source checking | Medium | Implement intelligent polling intervals; use caching |
| Legal issues with scraping | Medium | Review ToS; focus on public data; add robots.txt compliance |
| User privacy concerns | Medium | Clear privacy policy; secure data handling; opt-in features |

## Out of Scope (Phases 1-3)
- Continuous monitoring (comes in Phase 4+)
- Event actions (add to calendar, ignore, etc.) - Phase 4+
- User authentication - Phase 4+
- Mobile optimization - Phase 4+
- Email notifications - Phase 4+
- Geographic filtering - Phase 4+
- Ticket purchasing within the app
- Event recommendations beyond tracked people
- Social/collaborative features
- Mobile native apps (iOS/Android)
- Direct calendar app integration
- Support for languages other than English