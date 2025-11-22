const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, 'event-discovery.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
function initializeDatabase() {
  // Create people table
  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sources table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      confidence TEXT,
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_checked DATETIME,
      status TEXT DEFAULT 'active',
      verified BOOLEAN DEFAULT 0,
      verification_date DATETIME,
      last_content_check DATETIME,
      metadata TEXT,
      ai_confidence_score INTEGER,
      ai_analysis_summary TEXT,
      platform_id TEXT,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      UNIQUE(person_id, url)
    )
  `);

  // Add new columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE sources ADD COLUMN last_post_date DATETIME`);
    console.log('Added last_post_date column');
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec(`ALTER TABLE sources ADD COLUMN avg_posts_per_month REAL`);
    console.log('Added avg_posts_per_month column');
  } catch (e) {
    // Column already exists
  }

  // Create unverified_events table (review queue)
  db.exec(`
    CREATE TABLE IF NOT EXISTS unverified_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      source_id INTEGER,
      title TEXT NOT NULL,
      date TEXT,
      location TEXT,
      url TEXT,
      registration_url TEXT,
      extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verification_http_check BOOLEAN DEFAULT 0,
      verification_content_match BOOLEAN DEFAULT 0,
      verification_date_valid BOOLEAN DEFAULT 0,
      verification_registration_url BOOLEAN DEFAULT 0,
      verification_errors TEXT,
      original_post_url TEXT,
      original_post_text TEXT,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
    )
  `);

  // Create events table (Phase 4)
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      source_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATETIME,
      event_end_date DATETIME,
      location TEXT,
      venue TEXT,
      city TEXT,
      country TEXT,
      url TEXT,
      ticket_url TEXT,
      confidence TEXT,
      status TEXT DEFAULT 'upcoming',
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_verified DATETIME,
      external_id TEXT,
      raw_data TEXT,
      expires_at DATETIME,
      approved_at DATETIME,
      verification_status TEXT,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
    )
  `);

  // Add index for event queries
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_events_person_date ON events(person_id, event_date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);
  } catch (e) {
    // Index already exists
  }

  // Migrate existing events table if needed
  try {
    // Check if old schema exists (has 'date' column instead of 'event_date')
    const tableInfo = db.prepare("PRAGMA table_info(events)").all();
    const hasOldSchema = tableInfo.some(col => col.name === 'date') && !tableInfo.some(col => col.name === 'event_date');

    if (hasOldSchema) {
      console.log('Migrating events table to new schema...');

      // Create backup
      db.exec(`CREATE TABLE events_backup AS SELECT * FROM events`);

      // Drop old table
      db.exec(`DROP TABLE events`);

      // Recreate with new schema
      db.exec(`
        CREATE TABLE events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id INTEGER NOT NULL,
          source_id INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          event_date DATETIME,
          event_end_date DATETIME,
          location TEXT,
          venue TEXT,
          city TEXT,
          country TEXT,
          url TEXT,
          ticket_url TEXT,
          confidence TEXT,
          status TEXT DEFAULT 'upcoming',
          discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_verified DATETIME,
          external_id TEXT,
          raw_data TEXT,
          FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
          FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
        )
      `);

      // Migrate data from backup
      db.exec(`
        INSERT INTO events (id, person_id, source_id, title, event_date, location, url, discovered_at, status)
        SELECT id, person_id, source_id, title, date, location, url, discovered_at, 'upcoming'
        FROM events_backup
      `);

      // Drop backup
      db.exec(`DROP TABLE events_backup`);

      console.log('Events table migration completed');
    }
  } catch (e) {
    console.error('Error during events table migration:', e.message);
  }

  console.log('Database initialized successfully');
}

// People queries
function getAllPeople() {
  const query = `
    SELECT
      p.*,
      COUNT(s.id) as source_count
    FROM people p
    LEFT JOIN sources s ON p.id = s.person_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return db.prepare(query).all();
}

function getPersonById(id) {
  const person = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
  if (!person) return null;

  const sources = db.prepare('SELECT * FROM sources WHERE person_id = ? ORDER BY discovered_at DESC').all(id);
  return { ...person, sources };
}

function createPerson(name, notes = null) {
  const stmt = db.prepare('INSERT INTO people (name, notes) VALUES (?, ?)');
  const result = stmt.run(name, notes);
  return getPersonById(result.lastInsertRowid);
}

