#!/usr/bin/env node
/**
 * Test script for OpenAI API with web search for event discovery
 * Usage: node test-openai-search.js "Person Name"
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAISearchDiscovery(personName, location = 'New York, NY, USA') {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY environment variable not set');
    console.error('Set it with: export OPENAI_API_KEY="your-key-here"');
    process.exit(1);
  }

  console.log(`🔍 Searching for events for: ${personName}`);
  console.log(`📍 Location context: ${location}\n`);

  const query = `Search the web and find upcoming events, appearances, tour dates, or public talks for ${personName} scheduled in 2025 or 2026.

User location: ${location}

Return ONLY a valid JSON array. For each event found, provide:
- title: Event name
- date: Event date in ISO format (YYYY-MM-DD) or best approximation
- time: Event time if available (e.g. "7:30 PM")
- location: City and venue
- url: Event page or ticket URL
- description: Brief description

Prioritize events near ${location}, but also include major events elsewhere. Only include events with confirmed dates and legitimate sources.

Return format:
[
  {
    "title": "Event Name",
    "date": "2025-11-15",
    "time": "7:30 PM",
    "location": "Carnegie Hall, New York, NY",
    "url": "https://...",
    "description": "Brief description"
  }
]

If no events are found, return an empty array: []`;

  console.log('✅ Using OpenAI Responses API with web search enabled\n');

  try {
    console.log('🔧 DEBUG: Sending request...\n');

    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: query
        }
      ],
      tools: [
        { type: 'web_search_preview' }
      ],
      temperature: 0.2,
      max_output_tokens: 1500
    });

    console.log('🔧 DEBUG: Response received!\n');

    // Use the convenience field output_text (much simpler!)
    const result = response.output_text;

    console.log('✅ Successfully extracted text using response.output_text\n');

    console.log('📊 RAW RESPONSE:');
    console.log('='.repeat(80));
    console.log(result);
    console.log('='.repeat(80));
    console.log();

    // Try to parse as JSON
    let events = [];
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const allEvents = JSON.parse(jsonMatch[0]);
        console.log(`\n✅ Parsed ${allEvents.length} event(s) from JSON\n`);

        // Filter for future events only
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        events = allEvents.filter(event => {
          if (!event.date) return false;
          const eventDate = new Date(event.date);
          return eventDate >= today;
        });

        const pastCount = allEvents.length - events.length;
        if (pastCount > 0) {
          console.log(`🗓️  Filtered out ${pastCount} past event(s)\n`);
        }

        if (events.length > 0) {
          console.log(`📅 FUTURE EVENTS (${events.length}):`);
          events.forEach((event, i) => {
            console.log(`\n${i + 1}. ${event.title}`);
            console.log(`   Date: ${event.date}${event.time ? ' at ' + event.time : ''}`);
            console.log(`   Location: ${event.location}`);
            console.log(`   URL: ${event.url}`);
            if (event.description) {
              console.log(`   Description: ${event.description}`);
            }
          });
          console.log();
        } else if (allEvents.length > 0) {
          console.log('⚠️  All extracted events are in the past\n');
        } else {
          console.log('ℹ️  No events found\n');
        }
      } else {
        console.log('⚠️  Could not find JSON array in response (OpenAI returned prose instead)\n');
      }
    } catch (parseError) {
      console.log('⚠️  JSON parsing failed:', parseError.message, '\n');
    }

    // Check if web search was used
    if (response.web_search_results) {
      console.log('\n🌐 WEB SEARCH RESULTS USED:');
      console.log(`Found ${response.web_search_results.length} search results`);
      response.web_search_results.slice(0, 5).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.title}`);
        console.log(`     ${result.url}`);
      });
      console.log();
    } else {
      console.log('⚠️  No web_search_results field in response\n');
    }

    console.log('💡 EVALUATION:');
    console.log('1. Are these real events or just generic info?');
    console.log('2. Are dates future dates (2025+)?');
    console.log('3. Are there actual URLs to verify?');
    console.log('4. How many look legitimate?');
    console.log();

    console.log('📈 USAGE:');
    console.log(`Model: ${response.model || 'gpt-4o'}`);
    console.log(`Prompt tokens: ${response.usage?.input_tokens || response.usage?.prompt_tokens || 'N/A'}`);
    console.log(`Completion tokens: ${response.usage?.output_tokens || response.usage?.completion_tokens || 'N/A'}`);
    console.log(`Total tokens: ${response.usage?.total_tokens || 'N/A'}`);

    // Save full response to file for inspection
    const fs = require('fs');
    const logFile = `openai-response-log-${Date.now()}.json`;
    fs.writeFileSync(logFile, JSON.stringify(response, null, 2));
    console.log(`\n💾 Full response saved to: ${logFile}`);

    return {
      personName,
      query,
      response: result,
      events: events,
      usage: response.usage,
      web_search_results: response.web_search_results,
      note: 'Using Responses API with web search'
    };

  } catch (error) {
    console.error('\n❌ API ERROR:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Error stack:', error.stack);

    if (error.response) {
      console.error('\nHTTP Response status:', error.response.status);
      console.error('HTTP Response headers:', error.response.headers);
      console.error('HTTP Response data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.request) {
      console.error('\nRequest was made but no response received');
    }

    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const personName = process.argv[2];
  const location = process.argv[3] || 'New York, NY, USA';

  if (!personName) {
    console.error('Usage: node test-openai-search.js "Person Name" ["Location"]');
    console.error('Example: node test-openai-search.js "Neil Gaiman"');
    console.error('Example: node test-openai-search.js "Neil Gaiman" "San Francisco, CA, USA"');
    process.exit(1);
  }

  testOpenAISearchDiscovery(personName, location)
    .then(() => {
      console.log('\n✅ Test complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed');
      process.exit(1);
    });
}

module.exports = { testOpenAISearchDiscovery };
