const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyze a source URL to determine posting frequency
 * @param {string} url - Source URL to analyze
 * @param {string} sourceType - Type of source (twitter, website, blog, etc.)
 * @returns {Object} { last_post_date, avg_posts_per_month, analysis }
 */
async function analyzePostingFrequency(url, sourceType) {
  console.log(`\n📊 Analyzing posting frequency for: ${url}`);

  try {
    // Fetch the page content
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract text content (limit to reasonable size)
    const pageText = $('body').text().replace(/\s+/g, ' ').substring(0, 8000);

    // Get HTML for better structure analysis
    const pageHTML = $.html().substring(0, 8000);

    console.log(`   Fetched ${pageText.length} characters of content`);

    // Use GPT-4 to analyze posting frequency
    const prompt = `Analyze this ${sourceType} page and determine:

1. When was the most recent post/update published? (provide as ISO date: YYYY-MM-DD)
2. Estimate average posts per month based on visible content from the last 2-3 months
3. Brief analysis of posting activity and frequency pattern

Focus on recent activity (last 2-3 months) to give an accurate picture of current posting frequency.

URL: ${url}

Page content:
${pageText.substring(0, 6000)}

Return ONLY valid JSON in this exact format:
{
  "last_post_date": "YYYY-MM-DD or null",
  "avg_posts_per_month": number or 0,
  "analysis": "brief description"
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing web pages to determine posting frequency and activity. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const responseText = completion.choices[0].message.content.trim();
    console.log(`   AI Response: ${responseText}`);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and normalize
    return {
      last_post_date: result.last_post_date || null,
      avg_posts_per_month: parseFloat(result.avg_posts_per_month) || 0,
      analysis: result.analysis || 'No analysis available'
    };

  } catch (error) {
    console.error(`   ❌ Error analyzing ${url}:`, error.message);

    // Return null values if analysis fails
    return {
      last_post_date: null,
      avg_posts_per_month: 0,
      analysis: `Error: ${error.message}`
    };
  }
}

/**
 * Analyze all sources for a person
 * @param {number} personId - Person ID
 * @param {Array} sources - Array of source objects
 * @param {Function} updateCallback - Callback to update each source in DB
 */
async function analyzeAllSources(personId, sources, updateCallback) {
  console.log(`\n🔍 Analyzing ${sources.length} sources for person ID ${personId}\n`);

  const results = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    console.log(`[${i + 1}/${sources.length}] ${source.type}: ${source.url}`);

    const analysis = await analyzePostingFrequency(source.url, source.type);

    // Update source in database
    if (updateCallback) {
      await updateCallback(source.id, {
        last_post_date: analysis.last_post_date,
        avg_posts_per_month: analysis.avg_posts_per_month
      });
    }

    results.push({
      source_id: source.id,
      url: source.url,
      ...analysis
    });

    console.log(`   ✅ Last post: ${analysis.last_post_date || 'Unknown'}`);
    console.log(`   ✅ Avg posts/month: ${analysis.avg_posts_per_month}`);
    console.log(`   ℹ️  ${analysis.analysis}\n`);

    // Small delay to avoid rate limiting
    if (i < sources.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

module.exports = {
  analyzePostingFrequency,
  analyzeAllSources
};
