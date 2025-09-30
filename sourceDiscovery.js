const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Discovers sources for a given person by searching the web
 */
async function discoverSourcesForPerson(personName) {
  const sources = [];

  try {
    // Search for Twitter/X profile
    const twitterHandle = await findTwitterHandle(personName);
    if (twitterHandle) {
      sources.push({
        type: 'twitter',
        url: `https://twitter.com/${twitterHandle}`,
        confidence: 'high'
      });
    }

    // Search for personal website/blog
    const website = await findPersonalWebsite(personName);
    if (website) {
      sources.push({
        type: 'website',
        url: website,
        confidence: 'medium'
      });
    }

    // Search for event platform profiles
    const eventPlatforms = await findEventPlatformProfiles(personName);
    sources.push(...eventPlatforms);

    // Search for Instagram
    const instagram = await findInstagramProfile(personName);
    if (instagram) {
      sources.push({
        type: 'instagram',
        url: instagram,
        confidence: 'medium'
      });
    }

    // Search for Facebook
    const facebook = await findFacebookProfile(personName);
    if (facebook) {
      sources.push({
        type: 'facebook',
        url: facebook,
        confidence: 'low'
      });
    }

  } catch (error) {
    console.error(`Error finding sources for ${personName}:`, error.message);
  }

  return sources;
}

/**
 * Attempts to find Twitter handle for a person
 * Uses heuristics and common patterns
 */
async function findTwitterHandle(personName) {
  const cleanName = personName.toLowerCase().replace(/\s+/g, '');
  const nameWithUnderscore = personName.toLowerCase().replace(/\s+/g, '_');
  const firstName = personName.toLowerCase().split(' ')[0];
  const lastName = personName.toLowerCase().split(' ').slice(-1)[0];

  const possibleHandles = [
    cleanName,
    nameWithUnderscore,
    firstName,
    `${firstName}${lastName}`,
    `${firstName}_${lastName}`
  ];

  // Try to verify which handle exists
  for (const handle of possibleHandles) {
    try {
      // In production, you would use Twitter API or scraping to verify
      // For MVP, we return the most likely handle
      if (handle.length >= 3 && handle.length <= 15) {
        return handle;
      }
    } catch (error) {
      continue;
    }
  }

  return possibleHandles[0];
}

/**
 * Searches for personal website using common patterns
 */
async function findPersonalWebsite(personName) {
  const cleanName = personName.toLowerCase().replace(/\s+/g, '');
  const dashedName = personName.toLowerCase().replace(/\s+/g, '-');

  const possibleDomains = [
    `https://www.${cleanName}.com`,
    `https://${cleanName}.com`,
    `https://www.${dashedName}.com`,
    `https://${dashedName}.com`
  ];

  // In production, you would:
  // 1. Use Google Custom Search API to find official website
  // 2. Verify domain exists with DNS lookup or HTTP request
  // 3. Parse page to confirm it's the right person

  // For MVP, return first plausible domain
  return possibleDomains[0];
}

/**
 * Searches for profiles on event platforms
 */
async function findEventPlatformProfiles(personName) {
  const platforms = [];
  const cleanName = personName.toLowerCase().replace(/\s+/g, '-');
  const encodedName = encodeURIComponent(personName);

  // Eventbrite
  platforms.push({
    type: 'eventbrite',
    url: `https://www.eventbrite.com/o/${cleanName}`,
    confidence: 'low'
  });

  // Dice (for music events)
  platforms.push({
    type: 'dice',
    url: `https://dice.fm/artist/${cleanName}`,
    confidence: 'low'
  });

  // Songkick (for concerts)
  platforms.push({
    type: 'songkick',
    url: `https://www.songkick.com/search?query=${encodedName}`,
    confidence: 'low'
  });

  // In production, you would verify these URLs exist and contain actual data

  return platforms;
}

/**
 * Attempts to find Instagram profile
 */
async function findInstagramProfile(personName) {
  const cleanName = personName.toLowerCase().replace(/\s+/g, '');
  const nameWithUnderscore = personName.toLowerCase().replace(/\s+/g, '_');
  const nameWithDot = personName.toLowerCase().replace(/\s+/g, '.');

  const possibleUsernames = [
    cleanName,
    nameWithUnderscore,
    nameWithDot
  ];

  // In production, verify which username exists
  // For MVP, return most likely
  return `https://www.instagram.com/${possibleUsernames[0]}`;
}

/**
 * Attempts to find Facebook profile/page
 */
async function findFacebookProfile(personName) {
  const cleanName = personName.toLowerCase().replace(/\s+/g, '');
  const dashedName = personName.toLowerCase().replace(/\s+/g, '-');

  // Facebook uses various URL patterns
  const possibleUrls = [
    `https://www.facebook.com/${cleanName}`,
    `https://www.facebook.com/${dashedName}`
  ];

  // In production, verify which exists
  return possibleUrls[0];
}

/**
 * Advanced: Use web search to find sources
 * This would use Google Custom Search API or similar
 */
async function searchWebForSources(personName) {
  // Example: Search for "{personName} events" or "{personName} tour dates"
  // Parse results to extract relevant URLs
  // This would require API key for Google Custom Search or similar service

  // Placeholder for future implementation
  return [];
}

/**
 * Verify if a URL exists and is accessible
 */
async function verifyUrl(url) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: (status) => status < 400
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

module.exports = {
  discoverSourcesForPerson,
  findTwitterHandle,
  findPersonalWebsite,
  findEventPlatformProfiles,
  findInstagramProfile,
  findFacebookProfile,
  verifyUrl
};