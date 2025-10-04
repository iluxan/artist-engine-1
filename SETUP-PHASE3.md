# Phase 3 Setup: AI-Powered Source Discovery

## Prerequisites

You need an OpenAI API key to use the AI-powered source discovery feature.

### Getting an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Add it to your `.env` file

### Setting Up Your API Key

Edit the `.env` file in the project root:

```bash
# Replace 'your-api-key-here' with your actual key
OPENAI_API_KEY=sk-proj-...your-actual-key...

# Model to use (gpt-4o-mini is recommended: faster and cheaper)
OPENAI_MODEL=gpt-4o-mini
```

**IMPORTANT**: Never commit your `.env` file to git! It's already in `.gitignore`.

## Testing AI Discovery

### Option 1: Test Script

Test the AI discovery directly:

```bash
# Test with default authors (Neil Gaiman, Margaret Atwood)
node test-ai-discovery.js

# Test with a specific author
node test-ai-discovery.js "Neil Gaiman"
```

### Option 2: Web Interface

1. Start the server: `npm start`
2. Open http://localhost:3000
3. Add a person (e.g., "Neil Gaiman")
4. Click the "🤖 AI Discover" button
5. Wait 30-60 seconds for results

## How It Works

1. **Initial Search (GPT-4)**: Uses AI to find official sources
2. **URL Verification**: Checks if each URL is accessible
3. **Content Analysis (GPT-4)**: Analyzes page content to verify it's the right person and posts events
4. **Confidence Scoring**: Assigns 0-100% confidence based on analysis

## Cost Estimates

Using `gpt-4o-mini` (recommended):
- ~$0.01-0.02 per discovery
- 100 discoveries = ~$1-2
- Much cheaper than gpt-4

## Troubleshooting

### "OpenAI API key not set"
- Make sure you've added your key to `.env`
- Restart the server after updating `.env`

### "Failed to discover sources"
- Check your API key is valid
- Ensure you have API credits
- Check console for detailed error messages

### "No sources found"
- Try adding a description when adding the person
- Some people have limited online presence
- Try well-known authors first to verify it's working

## Model Options

You can change the model in `.env`:

```bash
# Fastest and cheapest (recommended)
OPENAI_MODEL=gpt-4o-mini

# More accurate but slower/expensive
OPENAI_MODEL=gpt-4o

# Legacy model
OPENAI_MODEL=gpt-4-turbo
```
