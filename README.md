# Txokas

A Phaser 3 arcade game with a set of fixed training stages, plus a React +
Firebase site that lets people design and store their own stages.

See [AGENTS.md](./AGENTS.md) for the architecture, conventions and gotchas.

## Getting Started

The site and the game are **two separate npm projects**. Install both:

```shell
npm ci
npm --prefix game ci
```

For deploys you also need the Firebase CLI:

```shell
npm install -g firebase-tools
firebase login
```

## The loop

    build a stage  ->  /save  ->  your stage list  ->  Play

The editor hands a stage to the site through `localStorage` (the game runs in a
same-origin iframe), the site stores it in Firestore, and playing it hands it
back the same way. `game/src/stage_io.js` owns both ends and is the only place
map coordinates are converted to canvas coordinates. See AGENTS.md for the
details.

## Local development

```shell
npm run dev
```

This starts both dev servers and proxies `/game/*` to the game's own server,
so edits under `game/src/` appear immediately with hot reload:

- Site: http://localhost:5173/
- Stage editor: http://localhost:5173/build
- Game on its own: http://localhost:8000/game/

Run them separately with `npm run dev:site` / `npm run dev:game` if you prefer.

> Without the proxy, `/game/*` would be served from `public/game/` — the game's
> last *build* output — so game source changes would not show up until a
> rebuild. That is dev only; a production build really does use `public/game/`.

## Build

**Order matters:** the game compiles into `public/game/`, which the site build
then copies into `dist/`. Use the combined script so the site can never be
built against a stale game bundle:

```shell
npm run build:all
```

## Test and lint

```shell
npm test
npm run lint
```

## Deploy

```shell
npm run build:all && firebase deploy
```

Hosting only — see the Firestore rules warning in AGENTS.md §3 before adding
anything else to the deploy.
