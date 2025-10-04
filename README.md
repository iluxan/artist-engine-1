# Event Discovery Agent - Phase 3

## Overview
A personal event discovery agent that helps you track events from people you care about (artists, writers, performers, etc.)

## Current Status: Phase 3 (Steps 1-3) Complete ✓

### Features Implemented

#### Phase 1 ✓
- Input form to add 2-4 people to track
- Heuristic-based source discovery for:
  - Twitter/X profiles
  - Personal websites and blogs
  - Event platforms (Eventbrite, Dice, Songkick)
  - Social media (Instagram, Facebook)
- Display discovered sources with confidence levels
- Clean, responsive UI

#### Phase 2 ✓
- SQLite database integration with better-sqlite3
- Full CRUD operations for people and sources
- Save and manage people you want to track
- View person details with all their sources
- Add, edit, and delete people
- Discover sources for saved people
- Delete individual sources
- Data persistence across sessions
- Navigation between different views (My People, Discover New)

#### Phase 3 (Steps 1-3) ✓
- **AI-Powered Source Discovery** using OpenAI GPT-4
- Intelligent web search to find real, verified sources
- URL verification (checks if sources are accessible)
- Content analysis (verifies correct person and event announcements)
- Confidence scoring (0-100%) based on AI analysis
- New database columns for verification status and metadata
- New API endpoint: `POST /api/people/:id/discover-ai`
- Frontend "🤖 AI Discover" button
- Test script for command-line testing
- **Tested successfully with:** Neil Gaiman, Margaret Atwood, Roxane Gay

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm
- **OpenAI API key** (for AI-powered source discovery)

### Installation
```bash
npm install
```

### Setup OpenAI API Key (Required for Phase 3)

1. Get an API key from https://platform.openai.com/api-keys
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Add your API key to `.env`:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   OPENAI_MODEL=gpt-4o-mini
   ```

See `SETUP-PHASE3.md` for detailed setup instructions.

### Running the Application
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Testing AI Discovery (Command Line)
```bash
# Test with default authors
node test-ai-discovery.js

# Test with specific person
node test-ai-discovery.js "Neil Gaiman"
```

## How to Use

### AI-Powered Discovery (Phase 3 - Recommended)
1. Open `http://localhost:3000` in your browser
2. Click "Add Person" to add someone you want to track
3. Enter their name and optional notes (e.g., "science fiction author")
4. Click "🤖 AI Discover" to use AI-powered source discovery
5. Wait 30-60 seconds for real, verified sources
6. View discovered sources with confidence scores and analysis

### Managing People (Phase 2)
1. View all saved people on the "My People" page
2. Click "View" to see a person's details and all their sources
3. Click "Edit" or "Delete" to manage saved people
4. Sources are grouped by type (website, twitter, instagram, etc.)

### Legacy Heuristic Discovery (Phase 1)
1. Navigate to "Discover New" tab
2. Enter 2-4 names of people you want to track
3. Check "Save to database" if you want to save them
4. Click "Discover Sources" (uses pattern matching, not AI)
5. Note: These sources are generated heuristically and may not exist

## Project Structure
```
project1/
├── server.js              # Express server and API endpoints
├── db.js                  # Database module (SQLite)
├── sourceDiscovery.js     # Source discovery logic
├── package.json           # Dependencies
├── event-discovery.db     # SQLite database (auto-created)
├── public/
│   ├── index.html        # Main UI with multiple views
│   ├── styles.css        # Styling
│   └── app.js            # Frontend JavaScript with routing
├── plan-phase2.txt       # Phase 2 implementation plan
├── plan-phase3.txt       # Phase 3 implementation plan
└── README.md
```

## API Endpoints

### People Endpoints
- `GET /api/people` - Get all saved people with source counts
- `GET /api/people/:id` - Get person details with all sources
- `POST /api/people` - Create new person
  - Body: `{ name, notes? }`
- `PUT /api/people/:id` - Update person
  - Body: `{ name?, notes? }`
- `DELETE /api/people/:id` - Delete person and all their sources
- `POST /api/people/:id/discover` - Run source discovery for a person
- `GET /api/people/:id/sources` - Get all sources for a person

### Sources Endpoints
- `POST /api/sources` - Manually add a source
  - Body: `{ person_id, type, url, confidence? }`
- `PUT /api/sources/:id` - Update source
  - Body: `{ status?, confidence? }`
- `DELETE /api/sources/:id` - Delete a source

### Discovery Endpoint (Phase 1)
- `POST /api/discover-sources` - Discover sources for people
  - Body: `{ people: ["Name 1", "Name 2"], save_to_db?: boolean }`
  - Returns discovered sources and person_id if saved

## Database Schema

### people table
- `id` - Primary key
- `name` - Person's name
- `notes` - Optional notes
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### sources table
- `id` - Primary key
- `person_id` - Foreign key to people
- `type` - Source type (twitter, instagram, website, etc.)
- `url` - Source URL
- `confidence` - Confidence level (high, medium, low)
- `discovered_at` - Discovery timestamp
- `last_checked` - Last verification timestamp
- `status` - Status (active, inactive, verified, broken)

### events table (Phase 3)
- Ready for Phase 3 implementation

## Next Steps: Phase 3

Phase 3 will add:
- Event parsing from discovered sources
- Automatic scheduled re-discovery
- Event storage and management
- Calendar view of events
- Email/push notifications for new events
- Duplicate event detection

## Technology Stack
- **Backend:** Node.js, Express
- **Database:** SQLite with better-sqlite3
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Libraries:** Axios (HTTP client), Cheerio (web scraping)

## Notes

Currently, the source discovery uses heuristics and common patterns to generate potential URLs. In a production version, this would:
- Use search APIs (Google Custom Search, etc.)
- Verify URLs exist before returning them
- Use social media APIs for more accurate results
- Implement web scraping for better discovery