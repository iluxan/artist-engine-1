# Product Requirements Document: Personal Event Discovery Agent

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

### Phase 1: Basic Source Discovery
Simplest possible flow - enter people, find their sources.

#### FR1.1: People Input
- **FR1.1.1**: Simple input form to add 2-4 people/entities to start
- **FR1.1.2**: Support for various entity types (writers, artists, performers, venues, organizations)
- **FR1.1.3**: Basic validation (name required)

#### FR1.2: Source Discovery
- **FR1.2.1**: Automatically search for and identify event announcement sources for each person:
  - Twitter/X accounts
  - Personal websites
  - Blogs
  - Event platforms (Eventbrite, Dice, etc.)
  - Social media (Instagram, Facebook)
- **FR1.2.2**: Display discovered sources to user
- **FR1.2.3**: Show confidence level or source type for each discovered source

### Phase 2: Data Persistence
Store the people and sources for future use.

#### FR2.1: Database Setup
- **FR2.1.1**: Permanent database to store:
  - Tracked people/entities
  - Discovered sources (URL, type, associated person)
  - Timestamp of when source was discovered

#### FR2.2: Data Retrieval
- **FR2.2.1**: Ability to view previously entered people
- **FR2.2.2**: Ability to view discovered sources for each person
- **FR2.2.3**: Basic CRUD operations (add/remove people, add/remove sources)

### Phase 3: Event Preview
Show sample events found from the discovered sources.

#### FR3.1: Initial Event Scan
- **FR3.1.1**: Scan discovered sources for recent/upcoming events
- **FR3.1.2**: Extract basic event details:
  - Event name
  - Date and time (if available)
  - Location/venue (if available)
  - Link to source
  - Associated person/entity

#### FR3.2: Event Preview Display
- **FR3.2.1**: Show sample events found from each source
- **FR3.2.2**: Basic list view with event details
- **FR3.2.3**: Group events by person/source
- **FR3.2.4**: Show which source each event came from

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

### NFR3: Accuracy
- Minimize false positives (non-events mistaken for events)
- Accurately extract event details (date, location, etc.)
- Correctly filter by user's geographic area

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

### Phase 3: Event Preview
- System finds at least 1-2 sample events per person
- Event data extraction accuracy: >80% of required fields captured correctly

### Phase 4+
- **Discovery Effectiveness**: System finds at least 1 relevant event per week per user
- **Accuracy**: <10% false positive rate on event detection
- **Retention**: 60% of users active after 30 days
- **Engagement**: User returns to check events at least 2x per week

## Open Questions
1. **Geographic scope**: Start with single city or support multiple cities from day 1?
2. **Event definition**: Include virtual events or only in-person?
3. **Source validation**: How to handle when person has multiple accounts/sources?
4. **Data retention**: How long to keep past event data?
5. **Rate limiting**: How to handle API rate limits on social platforms?
6. **Manual curation**: Should there be a way to manually add events not found by the system?

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