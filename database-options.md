# Database Migration Options: From SQLite to Cloud

## 📊 Current Setup

**What we're using:**
- **Database**: SQLite (local file-based)
- **File**: `event-discovery.db` (24KB)
- **ORM/Client**: better-sqlite3 (synchronous Node.js bindings)
- **Schema**: 3 tables (people, sources, events)

**Pros of current setup:**
- ✅ Zero cost
- ✅ Zero latency (local file)
- ✅ Simple - no network calls
- ✅ Perfect for single-user development

**Cons of current setup:**
- ❌ Single-user only (file-based)
- ❌ No cloud backup
- ❌ Can't scale beyond one server
- ❌ No collaboration between users
- ❌ Lost if laptop dies

---

## 🎯 Why Migrate to Cloud Database?

### Reasons TO migrate:
1. **Multi-user support**: Different people can use the app
2. **Data persistence**: Backup in the cloud
3. **Scalability**: Can handle growth
4. **Deploy anywhere**: Not tied to local file
5. **Real-time features**: Supabase offers real-time subscriptions

### Reasons NOT to migrate (yet):
1. **Cost**: Current setup is free
2. **Complexity**: More moving parts
3. **Latency**: Network calls vs local file
4. **Early stage**: No users yet, premature optimization

**Recommendation**: Only migrate when you need multi-user support or deployment.

---

## 🏆 Cloud Database Options Comparison (2025)

### Option 1: Supabase (PostgreSQL) 🥇 RECOMMENDED

**Overview**: Open-source Firebase alternative built on PostgreSQL

**Pros:**
- ✅ **Generous free tier**: Unlimited API requests, 500MB database, 1GB file storage
- ✅ **PostgreSQL**: Mature, SQL-based (similar to SQLite)
- ✅ **Auto-generated APIs**: Instant REST and GraphQL APIs
- ✅ **Built-in Auth**: User authentication ready to go
- ✅ **Real-time subscriptions**: Listen to database changes
- ✅ **Edge Functions**: Serverless functions on Deno runtime
- ✅ **Storage**: File/image storage included
- ✅ **Great DX**: Excellent documentation, dashboard, CLI tools
- ✅ **No credit card**: Free tier doesn't require payment info

**Cons:**
- ❌ Paused after 1 week of inactivity (free tier)
- ❌ Limited to 500MB database on free tier
- ❌ Need to learn PostgreSQL-specific features

**Pricing:**
- **Free**: 500MB database, 1GB storage, unlimited API requests, 2GB bandwidth
- **Pro**: $25/month - 8GB database, 100GB storage, no pausing
- **Team**: $599/month
- **Enterprise**: Custom

**Best for:**
- Full-stack apps with auth needs
- Real-time features (live updates)
- File/image storage requirements
- PostgreSQL familiarity

**Migration effort:** ⭐⭐⭐ Medium (3-4 hours)

---

### Option 2: Neon (PostgreSQL) 🥈 GREAT ALTERNATIVE

**Overview**: Serverless Postgres with database branching

**Pros:**
- ✅ **True serverless**: Scales to zero (no cold start issues)
- ✅ **Database branching**: Git-like branches for your database
- ✅ **Free tier**: 0.5GB storage, unlimited projects
- ✅ **No pausing**: Always available (unlike Supabase free tier)
- ✅ **PostgreSQL**: Same as Supabase
- ✅ **Cost-efficient**: Usage-based pricing starting at $5/month
- ✅ **Instant provisioning**: Database ready in seconds

**Cons:**
- ❌ No built-in auth (database only)
- ❌ No file storage (database only)
- ❌ No auto-generated APIs (need to build yourself)
- ❌ Smaller ecosystem than Supabase

**Pricing:**
- **Free**: 0.5GB storage, 3GB data transfer, unlimited projects
- **Launch**: $5/month usage-based (40-60% cheaper than competitors)
- **Scale**: $69/month

**Best for:**
- Pure database needs (no auth/storage)
- Cost-conscious projects
- Need database branching (test/staging/prod)
- PostgreSQL purists

**Migration effort:** ⭐⭐⭐ Medium (3-4 hours)

---