function updatePerson(id, data) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    values.push(data.notes);
  }

  if (fields.length === 0) return getPersonById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const query = `UPDATE people SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  return getPersonById(id);
}

function deletePerson(id) {
  const stmt = db.prepare('DELETE FROM people WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Sources queries
function getSourcesByPersonId(personId) {
  return db.prepare('SELECT * FROM sources WHERE person_id = ? ORDER BY discovered_at DESC').all(personId);
}

function createSource(personId, type, url, confidence = 'medium') {
  try {
    const stmt = db.prepare('INSERT INTO sources (person_id, type, url, confidence) VALUES (?, ?, ?, ?)');
    const result = stmt.run(personId, type, url, confidence);
    return db.prepare('SELECT * FROM sources WHERE id = ?').get(result.lastInsertRowid);
  } catch (error) {
    // Handle unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return db.prepare('SELECT * FROM sources WHERE person_id = ? AND url = ?').get(personId, url);
    }
    throw error;
  }
}

function updateSource(id, data) {
  const fields = [];
  const values = [];

  if (data.status !== undefined) {
    fields.push('status = ?');
    values.push(data.status);
  }
  if (data.confidence !== undefined) {
    fields.push('confidence = ?');
    values.push(data.confidence);
  }
  if (data.last_checked !== undefined) {
    fields.push('last_checked = ?');
    values.push(data.last_checked);
  }
  if (data.type !== undefined) {
    fields.push('type = ?');
    values.push(data.type);
  }
  if (data.url !== undefined) {
    fields.push('url = ?');
    values.push(data.url);
  }
  if (data.last_post_date !== undefined) {
    fields.push('last_post_date = ?');
    values.push(data.last_post_date);
  }
  if (data.avg_posts_per_month !== undefined) {
    fields.push('avg_posts_per_month = ?');
    values.push(data.avg_posts_per_month);
  }

  if (fields.length === 0) {
    return db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
  }

  values.push(id);
  const query = `UPDATE sources SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  return db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
}

function deleteSource(id) {
  const stmt = db.prepare('DELETE FROM sources WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function bulkCreateSources(personId, sources) {
  const insertStmt = db.prepare('INSERT OR IGNORE INTO sources (person_id, type, url, confidence) VALUES (?, ?, ?, ?)');
  const insertMany = db.transaction((sources) => {
    for (const source of sources) {
      insertStmt.run(personId, source.type, source.url, source.confidence || 'medium');
    }
  });

  insertMany(sources);
  return getSourcesByPersonId(personId);
}

// Events queries
function getAllEvents(filters = {}) {
  let query = `
    SELECT
      e.*,
      p.name as person_name,
      s.url as source_url,
      s.type as source_type
    FROM events e
    JOIN people p ON e.person_id = p.id
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.person_id) {
    query += ' AND e.person_id = ?';
    params.push(filters.person_id);
  }

  if (filters.status) {
    query += ' AND e.status = ?';
    params.push(filters.status);
  }

  if (filters.date_from) {
    query += ' AND e.event_date >= ?';
    params.push(filters.date_from);
  }

  if (filters.date_to) {
    query += ' AND e.event_date <= ?';
    params.push(filters.date_to);
  }

  // Default to upcoming events only if no status filter
  if (!filters.status && !filters.include_all) {
    query += ' AND e.status = ?';
    params.push('upcoming');
  }

  query += ' ORDER BY e.event_date ASC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  return db.prepare(query).all(...params);
}

function getEventById(id) {
  const query = `
    SELECT
      e.*,
      p.name as person_name,
      s.url as source_url,
      s.type as source_type
    FROM events e
    JOIN people p ON e.person_id = p.id
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE e.id = ?
  `;
  return db.prepare(query).get(id);
}

function getEventsByPersonId(personId, upcomingOnly = true) {
  let query = `
    SELECT
      e.*,
      s.url as source_url,
      s.type as source_type
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE e.person_id = ?
  `;

  if (upcomingOnly) {
    query += ' AND e.status = ?';
    return db.prepare(query + ' ORDER BY e.event_date ASC').all(personId, 'upcoming');
  }

  return db.prepare(query + ' ORDER BY e.event_date DESC').all(personId);
}

function createEvent(data) {
  const stmt = db.prepare(`
    INSERT INTO events (
      person_id, source_id, title, description, event_date, event_end_date,
      location, venue, city, country, url, ticket_url, confidence, status, external_id, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.person_id,
    data.source_id || null,
    data.title,
    data.description || null,
    data.event_date || null,
    data.event_end_date || null,
    data.location || null,
    data.venue || null,
    data.city || null,
    data.country || null,
    data.url || null,
    data.ticket_url || null,
    data.confidence || 'medium',
    data.status || 'upcoming',
    data.external_id || null,
    data.raw_data ? JSON.stringify(data.raw_data) : null
  );

  return getEventById(result.lastInsertRowid);
}

function updateEvent(id, data) {
  const fields = [];
  const values = [];

  const allowedFields = [
    'title', 'description', 'event_date', 'event_end_date',
    'location', 'venue', 'city', 'country', 'url', 'ticket_url',
    'confidence', 'status', 'last_verified'
  ];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  });

  if (fields.length === 0) {
    return getEventById(id);
  }

  values.push(id);
  const query = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  return getEventById(id);
}

