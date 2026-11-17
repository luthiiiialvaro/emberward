# Emberward — The Last Lantern of the Hollow

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/luthiiiialvaro/emberward/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/luthiiiialvaro/emberward/reward.svg)](https://make.fun/c/best-game-01)

An entry for [make.fun's best-game-01](https://make.fun/c/best-game-01) — "Make the best game".

**Emberward** is a complete, original twin-stick arena game that runs offline in a
desktop browser from static files. You are Pip, a wisp keeping the Last Lantern
lit while the dark sends its creatures at it.

## How to play

Open `game/index.html` in a desktop browser (or `node serve.ts` and visit
http://localhost:8080). No build step, no network, no downloads.

- **Move** — WASD / arrow keys
- **Aim** — mouse
- **Fire** — hold click / Space
- **Dash** — Shift (brief invulnerability, 2.4 s recharge)
- **Pause** — P · **Mute** — M
- **Between waves** — click a boon card or press 1 / 2 / 3

## The game

- **10 waves** of four enemy kinds — motes that chase, darters that zigzag,
  spitters that shoot back, brutes that soak damage — plus elite variants.
- **The Gloomwarden**, a boss with radial bullet bursts and minion summons, on
  waves 5 and 10. Fell it on wave 10 to win.
- **A boon draft after every cleared wave**: Ember Rounds, Twin Flame, Piercing
  Light, Lantern Heart, Quick Dash and more — nine boons that stack.
- **The lantern's glow** slowly mends you while you stand in it, so positioning
  matters: retreat to heal or chase embers for score.
- **Score, combo multiplier, embers, hearts and overcharge stars**, a best score
  kept in your browser, and WebAudio sound effects plus a generative drone —
  all synthesized, no audio files.
- **Screens**: title, play with HUD, draft, pause, game over and victory, each
  with its restart.

## Layout

- `game/` — the playable game: `index.html` and ES modules under `game/src/`,
  one file per job (`config`, `random`, `audio`, `input`, `entities`, `waves`,
  `upgrades`, `game`, `render`, `shots`, `main`).
- `screenshots/` — four real renders of the game: title, play, boss fight,
  victory.
- `main.ts` — the Node 22 entrypoint: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `shots.json` — the `?shot=` scenes each screenshot was taken from.

## License

MIT — see [LICENSE](LICENSE).
