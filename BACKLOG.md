# BACKLOG — Operation DDDD

Everything here was cut from `V1.md` by one rule: it is not required to open
the app on a phone, see the dashboard, and log data.

## Cut from v1 on 2026-09-06

- **CLI agent system** — `agents/`, `npm run morning|inbox|build|research|reflect`.
  Works, committed, documented in README. Needs an `ANTHROPIC_API_KEY` in `.env`
  and is a desktop workflow, not part of the phone app.
- **Schedule companion page** — `cr-dddd-schedule.html`. Standalone, not linked
  from the tracker, not part of the install.
- **Cross-device sync** — all state is `localStorage`, so the phone and desktop
  keep separate histories. Fine for one device; the real fix is a backend.
- **Photo / progress-wall polish** — body photos and the 30-day wall render, but
  images are held in `localStorage` and will hit the quota ceiling eventually.
- **Log export / backup** — no way to get data out of `localStorage` today.
  If the browser storage is cleared, history is gone.
