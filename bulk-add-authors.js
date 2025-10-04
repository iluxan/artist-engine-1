const db = require('./db');
const { discoverSourcesWithAI } = require('./aiSourceDiscovery');

// Author list with notes
const authors = [
  { name: "Ursula K. Le Guin", notes: "Science fiction and fantasy author (1929-2018)" },
  { name: "James S.A. Corey", notes: "Pen name for Daniel Abraham and Ty Franck, The Expanse series" },
  { name: "Neil Gaiman", notes: "British fantasy and graphic novel author" },
  { name: "Charles Stross", notes: "Science fiction author, Laundry Files series" },
  // { name: "Nnedi Okorafor", notes: "Nigerian-American science fiction and fantasy author" },
  // { name: "Philip K. Dick", notes: "Science fiction author (1928-1982)" },
  // { name: "N.K. Jemisin", notes: "Science fiction and fantasy author, Broken Earth trilogy" },
  { name: "Catherynne M. Valente", notes: "Fantasy and science fiction author" },
  // { name: "Cory Doctorow", notes: "Science fiction author and digital rights activist" },
  // { name: "Terry Pratchett", notes: "Fantasy author, Discworld series (1948-2015)" },
  // { name: "Octavia E. Butler", notes: "Science fiction author (1947-2006)" },
  // { name: "Martha Wells", notes: "Science fiction and fantasy author, Murderbot Diaries" },
  // { name: "John Scalzi", notes: "Science fiction author, Old Man's War series" },
  // { name: "Jo Walton", notes: "Fantasy and science fiction author" },
  // { name: "Becky Chambers", notes: "Science fiction author, Wayfarers series" },
  // { name: "Warren Ellis", notes: "Comic book writer and novelist" },
  // { name: "Orson Scott Card", notes: "Science fiction author, Ender's Game series" },
  // { name: "Margaret Atwood", notes: "Canadian author, The Handmaid's Tale" },
  // { name: "William Gibson", notes: "Cyberpunk author, Neuromancer" },
  // { name: "Nicola Griffith", notes: "Science fiction author" },
  // { name: "Neal Stephenson", notes: "Science fiction author, Snow Crash, Cryptonomicon" },
  // { name: "Malka Ann Older", notes: "Science fiction author, Centenal Cycle series" },
  // { name: "Jonathan Franzen", notes: "Literary fiction author" },
  // { name: "Robert Jackson Bennett", notes: "Fantasy author, Foundryside series" },
  // { name: "Lois McMaster Bujold", notes: "Science fiction author, Vorkosigan Saga" },
  // { name: "Liu Cixin", notes: "Chinese science fiction author, The Three-Body Problem" },
  // { name: "Kim Stanley Robinson", notes: "Science fiction author, Mars trilogy" },
  // { name: "Ken Liu", notes: "Chinese-American science fiction author" },
  // { name: "Kazuo Ishiguro", notes: "British novelist, Never Let Me Go" },
  // { name: "Jeff VanderMeer", notes: "Weird fiction author, Annihilation" },
  // { name: "Greg Egan", notes: "Australian science fiction author" },
  // { name: "Django Wexler", notes: "Fantasy author, The Shadow Campaigns" },
  { name: "Bruce Sterling", notes: "Cyberpunk author and design futurist" }
];

async function addAuthorsWithDiscovery() {
  console.log(`\n🚀 Starting bulk author import with AI discovery...\n`);
  console.log(`Total authors: ${authors.length}\n`);

  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    console.log(`\n[$${i + 1}/${authors.length}] Processing: ${author.name}`);
    console.log(`Notes: ${author.notes}`);

    try {
      // Check if author already exists
      const existing = db.getAllPeople().find(p =>
        p.name.toLowerCase() === author.name.toLowerCase()
      );

      let person;
      if (existing) {
        console.log(`  ⚠️  Author already exists (ID: ${existing.id})`);
        person = existing;
      } else {
        // Add author to database
        person = db.createPerson(author.name, author.notes);
        console.log(`  ✅ Added to database (ID: ${person.id})`);
      }

      // Run AI discovery
      console.log(`  🤖 Running AI source discovery...`);
      const sources = await discoverSourcesWithAI(author.name, author.notes);

      if (sources && sources.length > 0) {
        console.log(`  ✅ Found ${sources.length} sources`);

        // Save sources to database
        const savedSources = db.bulkCreateSources(person.id, sources);
        console.log(`  💾 Saved ${savedSources.length} sources to database`);

        // Show discovered sources
        sources.forEach((s, idx) => {
          console.log(`     ${idx + 1}. [${s.type}] ${s.url} (confidence: ${s.confidence})`);
        });

        results.push({
          author: author.name,
          person_id: person.id,
          sources_found: sources.length,
          status: 'success'
        });
        successCount++;
      } else {
        console.log(`  ⚠️  No sources found`);
        results.push({
          author: author.name,
          person_id: person.id,
          sources_found: 0,
          status: 'no_sources'
        });
      }

      // Small delay to avoid rate limiting
      if (i < authors.length - 1) {
        console.log(`  ⏱️  Waiting 2 seconds before next author...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      results.push({
        author: author.name,
        status: 'error',
        error: error.message
      });
      errorCount++;
    }
  }

  // Summary
  console.log(`\n\n==================== SUMMARY ====================`);
  console.log(`Total authors processed: ${authors.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`\nTotal sources discovered: ${results.reduce((sum, r) => sum + (r.sources_found || 0), 0)}`);

  console.log(`\n\n==================== RESULTS ====================`);
  results.forEach((r, idx) => {
    const status = r.status === 'success' ? '✅' : r.status === 'no_sources' ? '⚠️' : '❌';
    console.log(`${status} ${r.author}: ${r.sources_found || 0} sources`);
  });

  console.log(`\n✨ Done!\n`);
}

// Run the import
addAuthorsWithDiscovery().catch(console.error);
