# Last Orders Derby

Static React + TypeScript party game prototype for a private shared-screen horse-racing drinking game. It runs entirely in the browser with no backend, no accounts, no networking, and no analytics. The whole session persists in `localStorage`, so a refresh does not wipe progress.

## What It Does

- Runs a full local session for 2 to 10 players on one device
- Lets players bet openly, one at a time, on a random horse race
- Resolves winning assignments, punishment, tap-outs, round summaries, and a final leaderboard
- Persists the current session plus safe undo history between refreshes
- Works as a single-page app across mobile, desktop, and TV-sized screens

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Persistence

- The app stores state in `localStorage` under the key `last-orders-derby`
- It saves:
  - host settings draft
  - the current session
  - safe undo snapshots for the current open round window
- On load, a saved session is not auto-opened. The home screen shows `Resume session` and `Start fresh`
- Corrupt or invalid saved payloads are cleared safely

## Where To Tweak Things

- Horse names: [src/data/horseNames.ts](/c:/Users/User/Desktop/HorseGame/src/data/horseNames.ts)
- Cheeky suggestion lines: [src/data/cheekyLines.ts](/c:/Users/User/Desktop/HorseGame/src/data/cheekyLines.ts)
- Player colour defaults: [src/data/playerColours.ts](/c:/Users/User/Desktop/HorseGame/src/data/playerColours.ts)
- Race timing weights and segment limits: [src/lib/constants.ts](/c:/Users/User/Desktop/HorseGame/src/lib/constants.ts)
- Core rules, round generation, assignment caps, punishment flow, leaderboard logic: [src/lib/game.ts](/c:/Users/User/Desktop/HorseGame/src/lib/game.ts)
- Reducer and undo windows: [src/lib/reducer.ts](/c:/Users/User/Desktop/HorseGame/src/lib/reducer.ts)

## Main State Flow

The app uses a reducer-driven single-page flow with phase-based rendering:

1. `home`
2. `setup`
3. `betting`
4. `race`
5. `results`
6. `assignment`
7. `punishment`
8. `roundSummary`
9. `final`

Core game rules live in pure helpers in `src/lib/game.ts`. React components stay mostly presentational and dispatch small actions into the reducer. The reducer also controls when undo history is recorded and when it is cleared.

## Undo Model

- Undo is available while the round is still safely editable
- Betting actions can be undone before the race starts
- Assignment and punishment actions can be undone before the round is confirmed
- Once punishment is confirmed and the round moves to summary, that round is locked and undo is cleared

## Architecture Notes

- Vite handles the static React build
- A single `useReducer` app store controls setup, session flow, persistence, and undo
- Race animation uses DOM and CSS only, with the winner chosen before the animation starts
- Core logic is covered by Vitest tests in [test/game.test.ts](/c:/Users/User/Desktop/HorseGame/test/game.test.ts)

## Implementation Assumptions

- Each player starts the session with 8 available segments
- A valid bet must include at least 1 segment or 1 shot
- Opening an extra beer during betting is only available when the chosen segment stake actually needs it
- Refreshing mid-race restarts the race animation, but the result stays the same because the winner is already stored in state
- Host settings are set before the session starts and do not change mid-session
