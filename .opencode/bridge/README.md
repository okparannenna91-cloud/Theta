# Browser Use Bridge for Theta

A TypeScript bridge that connects OpenCode to Browser Use for browser automation.

## Architecture

```
OpenCode / Skills
    ↓
Browser Bridge (TypeScript)
    ↓
Browser Use (Python via child process)
    ↓
Browser (Chrome/Chromium)
```

OpenCode is the brain. Browser Use handles browser actions only.

## Directory Structure

```
.opencode/
├── opencode.json                        # Skill registration
├── bridge/
│   ├── README.md                        # This file
│   ├── browser.ts                       # Main entry - re-exports all modules
│   ├── browser-config.ts                # Configuration from environment variables
│   ├── browser-runner.ts                # Spawns Python processes, handles I/O
│   ├── browser-actions.ts               # Reusable browser action functions
│   ├── qa.ts                            # QA test workflows for Theta
│   ├── linkedin.ts                      # LinkedIn outreach workflows
│   ├── reports.ts                       # Report generation (Markdown, JSON, logs)
│   ├── python/
│   │   └── runner.py                    # Python script that imports browser_use
│   ├── screenshots/                     # Screenshot output directory
│   ├── reports/                         # Report output directory
│   └── logs/                            # Log output directory
├── skills/
│   └── theta-growth-engineer/
│       ├── SKILL.md                     # Skill definition
│       └── agent.ts                     # Skill implementation using bridge

/Linkedin/                               # Lead storage (project root)
├── startup-founders/
├── agency-owners/
├── project-managers/
├── operations/
├── messages/
└── tracking/
```

## Configuration

Set these environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | - | OpenRouter API key |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` | OpenRouter base URL |
| `OPENROUTER_MODEL` | No | `google/gemini-2.5-flash-preview-04-17` | Default model |
| `BROWSER_USE_PATH` | No | `../browser-use` | Path to browser-use project |
| `CHROME_EXECUTABLE` | No | - | Path to Chrome executable |
| `HEADLESS` | No | `false` | Run browser in headless mode |
| `SCREENSHOT_DIR` | No | `.opencode/bridge/screenshots` | Screenshot directory |
| `REPORT_DIR` | No | `.opencode/bridge/reports` | Report directory |
| `LOG_DIR` | No | `.opencode/bridge/logs` | Log directory |

## Usage from OpenCode Skills

### Import the bridge

```typescript
import * as Bridge from '.opencode/bridge/browser'
```

### Run a single task

```typescript
const result = await Bridge.runBrowserTask(
  'Navigate to https://example.com and take a screenshot'
)
console.log(result)
```

### Run QA tests

```typescript
const report = await Bridge.runQaTests({
  baseUrl: 'https://your-theta-app.com',
})
console.log(`Score: ${report.scores.overall}/10`)
```

### LinkedIn outreach research

```typescript
const result = await Bridge.fullOutreachWorkflow({
  companyName: 'Acme Corp',
  companyWebsite: 'https://acme.com',
  targetRole: 'CTO',
  targetName: 'Jane Smith',
})
```

### Generate a report

```typescript
const report: Bridge.QaReport = {
  title: 'Test Report',
  timestamp: new Date().toISOString(),
  duration_seconds: 42,
  scores: { usability: 8, reliability: 9, performance: 7, productivity: 8, overall: 8 },
  tests: [],
  screenshots: [],
  model: 'gemini-2.5-flash',
}

const mdPath = await Bridge.saveMarkdownReport(config, report)
const jsonPath = await Bridge.saveJsonReport(config, report)
```

## Communication Protocol

The TypeScript bridge communicates with Browser Use via spawning a Python child process:

1. TypeScript writes a JSON request to the Python process's stdin
2. Python runs the browser automation using `browser-use`
3. Python writes a JSON response to stdout
4. TypeScript parses the response and returns it

### Request Format

```json
{
  "action": "execute",
  "task": "Navigate to https://example.com",
  "config": {
    "headless": false,
    "max_steps": 100
  }
}
```

### Response Format

```json
{
  "success": true,
  "execution_id": "uuid",
  "task": "Navigate to https://example.com",
  "duration_seconds": 12.5,
  "model": "google/gemini-2.5-flash-preview-04-17",
  "steps": 5,
  "result": "Page loaded successfully",
  "errors": [],
  "screenshots": ["/path/to/screenshot.png"],
  "timestamp": "2026-06-27T11:00:00Z"
}
```

## Error Handling

The bridge handles these error cases:

| Error Code | Description |
|------------|-------------|
| `IMPORT_ERROR` | browser_use Python package not installed |
| `CONFIG_ERROR` | Missing or invalid configuration |
| `EXECUTION_ERROR` | Runtime error during browser automation |
| `TIMEOUT` | Task exceeded maximum execution time |
| `PROCESS_ERROR` | Python process crashed or exited with error |
| `PARSE_ERROR` | Failed to parse Python output as JSON |
| `SPAWN_ERROR` | Failed to spawn Python process |

## Changing Models

To change the LLM model, simply set the `OPENROUTER_MODEL` environment variable:

```bash
set OPENROUTER_MODEL=openai/gpt-4o
# or
set OPENROUTER_MODEL=anthropic/claude-sonnet-4
# or
set OPENROUTER_MODEL=google/gemini-2.5-flash-preview-04-17
```

No code changes needed.

---

## Theta Growth Engineer Skill

The `.opencode/skills/theta-growth-engineer/` skill provides a complete workflow for:

1. **review-theta** - Review current Theta capabilities before researching
2. **discover-leads** - Find potential leads in target industries
3. **research-lead** - Deep research companies and people
4. **analyze-fit** - Analyze Theta fit with confidence scoring
5. **generate-outreach** - Generate personalized outreach messages

The skill imports from the bridge (`browser.ts`) and stores leads under `/LinkedIn/`.

### Skill Philosophy

- Quality over volume
- Never contact without evidence-based Theta relevance
- Never auto-send messages
- Human approval always required before outreach
- Leads below 0.5 confidence are rejected automatically

### Confidence Scoring

| Score | Meaning |
|-------|---------|
| 1.0 | Excellent fit |
| 0.8 | Strong fit |
| 0.6 | Moderate fit |
| <0.5 | Reject (no outreach) |
