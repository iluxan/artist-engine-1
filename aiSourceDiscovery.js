require('dotenv').config();
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Main function: Discover sources for a person using AI
 * @param {string} personName - Name of the person
 * @param {string} personDescription - Optional description (e.g., "science fiction author")
 * @returns {Promise<Array>} - Array of discovered sources with metadata
 */
async function discoverSourcesWithAI(personName, personDescription = '') {
  console.log(`\n🔍 Starting AI discovery for: ${personName}`);

  try {
    // Step 1: Use GPT-4 to discover potential sources
    const discoveredSources = await initialWebSearch(personName, personDescription);
    console.log(`   Found ${discoveredSources.length} potential sources`);

    // Step 2: Verify each URL
    const verifiedSources = [];
    for (const source of discoveredSources) {
      console.log(`   Verifying: ${source.url}`);
      const verification = await verifySourceExists(source.url);

      if (verification.exists) {
        // Step 3: Analyze content
        console.log(`   Analyzing content...`);
        const analysis = await analyzeSourceContent(
          source.url,
          verification.content,
          personName
        );

        verifiedSources.push({
          ...source,
          verified: true,
          verification_date: new Date().toISOString(),
          ai_confidence_score: analysis.confidence,
          ai_analysis_summary: analysis.summary,
          metadata: JSON.stringify(verification.metadata)
        });

        console.log(`   ✓ Verified with ${analysis.confidence}% confidence`);
      } else {
        console.log(`   ✗ URL not accessible`);
      }
    }

    console.log(`\n✅ Discovery complete: ${verifiedSources.length}/${discoveredSources.length} sources verified\n`);
    return verifiedSources;

  } catch (error) {
    console.error('Error in AI source discovery:', error.message);
    throw error;
  }
}

/**
 * Step 1: Use GPT-4 to discover sources
 */
async function initialWebSearch(personName, personDescription) {
  const prompt = `You are helping discover official event announcement sources for ${personName}${personDescription ? ` (${personDescription})` : ''}.

Find the following information:
1. Official website (with events page if available)
2. Twitter/X account
3. Instagram account
4. Mastodon account (if they use it)
5. Publishers or venues that announce their events
6. Any other official sources where they announce events

IMPORTANT:
- Only return sources you are confident about
- Prefer verified accounts when available
- Focus on sources that actually post event announcements
- Do NOT include event platform aggregators like Eventbrite, Songkick, etc.

Return results as a JSON array with this exact structure:
[
  {
    "type": "website",
    "url": "https://example.com",
    "platform_id": null,
    "confidence": "high",
    "reasoning": "Official website with events page"
  }
]

Type must be one of: website, twitter, instagram, mastodon, publisher, other
Confidence must be one of: high, medium, low

Return ONLY the JSON array, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that finds official event sources for public figures. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content.trim();

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('GPT Response:', content);
      throw new Error('GPT did not return valid JSON array');
    }

    const sources = JSON.parse(jsonMatch[0]);
    return sources;

  } catch (error) {
    console.error('Error in initial web search:', error.message);
    throw error;
  }
}

/**
 * Step 2: Verify URL exists and is accessible
 */
async function verifySourceExists(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    // Extract basic metadata
    const $ = cheerio.load(response.data);
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';

    // Get first 5000 chars of visible text
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    return {
      exists: true,
      content: bodyText,
      metadata: {
        title,
        description,
        status_code: response.status,
        final_url: response.request.res.responseUrl || url
      }
    };

  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * Step 3: Analyze content using GPT-4
 */
async function analyzeSourceContent(url, pageContent, personName) {
  const prompt = `Analyze this webpage content for ${personName}:
URL: ${url}

Content snippet: ${pageContent.substring(0, 2000)}...

Questions:
1. Is this page about the correct person?
2. Does this source post event announcements? (tours, readings, talks, appearances, etc.)
3. Can you find evidence of recent event announcements?

Provide your analysis as JSON:
{
  "confidence": 85,
  "is_correct_person": true,
  "posts_events": true,
  "summary": "Official Twitter account with 50K followers. Recent tweets announce upcoming book tour dates."
}

Confidence score should be 0-100.
Return ONLY the JSON object, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are analyzing webpage content to verify if it belongs to the correct person and posts event information. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 500
    });

    const content = response.choices[0].message.content.trim();

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('GPT did not return valid JSON');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Adjust confidence based on factors
    let finalConfidence = analysis.confidence;
    if (!analysis.is_correct_person) {
      finalConfidence = Math.min(finalConfidence, 30);
    }
    if (!analysis.posts_events) {
      finalConfidence = Math.max(0, finalConfidence - 20);
    }

    return {
      confidence: Math.round(finalConfidence),
      summary: analysis.summary
    };

  } catch (error) {
    console.error('Error analyzing content:', error.message);
    // Return default on error
    return {
      confidence: 50,
      summary: 'Unable to analyze content automatically'
    };
  }
}

module.exports = {
  discoverSourcesWithAI,
  initialWebSearch,
  verifySourceExists,
  analyzeSourceContent
};