### Option 3: PlanetScale (MySQL → PostgreSQL in 2025)

**Overview**: Serverless MySQL platform (now with PostgreSQL support)

**Pros:**
- ✅ High performance (2-3x faster than Supabase in benchmarks)
- ✅ Database branching and schema changes
- ✅ Great for scaling to millions of users
- ✅ Excellent tooling and DX

**Cons:**
- ❌ **NO FREE TIER** (removed March 2024)
- ❌ Starts at $39/month minimum
- ❌ MySQL (different from SQLite/PostgreSQL)
- ❌ Overkill for small projects

**Pricing:**
- **Scaler**: $39/month
- **Scaler Pro**: $99/month
- **Enterprise**: Custom

**Best for:**
- High-scale production apps
- Teams with budget
- Need proven horizontal scaling

**Migration effort:** ⭐⭐⭐⭐ High (5-6 hours, MySQL syntax differences)

---

### Option 4: MongoDB Atlas (NoSQL)

**Overview**: Managed MongoDB database service

**Pros:**
- ✅ **Generous free tier**: 512MB storage
- ✅ Natural fit for Node.js (JSON-native)
- ✅ Flexible schema (NoSQL)
- ✅ Great documentation
- ✅ No credit card required

**Cons:**
- ❌ **Different paradigm**: NoSQL vs SQL (learning curve)
- ❌ Need to rewrite all queries
- ❌ Lose SQL relationships and constraints
- ❌ More complex migration

**Pricing:**
- **Free**: M0 cluster with 512MB storage
- **Shared**: $9-25/month
- **Dedicated**: Starts at $57/month

**Best for:**
- Projects that benefit from schema flexibility
- Teams familiar with MongoDB
- Document-oriented data (not relational)

**Migration effort:** ⭐⭐⭐⭐⭐ Very High (6-8 hours, complete rewrite)

---

### Option 5: Turso (SQLite in the cloud)

**Overview**: Edge-hosted SQLite with LibSQL (SQLite fork)

**Pros:**
- ✅ **Actually SQLite**: Same syntax, minimal changes
- ✅ **Free tier**: 9GB storage, 1 billion rows/month
- ✅ Edge deployment (low latency globally)
- ✅ Easiest migration (almost zero code changes)
- ✅ Multi-region replication

**Cons:**
- ❌ Newer/smaller ecosystem
- ❌ Limited tooling compared to PostgreSQL
- ❌ SQLite limitations (concurrent writes, no full-text search)

**Pricing:**
- **Starter**: Free - 9GB storage, 1B rows/month, 3 locations
- **Scaler**: $29/month
- **Enterprise**: Custom

**Best for:**
- Keep SQLite syntax
- Need global edge deployment
- Easiest migration path

**Migration effort:** ⭐ Very Low (1 hour, mostly config)

---

## 📋 Quick Comparison Table

| Feature | Supabase | Neon | PlanetScale | MongoDB | Turso |
|---------|----------|------|-------------|---------|-------|
| **Database** | PostgreSQL | PostgreSQL | MySQL/PG | MongoDB | SQLite |
| **Free Tier** | ✅ 500MB | ✅ 0.5GB | ❌ None | ✅ 512MB | ✅ 9GB |
| **Migration** | Medium | Medium | High | Very High | Easy |
| **Built-in Auth** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Real-time** | ✅ Yes | ❌ No | ❌ No | ✅ Yes | ❌ No |
| **Auto APIs** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Cost (paid)** | $25/mo | $5/mo | $39/mo | $9/mo | $29/mo |
| **Best for** | Full-stack | Pure DB | Enterprise | NoSQL | SQLite |

---

## 🎯 Recommendation for This Project

### 🥇 First Choice: **Supabase**

**Why:**
1. **Best free tier** for features (auth, storage, real-time)
2. **PostgreSQL** is mature and similar enough to SQLite
3. **Auto-generated APIs** save development time
4. **Future-proof**: Can add auth, file storage, real-time later
5. **Great DX**: Excellent docs and tooling
6. **No credit card** required to start

**When to use:**
- Ready to deploy for multiple users
- Want auth/user management
- Need file/image storage
- Want real-time features

---

