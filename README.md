# sizzle-shift
[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/sastra-wev/sizzle-shift/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/sastra-wev/sizzle-shift/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle Shift** — a fast little cooking game for the desktop browser. You run the pass in a
busy burger kitchen: customers pin their tickets to the order board, and you stack each dish
layer by layer — bun, patty, cheese, in the ticket's exact order — from the eight ingredient
bins on the counter, then serve it before the customer's patience bar runs dry.

Fast plates earn patience and combo bonuses; a refused layer breaks your combo; three
walk-outs and the shift ends early. Across the 150-second shift the rush builds: tickets
arrive faster, patience runs shorter, and bigger dishes (Double Smash, Sunny Stack, the
six-layer Royal Tower) unlock on the menu. At closing time you get a shift summary and a
chef rating, from Commis in training to Executive Chef.

## Play it

```sh
node serve.ts          # serves game/ at http://localhost:8080
```

Open the page in desktop Chrome. Play with the mouse, the keyboard, or both:

- **Click a bin** (or press **1–8**) to add that ingredient to the plate
- **SERVE** button (or **Space**) to serve a finished dish
- **Backspace** undoes the top layer, **T** trashes the plate, **P** pauses, **M** mutes

The game is plain static files under `game/` — no build step, no library, no network
request — so it plays fully offline.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output
directory and writes `dossier.json` there with the vendored make.fun library in
`vendor/makefun-game.ts`. The four screenshots in `screenshots/` are staged renders of the
game itself (`?shot=start|play|serve|end&seed=7`, see `shots.json`): the title, a dish
mid-assembly, a plate ready to serve, and the shift summary.

## Layout

- `main.ts` — the hand-in program
- `serve.ts` — a tiny local server for playing the game
- `game/index.html` — the page
- `game/src/config.js` — ingredients, recipes, tuning, palette
- `game/src/world.js` — the rules: orders, stacking, serving, the shift clock
- `game/src/render.js` — the whole kitchen drawn in canvas 2D
- `game/src/input.js` — mouse and keyboard, as intents
- `game/src/layout.js` — one geometry shared by drawing and hit-testing
- `game/src/shots.js` — the staged screenshot scenes
- `game/src/sound.js` — synthesized pops, dings and buzzes (WebAudio, no files)
- `game/src/random.js` — the seeded generator behind reproducible scenes
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

Licensed under the MIT License (see `LICENSE`).
