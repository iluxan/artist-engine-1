const express = require('express');
const path = require('path');
const { discoverSourcesForPerson } = require('./sourceDiscovery');
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

// Run source discovery for a specific person
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
      total_sources: savedSources.length
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
  const { status, confidence } = req.body;
  const id = parseInt(req.params.id);

  try {
    const source = db.updateSource(id, { status, confidence });
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

// ==================== DISCOVERY ENDPOINT (Phase 1) ====================

// Source discovery endpoint
app.post('/api/discover-sources', async (req, res) => {
  const { people, save_to_db } = req.body;

  if (!people || !Array.isArray(people) || people.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of people' });
  }

  if (people.length > 4) {
    return res.status(400).json({ error: 'Maximum 4 people allowed' });
  }

  try {
    const results = await Promise.all(
      people.map(async (personName) => {
        const sources = await discoverSourcesForPerson(personName);

        let personId = null;
        if (save_to_db) {
          const person = db.createPerson(personName);
          personId = person.id;
          db.bulkCreateSources(person.id, sources);
        }

        return {
          person: personName,
          person_id: personId,
          sources
        };
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Error discovering sources:', error);
    res.status(500).json({ error: 'Failed to discover sources' });
  }
});

app.listen(PORT, () => {
  console.log(`Event Discovery Agent running on http://localhost:${PORT}`);
});