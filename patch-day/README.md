# PATCH DAY

Esports-organization-management simulation. Built with React + TypeScript +
Vite, RTL-first Arabic UI.

This is a **new, separate project** in this repo, independent from the
`index.html` game ("استوديو الحلم") at the repo root.

## Status: Part 1 of 3

Only Part 1 of the game's 3-part master design ("الرؤية والهوية والعالم
وتجربة البداية") is implemented so far:

- **New Game**: organization creation (name, tag, manager, region, HQ city,
  founding year, colors).
- **Crest & Brand Studio**: layered crest builder (base shape, symbol,
  style presets, color/finish/outline controls) with a live preview across
  jersey / player card / news article / trophy banner / match graphic
  mockups — all rendered as inline SVG, no external art assets.
- **Manager Desk**: the Era-1 ("Underground") diegetic home screen — org
  identity, a placeholder roster teaser, a finance stub, and a staged
  navigation sidebar where most sections are visibly locked, not fake-clickable.
- **World Eras**: data for all 5 eras exists; only Era 1 has a real UI.
- **Save/Load**: schema-versioned save in `localStorage`, autosave hook
  ready for Part 2/3 events to call.

**Not implemented yet** (planned for future sessions, per the master
prompt's own pacing rule — don't build Part 2/3 systems before the core
loop works): meta/patch simulation, real players/training/scrims, match &
tournament simulation, economy, sponsors, AI organizations, multi-game
orgs, investors/board, history/legacy.

All names (org names, roster placeholders, region flavor text) are
invented — no real esports orgs, players, publishers, or games are
referenced anywhere.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build
```
