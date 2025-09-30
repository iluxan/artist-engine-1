# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Event Discovery Agent - A personal event discovery agent that tracks events from people you care about (artists, writers, performers, etc.). Currently at Phase 2 with database persistence. Phase 3 (event parsing and notifications) is planned next.

## Development Commands

```bash
npm start          # Start the Express server on port 3000
npm run dev        # Same as npm start (alias)
```

The application runs on `http://localhost:3000` and serves both the frontend and API.

## Architecture

### Three-Layer Architecture

1. **Database Layer** (`db.js`)
   - SQLite database using better-sqlite3 (synchronous API)
   - Database file: `event-discovery.db` (auto-created on first run)
   - Schema: `people`, `sources`, `events` (events table ready for Phase 3)
   - All database operations are synchronous
   - Foreign keys enabled with CASCADE delete for people→sources

2. **Source Discovery Layer** (`sourceDiscovery.js`)
   - Heuristic-based URL generation (not actual verification)
   - Generates potential URLs for Twitter, Instagram, Facebook, websites, and event platforms
   - Returns sources with confidence levels (high/medium/low)
   - **Important**: Currently uses pattern matching, NOT actual web search/verification
   - Phase 3 will add real parsing and verification

3. **API & Server Layer** (`server.js`)
   - Express server with REST API
   - Serves static files from `public/`
   - Two endpoint groups:
     - **People CRUD**: `/api/people/*` - Full CRUD for tracked people
     - **Sources CRUD**: `/api/sources/*` - Manage discovered sources
     - **Discovery**: `/api/discover-sources` - Phase 1 endpoint with optional save_to_db

### Frontend Architecture (`public/`)

Single-page application with view-based routing (no framework):
- **View Management**: JavaScript-based routing in `app.js`
- **Three Main Views**:
  - `peopleView` - List of saved people (default landing page)
  - `personDetailView` - Individual person with sources grouped by type
  - `personFormView` - Add/edit person form
  - `discoverView` - Phase 1 discovery interface
- **State Management**: Simple global state with `currentView`, `currentPersonId`, `editingPersonId`

## Key Database Patterns

### Schema Relationships
- `people.id` → `sources.person_id` (one-to-many, CASCADE delete)
- `people.id` → `events.person_id` (one-to-many, CASCADE delete - Phase 3)
- Unique constraint on `(person_id, url)` in sources table

### Query Functions
- Database module exports functions like `getAllPeople()`, `getPersonById(id)`, etc.
- All queries are synchronous (better-sqlite3 pattern)
- `bulkCreateSources()` uses transactions for batch inserts with INSERT OR IGNORE for deduplication

## Phase Implementation Notes

### Phase 2 (Current - COMPLETED)
- Database persistence working
- Full CRUD operations for people and sources
- Frontend has all views and navigation
- Discovery can now save directly to database

### Phase 3 (Next - See plan-phase3.txt)
- Event parsing from discovered sources
- Scheduled source checking with node-cron
- Event parsers for Eventbrite, Songkick, Twitter, generic websites
- Calendar view and notifications
- Duplicate event detection

## Important Implementation Details

### Source Discovery Limitations
The `sourceDiscovery.js` module generates URLs using heuristics and name patterns. It does NOT:
- Verify URLs actually exist
- Use search APIs (Google, Twitter, etc.)
- Scrape or parse actual content
- Authenticate with social media platforms

For Phase 3, implement actual parsers for each source type with proper verification.

### Database Initialization
- Database auto-initializes on module load in `db.js`
- Tables created with `IF NOT EXISTS`
- No migrations system yet - schema changes require manual ALTER TABLE

### Frontend State Management
- No React/Vue - uses vanilla JavaScript
- View switching via `showView(viewName)` function
- DOM manipulation with `innerHTML` and `createElement`
- Event handlers added after DOM updates using `setTimeout(() => {...}, 0)` pattern

### API Response Patterns
- People endpoints return objects with `sources` array embedded
- Discovery endpoint returns `person_id` when `save_to_db: true`
- Source counts computed via SQL JOIN in `getAllPeople()`

## Working with This Codebase

### Adding New API Endpoints
1. Add route handler in `server.js` (grouped by resource type)
2. Add database function in `db.js` if needed
3. Update README.md API documentation
4. Add frontend handler in `app.js` if needed

### Adding New Source Types
1. Add parser function to `sourceDiscovery.js`
2. Call from `discoverSourcesForPerson()`
3. Return object with `{ type, url, confidence }`
4. Update frontend to handle new type in `renderSources()`

### Database Schema Changes
1. Update schema in `db.js` `initializeDatabase()`
2. Consider backward compatibility (existing databases won't auto-migrate)
3. Update query functions as needed
4. Document in README.md Database Schema section

## Port and Process Management

The app runs on port 3000. If port is in use:
```bash
lsof -ti:3000 | xargs kill -9
```