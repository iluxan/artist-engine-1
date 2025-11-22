# Event Discovery Agent - Big Plan

## Project Goal
Personal event discovery agent that automatically finds and tracks events from people you care about (artists, writers, performers, etc.)

## Current Status: Phase 3 In Progress

### Completed Features
- **Phase 1**: Heuristic source discovery (pattern-based URL generation)
- **Phase 2**: Database persistence with full CRUD operations
- **Phase 3 (Steps 1-3)**: AI-powered source discovery using OpenAI GPT-4
  - Real source verification (URL checking)
  - Content analysis (AI verifies correct person and event posting)
  - Confidence scoring (0-100%)

### Key Technologies
- SQLite (better-sqlite3) - Local database
- OpenAI API (GPT-4o-mini) - AI-powered discovery and parsing
- Express - REST API
- Vanilla JavaScript - Frontend (no framework)

## What's Next

### Current Phase: Event Extraction & Viewing
Use OpenAI API to:
1. Extract events from discovered sources (existing sites we already have)
2. Find new event sources via web search
3. Parse event details (dates, locations, titles, URLs)
4. Display events in browsable UI
5. Schedule automatic overnight event extraction

### Future Enhancements
- Email/push notifications for new events
- Calendar view with export (iCal, Google Calendar)
- Duplicate event detection and merging
- Event filtering by date, person, location
- Multi-user support with authentication
- Mobile app

## Cost Considerations
- OpenAI API usage: ~$0.02-0.05 per source analyzed
- Already have OpenAI credits
- Optimize with caching and selective parsing
- Track daily/monthly API usage

## Archived Plans
See `OLD-PLANS/` directory for detailed phase-by-phase implementation plans from earlier iterations.


### Architecture

**Database (SQLite)**
- `people` - Track individuals
- `sources` - Discovered event sources with metadata
- `events` - Event details (title, date, location, URL)

**Backend (Node.js + Express)**
- REST API for people, sources, events
- OpenAI GPT-4 integration for intelligent discovery
- Source verification and content analysis

**Frontend (Vanilla JS)**
- View-based routing (no framework)
- People management UI
- Source discovery interface
- Event viewing (in progress)

