const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const db = require('./db');
const { fetchAndClean } = require('./scrape');
const { extractEventsFromContent, MODEL } = require('./promptTemplate');
const { logExtractionRun } = require('./extractionLog');
const { stripTracking } = require('./urlUtils');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Validate event date is sane (future date, not too far, not countdown)
 */
function validateEventDate(dateString) {
  if (!dateString) return false;

  try {
    const eventDate = new Date(dateString);
    const now = new Date();
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(now.getFullYear() + 2);

    // Check if date is valid
    if (isNaN(eventDate.getTime())) return false;

    // Check if date is in the future (or within 24 hours past for edge cases)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (eventDate < oneDayAgo) return false;

    // Check if date is not more than 2 years in the future
    if (eventDate > twoYearsFromNow) return false;

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if event has a registration/ticket URL
 */
async function checkRegistrationUrl(event) {
  // If explicit registration URL provided
  if (event.registration_url) return true;

  // Check if event URL itself might be a registration page
  if (event.url) {
    const urlLower = event.url.toLowerCase();
    const registrationKeywords = ['ticket', 'register', 'rsvp', 'eventbrite', 'dice', 'event', 'booking'];

    // Check URL contains registration keywords
    if (registrationKeywords.some(keyword => urlLower.includes(keyword))) {
      return true;
    }
  }

  return false;
}

/**
 * Validate event content matches using AI
 */
async function validateEventContent(event, pageContent) {
  if (!pageContent || pageContent.length < 100) return false;

  try {
    const prompt = `You are verifying if a webpage actually describes a specific event.

Event details to verify:
- Title: ${event.title}
- Date: ${event.date || 'Unknown'}
- Location: ${event.location || 'Unknown'}

Webpage content (first 3000 chars):
${pageContent.substring(0, 3000)}

Questions:
1. Does this webpage actually describe the event "${event.title}"?
2. Is this a real event announcement (not a countdown timer, promotional content, or homepage)?
3. Does the webpage mention the event date ${event.date}?
4. Does the content match the event details above?

Answer with ONLY "YES" or "NO" - nothing else.
If the page actually describes this specific event, answer YES.
If the page is just a homepage, countdown, or doesn't match, answer NO.`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 10,
      temperature: 0.1,
      system: 'You verify if webpages match event details. Answer only YES or NO.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const answer = (message.content.find(b => b.type === 'text')?.text || '').trim().toUpperCase();
    return answer === 'YES';
  } catch (error) {
    console.error(`   Error validating content: ${error.message}`);
    return false;
  }
}

/**
 * Main verification pipeline - runs 4 checks on an event
 */
async function verifyEvent(event) {
  const results = {
    // "URL Works" (HTTP liveness) check DISABLED — it has no correctness meaning
    // (real events at bot-blocked venues fail it; hallucinated events at live pages
    // pass it). Correctness is guarded by the promptfoo golden set instead.
    // httpCheck: false,
    contentValidation: false,
    dateSanity: false,
    registrationUrl: false,
    errors: []
  };

  console.log(`      [Verify] Checking: ${event.title.substring(0, 50)}...`);

  // Fetch the page ONLY to feed Content Matches (not to score "URL Works").
  if (event.url) {
    try {
      const response = await axios.get(event.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status === 200) {
        // AI Content Validation (Content Matches)
        const $ = cheerio.load(response.data);
        const pageText = $('body').text().replace(/\s+/g, ' ');
        results.contentValidation = await validateEventContent(event, pageText);

        if (results.contentValidation) {
          console.log(`      [Verify] ✓ Content validation passed`);
        } else {
          console.log(`      [Verify] ✗ Content validation failed`);
          results.errors.push('Page content does not match event details');
        }
      }
    } catch (error) {
      // Fetch failed — can't run Content Matches; NOT treated as a URL-Works failure.
      console.log(`      [Verify] content fetch failed (not scored): ${error.message}`);
    }
  }

  // Date Sanity Check
  results.dateSanity = validateEventDate(event.date);
  if (results.dateSanity) {
    console.log(`      [Verify] ✓ Date validation passed`);
  } else {
    console.log(`      [Verify] ✗ Date validation failed`);
    results.errors.push('Invalid or implausible date');
  }

  // Step 4: Registration URL Check
  results.registrationUrl = await checkRegistrationUrl(event);
  if (results.registrationUrl) {
    console.log(`      [Verify] ✓ Registration URL found`);
  } else {
    console.log(`      [Verify] ✗ No registration URL`);
    results.errors.push('No registration/ticket URL found');
  }

  const passedCount = Object.values(results).filter(v => v === true).length;
  console.log(`      [Verify] Result: ${passedCount}/3 checks passed`);

  return results;
}

/**
 * Extract events from a source URL: scrape it (same path as the eval fixtures),
 * run the SHARED person-scoped prompt, verify each event, save to the review queue,
 * and append the whole run to the structured extraction log.
 *
 * @param {string} url - Source URL to scrape
 * @param {string} sourceType - Type of source (blog, twitter, etc.)
 * @param {number} personId - Person ID
 * @param {number} sourceId - Source ID
 * @param {string} personName - Name of the tracked person (scopes extraction)
 * @returns {Object} Extraction results summary
 */
async function extractEventsFromSource(url, sourceType, personId, sourceId, personName) {
  console.log(`\n📰 Extracting events from: ${url}  (tracking: ${personName || 'unknown'})`);

  const results = { extracted: 0, verified: 0, saved: 0, failed: 0 };

  // Step 1: Scrape (shared with evals/fetch-fixture via scrape.js)
  let scrape;
  try {
    scrape = await fetchAndClean(url);
    console.log(`   ✓ Scraped ${scrape.content.length} chars (HTTP ${scrape.status})`);
  } catch (error) {
    console.error(`   ❌ Scrape failed for ${url}: ${error.message} (status ${error.status})`);
    logExtractionRun({
      person: personName, personId, sourceId, sourceType, url,
      httpStatus: error.status, content: '', model: MODEL, extracted: [], saved: 0,
      error: `scrape: ${error.message}`,
    });
    results.failed = 1;
    return results;
  }

  // Step 2: Extract with the shared, person-scoped prompt
  let events = [];
  let extractError = null;
  try {
    events = await extractEventsFromContent(scrape.content, { person: personName });
    console.log(`   🤖 Extracted ${events.length} candidate event(s)`);
  } catch (error) {
    extractError = error.message;
    console.error(`   ❌ Extraction failed: ${error.message}`);
  }
  results.extracted = events.length;

  // Step 3: Verify each candidate and save to the review queue (unverified_events)
  for (const event of events) {
    const eventData = {
      person_id: personId,
      source_id: sourceId,
      title: event.title,
      date: event.date || null,
      // review-queue schema uses a single `location`; combine venue + city
      location: [event.venue, event.city].filter(Boolean).join(', ') || null,
      // event_url: the event's OWN details page from the content (tracker-stripped),
      // or null. We deliberately do NOT fall back to the source URL here — that
      // conflates "the event page" with "where we found it".
      url: stripTracking(event.url),
      // ticket_url from the content becomes the registration/ticket link the review
      // queue + verification check look for.
      registration_url: stripTracking(event.ticket_url),
      // source_url: where we found it (the page/post we scraped). Always known.
      original_post_url: url,
      original_post_text: scrape.content.substring(0, 5000),
    };

    let verification;
    try {
      verification = await verifyEvent(eventData);
    } catch (error) {
      verification = { httpCheck: false, contentValidation: false, dateSanity: false, registrationUrl: false, errors: [error.message] };
    }

    try {
      db.createUnverifiedEvent(eventData, verification);
      results.saved++;
      console.log(`   💾 Saved to review queue: ${event.title}`);
    } catch (error) {
      console.error(`   ❌ Error saving event: ${error.message}`);
      results.failed++;
    }
  }

  // Step 4: Structured running log (for building evals from real runs)
  logExtractionRun({
    person: personName, personId, sourceId, sourceType, url,
    httpStatus: scrape.status, content: scrape.content, model: MODEL,
    extracted: events, saved: results.saved, error: extractError,
  });

  return results;
}

/**
 * Extract individual posts from a page using heuristics
 * @param {CheerioAPI} $ - Cheerio loaded HTML
 * @param {string} baseUrl - Base URL for resolving relative links
 * @returns {Array} Array of post objects
 */
function extractPosts($, baseUrl) {
  const posts = [];

  // Common selectors for blog posts and articles
  const postSelectors = [
    'article',
    '.post',
    '.entry',
    '.blog-post',
    '.article',
    '[class*="post-"]',
    '[class*="entry-"]',
    '.hentry'
  ];

  for (const selector of postSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((i, elem) => {
        if (i >= 20) return false; // Limit to 20 posts max

        const $elem = $(elem);

        // Extract title
        const titleElem = $elem.find('h1, h2, h3, .title, .entry-title, .post-title').first();
        const title = titleElem.text().trim();

        // Extract link
        let link = $elem.find('a').first().attr('href');
        if (link && !link.startsWith('http')) {
          link = new URL(link, baseUrl).href;
        }

        // Extract date
        const dateElem = $elem.find('time, .date, .published, [class*="date"]').first();
        let dateStr = dateElem.attr('datetime') || dateElem.text().trim();

        // Extract text content
        const text = $elem.text().replace(/\s+/g, ' ').trim().substring(0, 3000);

        if (text.length > 100) { // Only include if substantial content
          posts.push({
            title: title || 'Untitled',
            url: link || baseUrl,
            text: text,
            date: dateStr || null
          });
        }
      });
      break; // Found posts, stop looking
    }
  }

  return posts;
}

/**
 * Use AI to analyze posts and extract event information, then verify and save to DB
 * @param {Array} posts - Array of post objects
 * @param {number} personId - Person ID
 * @param {number} sourceId - Source ID
 * @param {string} sourceType - Type of source
 * @returns {Object} Summary of extraction results
 */
async function analyzePostsForEvents(posts, personId, sourceId, sourceType) {
  console.log(`\n🤖 Analyzing ${posts.length} posts with AI for event mentions...`);

  const results = {
    extracted: 0,
    verified: 0,
    saved: 0,
    failed: 0
  };

  // Process posts in batches of 3 to avoid token limits
  for (let i = 0; i < Math.min(posts.length, 15); i++) {
    const post = posts[i];

    console.log(`   [${i + 1}/${Math.min(posts.length, 15)}] Analyzing: ${post.title.substring(0, 60)}...`);

    try {
      const prompt = `Analyze this post/article and extract ANY events mentioned (appearances, book signings, conventions, talks, readings, book releases, online events, etc.).

Post Title: ${post.title}
Post URL: ${post.url}
Post Date: ${post.date || 'Unknown'}

Content:
${post.text}

Extract ALL events mentioned. For each event found, provide:
1. Event title/name
2. Event date (ISO format YYYY-MM-DD, or best estimate)
3. Location (physical address, city, or "Online" for virtual events)
4. Event URL if mentioned (or use post URL if not specified)
5. Registration/ticket URL if available

Return ONLY valid JSON array:
[
  {
    "title": "Event title",
    "date": "YYYY-MM-DD or null",
    "location": "Location or Online",
    "url": "Event URL or post URL",
    "registration_url": "Ticket/RSVP URL if available"
  }
]

If NO events are found, return: []`;

      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1000,
        temperature: 0.2,
        system: 'You are an expert at extracting event information from text. You identify book signings, conventions, talks, readings, book releases, online events, and any public appearances. Return only valid JSON arrays.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = (message.content.find(b => b.type === 'text')?.text || '').trim();

      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const extractedEvents = JSON.parse(jsonMatch[0]);

        if (extractedEvents.length > 0) {
          console.log(`      ✅ Found ${extractedEvents.length} event(s)`);
          results.extracted += extractedEvents.length;

          // Verify and save each event
          for (const event of extractedEvents) {
            const eventData = {
              person_id: personId,
              source_id: sourceId,
              title: event.title,
              date: event.date,
              location: event.location,
              url: event.url || post.url,
              registration_url: event.registration_url || null,
              original_post_url: post.url,
              original_post_text: post.text.substring(0, 5000) // Limit stored text
            };

            // Run verification pipeline
            console.log(`\n      🔍 Verifying event: ${event.title.substring(0, 50)}...`);
            const verificationResults = await verifyEvent(eventData);

            // Save to unverified_events table regardless of verification status
            // (user will review and decide)
            try {
              db.createUnverifiedEvent(eventData, verificationResults);
              results.saved++;
              console.log(`      💾 Saved to review queue\n`);
            } catch (error) {
              console.error(`      ❌ Error saving event: ${error.message}\n`);
              results.failed++;
            }

            // Small delay between verifications
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          console.log(`      ℹ️  No events found`);
        }
      }

    } catch (error) {
      console.error(`      ❌ Error analyzing post: ${error.message}`);
      results.failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Main function to extract events for a specific author
 * @param {string} authorName - Name of the author
 */
async function extractEventsForAuthor(authorName) {
  console.log(`\n🎯 Starting event extraction for: ${authorName}\n`);
  console.log('='.repeat(70));

  // Find the author in the database
  const allPeople = db.getAllPeople();
  const person = allPeople.find(p =>
    p.name.toLowerCase().includes(authorName.toLowerCase())
  );

  if (!person) {
    console.error(`❌ Author "${authorName}" not found in database`);
    console.log('\nAvailable authors:');
    allPeople.forEach(p => console.log(`  - ${p.name}`));
    return;
  }

  console.log(`✅ Found: ${person.name} (ID: ${person.id})`);

  // Get all sources for this person
  const personWithSources = db.getPersonById(person.id);
  const sources = personWithSources.sources || [];

  console.log(`📚 Found ${sources.length} source(s) to analyze`);

  if (sources.length === 0) {
    console.log('\n⚠️  No sources found. Run source discovery first.');
    return;
  }

  const totals = { extracted: 0, saved: 0, failed: 0 };

  // Process each source
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    console.log(`\n[${ i + 1}/${sources.length}] Processing: ${source.type} - ${source.url}`);
    console.log('-'.repeat(70));

    const results = await extractEventsFromSource(
      source.url,
      source.type,
      person.id,
      source.id,
      person.name
    );

    totals.extracted += results.extracted || 0;
    totals.saved += results.saved || 0;
    totals.failed += results.failed || 0;

    console.log(`   📊 Extracted ${results.extracted} event(s), saved ${results.saved} to review queue`);

    // Delay between sources to avoid rate limiting
    if (i < sources.length - 1) {
      console.log('   ⏳ Waiting 3 seconds before next source...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ EXTRACTION COMPLETE!`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Person: ${person.name}`);
  console.log(`   - Sources analyzed: ${sources.length}`);
  console.log(`   - Events extracted: ${totals.extracted}`);
  console.log(`   - Saved to review queue: ${totals.saved}`);
  console.log(`   - Failed: ${totals.failed}`);
  console.log(`   - Structured log: logs/extractions.jsonl`);
  console.log('\n' + '='.repeat(70));

  return { person: person.name, sources: sources.length, ...totals };
}

// Run the script
if (require.main === module) {
  const authorName = process.argv[2] || 'Catherynne M. Valente';

  extractEventsForAuthor(authorName)
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  extractEventsForAuthor,
  extractEventsFromSource
};