### 🥈 Second Choice: **Turso**

**Why:**
1. **Easiest migration** (keeps SQLite syntax)
2. **Huge free tier** (9GB vs 500MB)
3. **Lowest effort** (1 hour vs 3-4 hours)
4. **Edge deployment** (low latency globally)

**When to use:**
- Want to stay with SQLite
- Don't need auth/storage built-in
- Want quick cloud backup without complexity

---

### 🥉 Third Choice: **Stay with SQLite for now**

**Why:**
- Project is early stage
- No users yet
- Works perfectly for development
- Can always migrate later

**When to migrate:**
- When you get your first real user
- When deploying to production
- When you need collaboration

---

## 🔧 Migration Guide: SQLite → Supabase

### Step 1: Setup Supabase Project (5 minutes)

```bash
# 1. Go to https://supabase.com and sign up (free)
# 2. Create new project
# 3. Note your project URL and API key
# 4. Install Supabase client
npm install @supabase/supabase-js
```

---

### Step 2: Update Environment Variables (2 minutes)

Add to `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

### Step 3: Create Schema in Supabase (10 minutes)

Go to Supabase Dashboard → SQL Editor → New Query:

```sql
-- Create people table
CREATE TABLE people (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sources table
CREATE TABLE sources (
  id BIGSERIAL PRIMARY KEY,
  person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  confidence TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMPTZ,
  last_content_check TIMESTAMPTZ,
  metadata JSONB,
  ai_confidence_score INTEGER,
  ai_analysis_summary TEXT,
  platform_id TEXT,
  UNIQUE(person_id, url)
);

-- Create events table
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  source_id BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT,
  date TIMESTAMPTZ,
  location TEXT,
  url TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger for people
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER people_updated_at
BEFORE UPDATE ON people
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create indexes
CREATE INDEX idx_sources_person_id ON sources(person_id);
CREATE INDEX idx_events_person_id ON events(person_id);
CREATE INDEX idx_events_source_id ON events(source_id);
```

---

### Step 4: Create New Database Client (30 minutes)

Create `db-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side
);

