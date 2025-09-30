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
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      UNIQUE(person_id, url)
    )
  `);

  // Create events table (for phase 3)
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      source_id INTEGER,
      title TEXT,
      date DATETIME,
      location TEXT,
      url TEXT,
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
    )
  `);

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
  bulkCreateSources
};