# TestVault

A comprehensive test results management platform for collating and analyzing cross-platform test runs across multiple frameworks, operating systems, compilers, hosts, and architectures.

## Features

### Framework Agnostic
- Supports **GTest**, **Robot Framework**, **JUnit**, **pytest**, and any other test framework
- Unified data model for test results regardless of source

### Cross-Platform Tracking
- Track results across OS (Linux, macOS, Windows), architecture (x86_64, aarch64, armv7), compilers (gcc, clang, msvc), and hosts
- Platform comparison analytics with pass rate breakdowns

### Git-Based Run Identification
- Run identifiers based on git commit hashes, tags, and branch names
- Full git log integration with commit messages and authors

### Advanced Filtering
- Multi-dimensional filtering by framework, status, OS, compiler, architecture, and branch
- Full-text search across test runs

### Interactive Dashboards
- 8 KPI cards with real-time metrics
- Pass rate trend charts (30-day rolling)
- Platform comparison bar charts
- Failure hotspot analysis
- Flaky test detection and tracking

### Time Trend Analysis
- Pass rate trends over time with configurable filters
- Duration analysis for performance regression detection
- Run volume tracking
- Combined multi-metric views

### Last Failed Tracking
- Track which tests are currently failing by git history order
- Failure streak detection — know how long tests have been broken
- Recovery tracking — see which tests recently started passing again

### AI-Powered Generative Dashboarding
- Natural language query interface for test data
- Ask questions like "Show pass rate trend over time" or "Compare platform performance"
- Generates interactive charts, tables, and stat cards from natural language
- Suggested prompts for common queries

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Express.js, Node.js
- **Data**: Drizzle ORM schema (in-memory storage with seed data for demo)
- **Routing**: Wouter with hash-based routing

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
NODE_ENV=production node dist/index.cjs
```

## API Endpoints

### Test Runs
- `GET /api/runs` — List all test runs (supports query filters)
- `GET /api/runs/:id` — Get run details
- `POST /api/runs` — Create a new test run
- `GET /api/runs/:id/results` — Get test results for a run

### Results
- `POST /api/results/bulk` — Bulk import test results

### Analytics
- `GET /api/analytics/dashboard` — Dashboard summary stats
- `GET /api/analytics/pass-rate-trend` — Pass rate over time
- `GET /api/analytics/duration-trend` — Duration trends
- `GET /api/analytics/failure-hotspots` — Most failing tests
- `GET /api/analytics/platform-comparison` — Cross-platform comparison
- `GET /api/analytics/flaky-tests` — Flaky test detection
- `GET /api/analytics/last-failed` — Last failed tracking by git order

### AI
- `POST /api/ai/query` — Natural language query endpoint

## Project Structure

```
testvault/
├── client/
│   └── src/
│       ├── pages/           # Dashboard, Test Runs, Run Detail, Trends, Last Failed, AI Assistant
│       ├── components/      # Shared UI components (shadcn/ui)
│       ├── hooks/           # Custom React hooks
│       └── lib/             # Query client, utilities
├── server/
│   ├── routes.ts            # API route definitions
│   ├── storage.ts           # Data storage layer with seed data
│   └── index.ts             # Express server entry point
└── shared/
    └── schema.ts            # Drizzle ORM schema (platforms, testRuns, testResults, flakyTests)
```

## License

MIT
