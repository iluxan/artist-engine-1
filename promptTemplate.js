/**
 * Event extraction core — the SINGLE prompt shared by the app and the evals.
 *
 * The prompt lives in prompts/event-extraction.txt (with {{person}} and {{content}}
 * placeholders). promptfoo evaluates that exact file, and the app calls it through
 * here, so a green eval means the app behaves the same way. No drift.
 */
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

const TEMPLATE_PATH = path.join(__dirname, 'prompts', 'event-extraction.txt');
const TEMPLATE = fs.readFileSync(TEMPLATE_PATH, 'utf8');

/**
 * Structured-output schema: the model's response is CONSTRAINED to a JSON array
 * of events (empty array when none). This is the app's guarantee that the
 * envelope is valid JSON — it replaces relying on the prompt's "return only
 * JSON, no fences" plea plus regex-scraping the array back out.
 *
 * Kept in sync with the field list in prompts/event-extraction.txt. The prompt
 * still documents these fields (the promptfoo eval runs the prompt raw, without
 * this schema), so the two must agree.
 */
const EVENT_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      date: { type: ['string', 'null'] },
      venue: { type: ['string', 'null'] },
      city: { type: ['string', 'null'] },
      url: { type: ['string', 'null'] },
      ticket_url: { type: ['string', 'null'] },
    },
    required: ['title', 'date', 'venue', 'city', 'url', 'ticket_url'],
  },
};

function fillTemplate(person, content) {
  return TEMPLATE
    .replace(/\{\{person\}\}/g, person || 'the tracked person')
    .replace(/\{\{content\}\}/g, content || '');
}

/** Strip ```json ... ``` fences the model sometimes adds (mirrors evals/strip-fences.js). */
function stripFences(s) {
  return String(s).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

/**
 * Extract events from a block of content for a specific person.
 * @param {string} content  cleaned page/post text (see scrape.js)
 * @param {{person?: string}} opts
 * @returns {Promise<Array<{title,date,venue,city,url}>>}
 */
async function extractEventsFromContent(content, opts = {}) {
  const prompt = fillTemplate(opts.person, content);

  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 1500,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: EVENT_SCHEMA } },
  });

  // With structured outputs, parsed_output is the validated array. It can be
  // null if the model refused or hit max_tokens — fall back to parsing the raw
  // text so a partial/edge response still yields something usable.
  if (Array.isArray(message.parsed_output)) {
    return message.parsed_output;
  }

  const text = stripFences(message.content.find(b => b.type === 'text')?.text || '');
  let events;
  try {
    events = JSON.parse(text);
  } catch (e) {
    const m = text.match(/\[[\s\S]*\]/);
    events = m ? JSON.parse(m[0]) : [];
  }
  return Array.isArray(events) ? events : [];
}

module.exports = { extractEventsFromContent, fillTemplate, MODEL, TEMPLATE_PATH, EVENT_SCHEMA };
