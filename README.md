# Operation DDDD — Daily Dose of Dedication

A single-file PWA daily tracker, plus a set of CLI agents that write the daily
briefs. Install the tracker to your phone's home screen; run the agents from a
desktop.

**Move + Connect + Build = Locked in.**
85%+ = Green | 60–84% = Yellow | <60% = Red
*"I keep my word to myself. That's where confidence lives."*

---

## The PWA tracker

`4D-tracker.html` is the whole app — one file, no build step, no framework, no
runtime dependencies. State lives in `localStorage` on the device.

### Run it locally

It must be served over HTTP, not opened as a `file://` path — service workers
and the manifest will not load from the filesystem.

```powershell
cd C:\Users\drake\Desktop\operation-dddd
python -m http.server 8321
```

Then open <http://127.0.0.1:8321/4D-tracker.html>.

Any static server works; `npx serve .` is fine too.

### Deploy

The Vercel project (`operation-dddd`) is already linked via `.vercel/`.

```powershell
vercel login          # once per machine — opens a browser
vercel deploy         # preview URL
vercel deploy --prod  # production
```

`vercel.json` sets `outputDirectory` to `.` and rewrites every path to
`4D-tracker.html`, so the app answers on any route.

**`.vercelignore` is a deny-all allowlist.** Only these five files are
published: `4D-tracker.html`, `manifest.json`, `sw.js`, `icon-192.png`,
`icon-512.png`. If you add a file the app needs at runtime, add it there too or
it will 404 in production while working fine locally. This is deliberate —
`.env.local`, `logs/` and `node_modules/` all sit in the deploy root.

### Install to a phone

Open the production URL in Safari (iOS) or Chrome (Android) and choose *Add to
Home Screen*. It launches standalone with no browser chrome. HTTPS is required,
so this only works from the deployed URL, not from `127.0.0.1` on another
device.

### Updating an installed app

`sw.js` serves navigations network-first, so a deploy reaches installed phones
on their next online launch. Bump `CACHE` in `sw.js` on any release that
changes the shell — that is what evicts the old cached copy.

---

## The CLI agents

Node scripts that call the Anthropic API and write Markdown into `logs/`.
Not part of the PWA and not deployed.

```powershell
npm install
copy .env.example .env    # then put a real ANTHROPIC_API_KEY in it
```

| Command | What it does |
|---|---|
| `npm run morning` | Daily Command — stakes, priorities, formula check, first action |
| `npm run inbox` | Turns a brain dump into Tasks, Build Queue, People, Ideas, Life Admin |
| `npm run build` | Scopes a focused work session |
| `npm run research` | Synthesizes a topic into a practical brief |
| `npm run reflect` | Scores the day, diagnoses misses, sets up tomorrow |
| `npm run council` | Multi-perspective review on a decision |

Pass a file to the inbox with `node agents/run-inbox.js --file notes.txt`.

Output lands in `logs/` as `YYYY-MM-DD-morning.md`, `-reflection.md`,
`-inbox-HH-MM-SS.md`, `-build-[project].md`, `-research-[topic].md`, plus
running `weekly-log.md`, `ideas.md`, `people-queue.md`, `build-queue.md` and
`life-admin.md`. `logs/` is gitignored — it is personal content.

---

## Layout

```
4D-tracker.html     the entire PWA
manifest.json       install metadata
sw.js               service worker — network-first navigations, cached shell
icon-192/512.png    home screen icons
vercel.json         static deploy config
.vercelignore       deny-all allowlist of what gets published
agents/             CLI agent prompts + runners
cr-dddd-schedule.html   standalone schedule page, not linked from the tracker
V1.md               ship checklist
BACKLOG.md          what was deliberately cut
```

## Known limits

State is `localStorage` only — no sync, no export, no backup. Phone and desktop
keep separate histories, and clearing site data loses everything. See
`BACKLOG.md`.
