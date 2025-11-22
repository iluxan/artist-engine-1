const express = require('express');
const path = require('path');
const { discoverSourcesForPerson } = require('./sourceDiscovery');
const { discoverSourcesWithAI } = require('./aiSourceDiscovery');
const { analyzeAllSources } = require('./analyzePostingFrequency');
const { extractEventsFromSource } = require('./extractEvents');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// ==================== PEOPLE ENDPOINTS ====================

// Get all people
app.get('/api/people', (req, res) => {
  try {
    const people = db.getAllPeople();
    res.json({ people });
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// Get person by ID
app.get('/api/people/:id', (req, res) => {
  try {
    const person = db.getPersonById(parseInt(req.params.id));
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// Create new person
app.post('/api/people', (req, res) => {
  const { name, notes } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const person = db.createPerson(name.trim(), notes);
    res.status(201).json(person);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// Update person
app.put('/api/people/:id', (req, res) => {
  const { name, notes } = req.body;
  const id = parseInt(req.params.id);

  try {
    const person = db.updatePerson(id, { name, notes });
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Delete person
app.delete('/api/people/:id', (req, res) => {
  try {
    const success = db.deletePerson(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Person not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

// Run AI-powered source discovery for a specific person
app.post('/api/people/:id/discover-ai', async (req, res) => {
  const id = parseInt(req.params.id);
  const { personDescription } = req.body;

  try {
    const person = db.getPersonById(id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Use AI-powered discovery
    const sources = await discoverSourcesWithAI(person.name, personDescription || person.notes || '');
    const savedSources = db.bulkCreateSources(id, sources);

    res.json({
      person_id: id,
      new_sources: savedSources,
      total_sources: savedSources.length,
      method: 'ai'
    });
  } catch (error) {
    console.error('Error discovering sources with AI:', error);
    res.status(500).json({ error: 'Failed to discover sources with AI: ' + error.message });
  }
});

// Run source discovery for a specific person (legacy heuristic method)
app.post('/api/people/:id/discover', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const person = db.getPersonById(id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const sources = await discoverSourcesForPerson(person.name);
    const savedSources = db.bulkCreateSources(id, sources);

    res.json({
      person_id: id,
      new_sources: savedSources,
      total_sources: savedSources.length,
      method: 'heuristic'
    });
  } catch (error) {
    console.error('Error discovering sources:', error);
    res.status(500).json({ error: 'Failed to discover sources' });
  }
});

// ==================== SOURCES ENDPOINTS ====================

// Get sources for a person
app.get('/api/people/:id/sources', (req, res) => {
  try {
    const sources = db.getSourcesByPersonId(parseInt(req.params.id));
    res.json({ sources });
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// Create new source
app.post('/api/sources', (req, res) => {
  const { person_id, type, url, confidence } = req.body;

  if (!person_id || !type || !url) {
    return res.status(400).json({ error: 'person_id, type, and url are required' });
  }

  try {
    const source = db.createSource(person_id, type, url, confidence);
    res.status(201).json(source);
  } catch (error) {
    console.error('Error creating source:', error);
    res.status(500).json({ error: 'Failed to create source' });
  }
});

// Update source
app.put('/api/sources/:id', (req, res) => {
  const { status, confidence, type, url, last_post_date, avg_posts_per_month } = req.body;
  const id = parseInt(req.params.id);

  try {
    const source = db.updateSource(id, {
      status,
      confidence,
      type,
      url,
      last_post_date,
      avg_posts_per_month
    });
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json(source);
  } catch (error) {
    console.error('Error updating source:', error);
    res.status(500).json({ error: 'Failed to update source' });
  }
});

// Delete source
app.delete('/api/sources/:id', (req, res) => {
  try {
    const success = db.deleteSource(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// Analyze posting frequency for all sources of a person
app.post('/api/people/:id/analyze-frequency', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const person = db.getPersonById(id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const sources = person.sources || [];
    if (sources.length === 0) {
      return res.json({ message: 'No sources to analyze', results: [] });
    }

    // Analyze all sources
    const results = await analyzeAllSources(
      id,
      sources,
      (sourceId, data) => db.updateSource(sourceId, data)
    );

    res.json({
      person_id: id,
      sources_analyzed: results.length,
      results
    });

  } catch (error) {
    console.error('Error analyzing posting frequency:', error);
    res.status(500).json({ error: 'Failed to analyze posting frequency' });
  }
});

// Extract events from all sources of a person
app.post('/api/people/:id/extract-events', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const person = db.getPersonById(id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const sources = person.sources || [];
    if (sources.length === 0) {
      return res.status(400).json({ error: 'No sources found. Discover sources first.' });
    }

    console.log(`\n🎯 Starting event extraction for: ${person.name}`);
    console.log(`📚 Processing ${sources.length} source(s)...\n`);

    let totalExtracted = 0;
    let totalSaved = 0;
    let totalFailed = 0;
    let sourcesProcessed = 0;

    // Process each source
    for (const source of sources) {
      console.log(`\n[${sourcesProcessed + 1}/${sources.length}] Processing: ${source.type} - ${source.url}`);

      try {
        const results = await extractEventsFromSource(
          source.url,
          source.type,
          person.id,
          source.id
        );

        totalExtracted += results.extracted || 0;
        totalSaved += results.saved || 0;
        totalFailed += results.failed || 0;
        sourcesProcessed++;

      } catch (error) {
        console.error(`Error extracting from ${source.url}:`, error.message);
        totalFailed++;
      }

      // Delay between sources to avoid rate limiting
      if (sourcesProcessed < sources.length) {
        console.log('⏳ Waiting 3 seconds before next source...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`\n✅ Extraction complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Sources processed: ${sourcesProcessed}/${sources.length}`);
    console.log(`   - Events extracted: ${totalExtracted}`);
    console.log(`   - Events saved to review queue: ${totalSaved}`);
    console.log(`   - Failed: ${totalFailed}\n`);

    res.json({
      success: true,
      person_id: id,
      person_name: person.name,
      sources_processed: sourcesProcessed,
      total_sources: sources.length,
      events_extracted: totalExtracted,
      events_saved: totalSaved,
      events_failed: totalFailed,
      unverified_events_count: totalSaved
    });

  } catch (error) {
    console.error('Error extracting events:', error);
    res.status(500).json({ error: 'Failed to extract events: ' + error.message });
  }
});

// ==================== EVENTS ENDPOINTS ====================

// Get all events
app.get('/api/events', (req, res) => {
  try {
    const filters = {
      person_id: req.query.person_id ? parseInt(req.query.person_id) : undefined,
      status: req.query.status,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      include_all: req.query.include_all === 'true'
    };

    const events = db.getAllEvents(filters);
    res.json({ events, total: events.length });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get event by ID
app.get('/api/events/:id', (req, res) => {
  try {
    const event = db.getEventById(parseInt(req.params.id));
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Get events for a person
app.get('/api/people/:id/events', (req, res) => {
  try {
    const upcomingOnly = req.query.upcoming_only !== 'false';
    const events = db.getEventsByPersonId(parseInt(req.params.id), upcomingOnly);
    res.json({ events, total: events.length });
  } catch (error) {
    console.error('Error fetching person events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create new event
app.post('/api/events', (req, res) => {
  const { person_id, source_id, title, description, event_date, event_end_date,
          location, venue, city, country, url, confidence, status } = req.body;

  if (!person_id || !title) {
    return res.status(400).json({ error: 'person_id and title are required' });
  }

  try {
    const event = db.createEvent({
      person_id,
      source_id,
      title,
      description,
      event_date,
      event_end_date,
      location,
      venue,
      city,
      country,
      url,
      confidence,
      status
    });
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
app.put('/api/events/:id', (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const event = db.updateEvent(id, req.body);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  try {
    const success = db.deleteEvent(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ==================== UNVERIFIED EVENTS (REVIEW QUEUE) ====================

// Get all unverified events
app.get('/api/events/unverified', (req, res) => {
  try {
    const events = db.getAllUnverifiedEvents();
    res.json({ events, total: events.length });
  } catch (error) {
    console.error('Error fetching unverified events:', error);
    res.status(500).json({ error: 'Failed to fetch unverified events' });
  }
});

// Get unverified event by ID
app.get('/api/events/unverified/:id', (req, res) => {
  try {
    const event = db.getUnverifiedEventById(parseInt(req.params.id));
    if (!event) {
      return res.status(404).json({ error: 'Unverified event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching unverified event:', error);
    res.status(500).json({ error: 'Failed to fetch unverified event' });
  }
});

// Approve unverified event (moves to events table)
app.post('/api/events/unverified/:id/approve', (req, res) => {
  try {
    const event = db.approveEvent(parseInt(req.params.id));
    res.json({
      success: true,
      event,
      message: 'Event approved and will expire in 7 days'
    });
  } catch (error) {
    console.error('Error approving event:', error);
    res.status(500).json({ error: 'Failed to approve event: ' + error.message });
  }
});

// Reject unverified event (delete)
app.delete('/api/events/unverified/:id', (req, res) => {
  try {
    const success = db.deleteUnverifiedEvent(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Unverified event not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting unverified event:', error);
    res.status(500).json({ error: 'Failed to delete unverified event' });
  }
});

// Cleanup expired events
app.post('/api/events/cleanup', (req, res) => {
  try {
    const deleted = db.deleteExpiredEvents();
    res.json({
      success: true,
      deleted_count: deleted,
      message: `Deleted ${deleted} expired event(s)`
    });
  } catch (error) {
    console.error('Error cleaning up events:', error);
    res.status(500).json({ error: 'Failed to cleanup events' });
  }
});

app.listen(PORT, () => {
  console.log(`Event Discovery Agent running on http://localhost:${PORT}`);
});