// People queries
async function getAllPeople() {
  const { data, error } = await supabase
    .from('people')
    .select(`
      *,
      sources:sources(count)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform to match SQLite structure
  return data.map(person => ({
    ...person,
    source_count: person.sources[0]?.count || 0
  }));
}

async function getPersonById(id) {
  const { data: person, error: personError } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single();

  if (personError) throw personError;

  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('*')
    .eq('person_id', id)
    .order('discovered_at', { ascending: false });

  if (sourcesError) throw sourcesError;

  return { ...person, sources };
}

async function createPerson(name, notes = null) {
  const { data, error } = await supabase
    .from('people')
    .insert({ name, notes })
    .select()
    .single();

  if (error) throw error;
  return getPersonById(data.id);
}

async function updatePerson(id, updates) {
  const { error } = await supabase
    .from('people')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return getPersonById(id);
}

async function deletePerson(id) {
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id);

  return !error;
}

// Sources queries
async function getSourcesByPersonId(personId) {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('person_id', personId)
    .order('discovered_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function createSource(personId, type, url, confidence = 'medium') {
  const { data, error } = await supabase
    .from('sources')
    .insert({ person_id: personId, type, url, confidence })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('sources')
        .select('*')
        .eq('person_id', personId)
        .eq('url', url)
        .single();
      return existing;
    }
    throw error;
  }

  return data;
}

async function updateSource(id, updates) {
  const { data, error } = await supabase
    .from('sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteSource(id) {
  const { error } = await supabase
    .from('sources')
    .delete()
    .eq('id', id);

  return !error;
}

async function bulkCreateSources(personId, sources) {
  const { error } = await supabase
    .from('sources')
    .insert(
      sources.map(s => ({
        person_id: personId,
        type: s.type,
        url: s.url,
        confidence: s.confidence || 'medium'
      }))
    );

  if (error) throw error;
  return getSourcesByPersonId(personId);
}

module.exports = {
  supabase,
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
```

---

### Step 5: Migrate Existing Data (15 minutes)

Create `migrate-to-supabase.js`:

```javascript
const sqlite = require('./db'); // Old SQLite db
const supabase = require('./db-supabase'); // New Supabase db

async function migrateData() {
  console.log('Starting migration...');

  // 1. Migrate people
  const people = sqlite.getAllPeople();
  console.log(`Migrating ${people.length} people...`);

  for (const person of people) {
    const newPerson = await supabase.createPerson(person.name, person.notes);
    console.log(`✓ Migrated: ${person.name} (${person.id} → ${newPerson.id})`);

    // 2. Migrate sources for this person
    const sources = sqlite.getSourcesByPersonId(person.id);
    if (sources.length > 0) {
      await supabase.bulkCreateSources(newPerson.id, sources);
      console.log(`  ✓ Migrated ${sources.length} sources`);
    }
  }

  console.log('Migration complete! ✅');
}

migrateData().catch(console.error);
```

Run migration:
```bash
node migrate-to-supabase.js
```

---

### Step 6: Switch Database in Server (5 minutes)

In `server.js`, change:

```javascript
// OLD:
const db = require('./db');

// NEW:
const db = require('./db-supabase');
```

That's it! Everything else stays the same because the function signatures match.

---

### Step 7: Test & Deploy (15 minutes)

```bash
# Test locally
npm start

# Verify all features work:
# - Add person
# - AI discover
# - View person
# - Add source manually
# - Delete source
# - Edit person
# - Delete person

# Deploy (if using Vercel, Render, etc.)
git add .
git commit -m "Migrate to Supabase"
git push
```

---

## 📊 Migration Effort Comparison

| Database | Migration Time | Code Changes | Data Migration | Risk Level |
|----------|---------------|--------------|----------------|------------|
| Turso | 1 hour | Minimal (config) | Easy | Low |
| Supabase | 3-4 hours | New client | Manual script | Medium |
| Neon | 3-4 hours | New client | Manual script | Medium |
| PlanetScale | 5-6 hours | MySQL syntax | Complex | High |
| MongoDB | 6-8 hours | Complete rewrite | Very complex | Very High |

---

## 💰 Cost Comparison (After Free Tier)

For small production app with 100 users:

| Database | Free Tier Limit | Monthly Cost After |
|----------|----------------|-------------------|
| Supabase | 500MB, pauses after 1 week | $25/mo |
| Neon | 0.5GB, no pause | $5-10/mo (usage-based) |
| Turso | 9GB, 1B rows | $29/mo |
| PlanetScale | None | $39/mo minimum |
| MongoDB | 512MB | $9/mo |

---

## 🎬 Final Recommendation

### For This Project:

**Stay with SQLite for now**, BUT be ready to migrate to **Supabase** when:
1. You deploy to production
2. You get your first real user
3. You need multi-user support

**Why wait?**
- Current setup works perfectly
- No users yet = no urgency
- Can migrate in 3-4 hours when needed

**Why Supabase when ready?**
- Best free tier features (auth, storage, real-time)
- PostgreSQL (similar to SQLite)
- Auto-generated APIs
- Room to grow

---

## 📚 Resources

- **Supabase**: https://supabase.com/docs
- **Neon**: https://neon.tech/docs
- **Turso**: https://docs.turso.tech/
- **PlanetScale**: https://planetscale.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/

---

## ❓ Decision Matrix

**Choose SQLite if:**
- ✅ Single user / development
- ✅ Want simplicity
- ✅ No deployment yet

**Choose Turso if:**
- ✅ Want to keep SQLite syntax
- ✅ Need global edge deployment
- ✅ Want easiest migration

**Choose Supabase if:**
- ✅ Need auth and storage
- ✅ Want real-time features
- ✅ Building full-stack app
- ✅ Want auto-generated APIs

**Choose Neon if:**
- ✅ Pure database needs
- ✅ Want database branching
- ✅ Cost is critical
- ✅ Don't need auth/storage

**Choose PlanetScale if:**
- ✅ Have budget ($39+/mo)
- ✅ Need proven scaling
- ✅ Enterprise requirements

**Choose MongoDB if:**
- ✅ Need schema flexibility
- ✅ Document-oriented data
- ✅ Already know MongoDB
- ✅ Willing to rewrite queries
