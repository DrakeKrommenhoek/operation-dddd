# Operation DDDD — Daily Execution System

## Daily Usage

**Every morning:**
```
npm run morning
```

**Clear your head:**
```
npm run inbox
# or with a file:
node agents/run-inbox.js --file notes.txt
```

**Deep work session:**
```
npm run build
```

**Research anything:**
```
npm run research
```

**Every evening:**
```
npm run reflect
```

## What this does

- **Morning** — generates your Daily Command: stakes, priorities, formula check, first action
- **Inbox** — processes any brain dump into Tasks, Build Queue, People, Ideas, Life Admin
- **Build** — eliminates decision fatigue and scopes a focused work session
- **Research** — synthesizes any topic into a practical brief with PE/startup/school framing
- **Reflect** — scores your day, diagnoses misses as system problems, sets up tomorrow

## Files

- `agents/` — all agent prompt files and runner scripts
- `logs/` — daily outputs auto-generated on each run:
  - `YYYY-MM-DD-morning.md` — daily command
  - `YYYY-MM-DD-reflection.md` — end-of-day reflection
  - `YYYY-MM-DD-inbox-HH-MM-SS.md` — processed brain dumps
  - `YYYY-MM-DD-build-[project].md` — build sessions
  - `YYYY-MM-DD-research-[topic].md` — research briefs
  - `weekly-log.md` — running score log
  - `ideas.md` — accumulated ideas across all inbox runs
  - `people-queue.md` — follow-up queue
  - `build-queue.md` — project backlog items
  - `life-admin.md` — life admin backlog
- `4D-tracker.html` — PWA daily tracker

## Setup

1. Copy `.env.example` to `.env`
2. Add your Anthropic API key: `ANTHROPIC_API_KEY=sk-ant-...`
3. Run `npm install`
4. Run `npm run morning`

## The System

Move + Connect + Build = Locked in.

85%+ = Green | 60–84% = Yellow | <60% = Red

"I keep my word to myself. That's where confidence lives."
