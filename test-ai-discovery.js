/**
 * Test script for AI-powered source discovery
 * Usage: node test-ai-discovery.js "Author Name"
 */

require('dotenv').config();
const { discoverSourcesWithAI } = require('./aiSourceDiscovery');

// Test authors (well-known living authors)
const testAuthors = [
  { name: 'Neil Gaiman', description: 'British author of fantasy and graphic novels' },
  { name: 'Margaret Atwood', description: 'Canadian poet and novelist' },
  { name: 'Stephen King', description: 'American horror and suspense author' },
  { name: 'Colson Whitehead', description: 'American novelist' },
  { name: 'Roxane Gay', description: 'American writer and cultural critic' }
];

async function runTests() {
  console.log('🧪 Testing AI-Powered Source Discovery\n');
  console.log('=' .repeat(60));

  // Check if API key is set
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-api-key-here') {
    console.error('❌ ERROR: OpenAI API key not set in .env file');
    console.log('\nPlease add your API key to .env:');
    console.log('OPENAI_API_KEY=sk-your-actual-key-here\n');
    process.exit(1);
  }

  // Get author from command line or use first test author
  const authorArg = process.argv[2];
  let authorsToTest;

  if (authorArg) {
    authorsToTest = [{ name: authorArg, description: '' }];
  } else {
    // Test first 2 authors by default
    authorsToTest = testAuthors.slice(0, 2);
    console.log('💡 No author specified. Testing with default authors.');
    console.log('   Usage: node test-ai-discovery.js "Author Name"\n');
  }

  console.log(`\nTesting ${authorsToTest.length} author(s)...\n`);

  for (const author of authorsToTest) {
    console.log('=' .repeat(60));
    console.log(`\n📚 Testing: ${author.name}`);
    if (author.description) {
      console.log(`   ${author.description}`);
    }
    console.log();

    try {
      const startTime = Date.now();
      const sources = await discoverSourcesWithAI(author.name, author.description);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`\n✅ Success! Found ${sources.length} sources in ${duration}s\n`);

      if (sources.length > 0) {
        console.log('Discovered Sources:');
        sources.forEach((source, i) => {
          console.log(`\n${i + 1}. ${source.type.toUpperCase()}`);
          console.log(`   URL: ${source.url}`);
          console.log(`   Confidence: ${source.ai_confidence_score}%`);
          console.log(`   Verified: ${source.verified ? 'Yes' : 'No'}`);
          if (source.platform_id) {
            console.log(`   Handle: ${source.platform_id}`);
          }
          console.log(`   Analysis: ${source.ai_analysis_summary}`);
        });
      } else {
        console.log('⚠️  No sources found');
      }

    } catch (error) {
      console.log(`\n❌ Error: ${error.message}`);
    }

    console.log('\n');
  }

  console.log('=' .repeat(60));
  console.log('\n✅ Testing complete!\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});