function deleteEvent(id) {
  const stmt = db.prepare('DELETE FROM events WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Unverified Events queries (review queue)
function createUnverifiedEvent(data, verificationResults) {
  const stmt = db.prepare(`
    INSERT INTO unverified_events (
      person_id, source_id, title, date, location, url, registration_url,
      verification_http_check, verification_content_match, verification_date_valid, verification_registration_url,
      verification_errors, original_post_url, original_post_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.person_id,
    data.source_id || null,
    data.title,
    data.date || null,
    data.location || null,
    data.url || null,
    data.registration_url || null,
    verificationResults.httpCheck ? 1 : 0,
    verificationResults.contentValidation ? 1 : 0,
    verificationResults.dateSanity ? 1 : 0,
    verificationResults.registrationUrl ? 1 : 0,
    verificationResults.errors ? JSON.stringify(verificationResults.errors) : null,
    data.original_post_url || null,
    data.original_post_text || null
  );

  return getUnverifiedEventById(result.lastInsertRowid);
}

function getAllUnverifiedEvents() {
  const query = `
    SELECT
      ue.*,
      p.name as person_name,
      s.url as source_url,
      s.type as source_type
    FROM unverified_events ue
    JOIN people p ON ue.person_id = p.id
    LEFT JOIN sources s ON ue.source_id = s.id
    ORDER BY ue.extracted_at DESC
  `;
  return db.prepare(query).all();
}

function getUnverifiedEventById(id) {
  const query = `
    SELECT
      ue.*,
      p.name as person_name,
      s.url as source_url,
      s.type as source_type
    FROM unverified_events ue
    JOIN people p ON ue.person_id = p.id
    LEFT JOIN sources s ON ue.source_id = s.id
    WHERE ue.id = ?
  `;
  return db.prepare(query).get(id);
}

function getUnverifiedEventsByPersonId(personId) {
  const query = `
    SELECT
      ue.*,
      s.url as source_url,
      s.type as source_type
    FROM unverified_events ue
    LEFT JOIN sources s ON ue.source_id = s.id
    WHERE ue.person_id = ?
    ORDER BY ue.extracted_at DESC
  `;
  return db.prepare(query).all(personId);
}

function deleteUnverifiedEvent(id) {
  const stmt = db.prepare('DELETE FROM unverified_events WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

function approveEvent(unverifiedEventId) {
  const unverifiedEvent = getUnverifiedEventById(unverifiedEventId);
  if (!unverifiedEvent) {
    throw new Error('Unverified event not found');
  }

  // Calculate expiry date (7 days from now)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Create verification status JSON
  const verificationStatus = {
    httpCheck: unverifiedEvent.verification_http_check === 1,
    contentValidation: unverifiedEvent.verification_content_match === 1,
    dateSanity: unverifiedEvent.verification_date_valid === 1,
    registrationUrl: unverifiedEvent.verification_registration_url === 1,
    errors: unverifiedEvent.verification_errors ? JSON.parse(unverifiedEvent.verification_errors) : []
  };

  // Insert into events table
  const eventData = {
    person_id: unverifiedEvent.person_id,
    source_id: unverifiedEvent.source_id,
    title: unverifiedEvent.title,
    event_date: unverifiedEvent.date,
    location: unverifiedEvent.location,
    url: unverifiedEvent.url,
    ticket_url: unverifiedEvent.registration_url,
    status: 'upcoming',
    raw_data: {
      original_post_url: unverifiedEvent.original_post_url,
      original_post_text: unverifiedEvent.original_post_text
    }
  };

  const stmt = db.prepare(`
    INSERT INTO events (
      person_id, source_id, title, event_date, location, url, ticket_url,
      status, approved_at, expires_at, verification_status, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    eventData.person_id,
    eventData.source_id,
    eventData.title,
    eventData.event_date,
    eventData.location,
    eventData.url,
    eventData.ticket_url,
    eventData.status,
    now.toISOString(),
    expiresAt.toISOString(),
    JSON.stringify(verificationStatus),
    JSON.stringify(eventData.raw_data)
  );

  // Delete from unverified_events
  deleteUnverifiedEvent(unverifiedEventId);

  return getEventById(result.lastInsertRowid);
}

function deleteExpiredEvents() {
  const now = new Date().toISOString();
  const stmt = db.prepare('DELETE FROM events WHERE expires_at < ?');
  const result = stmt.run(now);
  return result.changes;
}

// Initialize database on module load
initializeDatabase();

module.exports = {
  db,
  getAllPeople,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  getSourcesByPersonId,
  createSource,
  updateSource,
  deleteSource,
  bulkCreateSources,
  getAllEvents,
  getEventById,
  getEventsByPersonId,
  createEvent,
  updateEvent,
  deleteEvent,
  createUnverifiedEvent,
  getAllUnverifiedEvents,
  getUnverifiedEventById,
  getUnverifiedEventsByPersonId,
  deleteUnverifiedEvent,
  approveEvent,
  deleteExpiredEvents
};