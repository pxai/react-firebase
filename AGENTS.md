# AGENTS.md — Txokas

Txokas (txokas.com) is a two-part web project:

1. **A Phaser 3 arcade game** (`game/`) — hit the bell with the ball. Ships a set
   of fixed, hand-made stages used as training/tutorial levels.
2. **A React + Firebase site** (`src/`) — wraps the game, handles auth, and lets
   signed-in people *design their own stages* and store them in Firestore.

The two are **separate npm projects** that are joined at build time: the game is
compiled into `public/game/`, which the React build then copies into `dist/`.
The site embeds the game in an `<iframe>`.

---

## 1. Repository layout

```
/                        React + Vite app (the site) — root npm project
  index.html             Vite entry for the site
  src/                   React 19 components (flat, no subfolders by feature)
    main.jsx             Entry: StrictMode > BrowserRouter > App
    index.js             DEAD CODE — a second, unused React entry point
    App.jsx              Routes: / , /build , /save , /about
    firebase.js          Firebase init (app, auth, googleProvider, db)
    Game.jsx             <iframe src="/game/index.html[?builder]">
    HomePage.jsx         Game in play mode + AddStageForm + MyStageList
    BuildPage.jsx        Game in builder mode (?builder) + MyStageList
    SaveBuildPage.jsx    Reads localStorage "currentMap" -> AddStageForm
    AddStageForm.jsx     Writes a doc to Firestore `stages`
    StageList.jsx        All stages (NOT mounted anywhere)
    MyStageList.jsx      Current user's stages + delete
    NavBar / Footer / AboutPage
    Login / Register / Logout / GoogleLogin / AuthStatus   (NOT mounted in App)
    __tests__/           4 Jest + RTL smoke tests
    __mocks__/           Manual mocks for AuthStatus, GoogleLogin, Logout
  public/                Copied verbatim into dist/ by Vite
    game/                *** BUILD OUTPUT of game/, committed to git ***
    index.html           DEAD — leftover Firebase Hosting welcome page
    ads.txt              AdSense
  dist/                  Site build output, git-ignored, Firebase Hosting root
  build/                 Stale stray folder (one index.html), unused

game/                    Phaser game — its own npm project, own vite/eslint/babel
  index.html             Bare entry: #container div + /src/init.js
  src/
    layout.js            Canvas/map geometry: gutters, playfield, grid helpers
    elements.js          Element catalogue: palette, stored names, sizes (pure)
    moving_platform.js   Matter sliding platform (horizontal / vertical)
    __tests__/           Unit tests for the two pure modules above
    init.js              Phaser.Game config, scene list
    bootloader.js        Loads all assets; routes to `game` or `game_builder`
    splash.js            Title screen (reachable only if started explicitly)
    game.js              PLAY scene — fixed stages, or a user map ('template')
    game_builder.js      BUILD scene — place bricks, export map, save
    transition.js  outro.js
    ball.js bat.js rotator.js spike.js spring.js platform.js exit.js
    custom_brick.js brick_button.js sprite_button.js
    matter_gravity_fix.js   Local plugin fixing Matter per-body gravity
  assets/                Source assets: images, maps (Tiled JSON), sounds, fonts
  package.json           ALSO doubles as an NW.js manifest (window/chromium-args)

firebase.json .firebaserc firestore.rules firestore.indexes.json
.env / .env-sample       VITE_FIREBASE_* config (.env is git-ignored)
```

Git remote is `git@github.com:pxai/react-firebase.git`; main branch is `master`.

---

## 2. How the two halves talk to each other

There is **no API and no message passing**. The integration is three loose
conventions — know them before changing either side:

1. **Mode via query string.** `Game.jsx` renders
   `/game/index.html` for play and `/game/index.html?builder` for build mode.
   `bootloader.js` reads `URLSearchParams` and starts scene `game_builder` when
   `builder` is present (`params.get("builder") == ""`), otherwise `game`.
2. **Map handoff via `localStorage`.** `game_builder.saveScene()` writes the
   exported map as JSON under the key `currentMap`, then does
   `window.parent.location.href = '/save'`. `SaveBuildPage.jsx` reads that same
   key and hands it to `AddStageForm` as `mapData`.
3. **Map format.** `game_builder.exportedMap` is an array of
   `{ x, y, name }`. Names are `bat`, `bell`, `fireball`, `rotator:<size>`,
   `brick<0-3>`, `spike<0-3>`. `game.addObjectsFromCustomBricks()` consumes the
   same shape: bricks/spikes become tile indices painted onto the
   `scene`/`damage` layers of `scenetemplate.json`, everything else becomes a
   sprite.

### Two coordinate systems — do not mix them
`layout.js` defines both, and it matters because the canvas is wider than the
map (see §5):
- **Canvas coordinates** — what everything in the running game uses. The map is
  drawn at `MAP_OFFSET_X`, so a brick in the top-left playable cell is at
  canvas x `144`, not `32`. All in-memory `customBricks` passed between the
  editor and the play scene are canvas coordinates.
- **Map coordinates** — the *storage* format, with `0,0` at the map's top-left
  corner. `exportedMap` converts to these via `toMapX`/`toMapY` before writing
  to `localStorage`, so saved stages survive a change to the gutter width.
  **A future loader must convert back with `fromMapX`/`fromMapY`.**

Tiled object layers in `assets/maps/*.json` are also in map coordinates, which
is why both scenes add `MAP_OFFSET_X` when instantiating objects from a map.

### The full loop (closed)
A stage now goes all the way round: build → save → list → play.

    editor            game/src/game_builder.js   saveScene()
      -> localStorage "currentMap"               writeStage(DRAFT_KEY)
    save page         src/SaveBuildPage.jsx      reads that key
      -> Firestore    stages/<id>.mapData        the JSON string, unchanged
    stage list        src/MyStageList.jsx        Play
      -> localStorage "txokas:playMap"           src/PlayPage.jsx
    game              game/src/bootloader.js     ?play -> readStage(PLAY_KEY)

The handoff is **localStorage**, in both directions, because the game runs in a
same-origin iframe. Nothing in `game/src/` talks to Firestore, and Firebase is
not in the game bundle.

`game/src/stage_io.js` owns both ends of it, and is the only place the
map/canvas coordinate conversion happens:

- `serializeStage(bricks)` — canvas -> stored map coordinates
- `parseStage(raw)` — stored -> canvas, dropping anything unusable
- `readStage(key)` / `writeStage(key, bricks)` — the same, through localStorage,
  wrapped in try/catch because it throws in private mode
- `DRAFT_KEY` (`"currentMap"`, the historic name) and `PLAY_KEY`

**The React side imports `DRAFT_KEY`/`PLAY_KEY` from that module** rather than
repeating the strings, so the two halves cannot drift apart. That is the only
import that crosses from `src/` into `game/src/`, and it is safe because
`stage_io.js`, `layout.js` and `elements.js` are pure — no Phaser. Keep them
that way or the React bundle will start pulling Phaser in.

`parseStage` is deliberately forgiving: it parses data that has been through
localStorage and Firestore and may have been hand-edited. Note that it rejects
`null`, `''` and `false` coordinates rather than using `Number()`, which turns
all three into `0` and would quietly place a broken element at the map's edge.

### Game entry points (query string)
`game/src/bootloader.js` routes on the iframe's query string, and `src/Game.jsx`
is the only thing that builds it:

| URL | Scene |
|---|---|
| `/game/index.html` | fixed training stages, from stage 0 |
| `?builder` | editor, empty |
| `?builder&draft` | editor, resuming the stage in `DRAFT_KEY` |
| `?play` | the stored stage in `PLAY_KEY`, flagged `standalone` |

`standalone` matters: the in-game back button normally wakes the sleeping
`game_builder` scene, but when a stage is played straight from the site that
scene was never started, and waking it leaves a dead black canvas. In that case
`goBack()` sends the parent page to `/save` instead.

---

## 3. Firebase

- Project: **`cafe-126bd`** (`.firebaserc` default). Hosting serves `dist/` with
  a catch-all rewrite to `/index.html` (needed for React Router).
- Firestore collection **`stages`**, documents shaped:
  `{ name, description, mapData, userId, userEmail, userName, createdAt }`
  plus `updatedAt` once edited. `mapData` is the JSON **string** from
  `localStorage`, not a parsed array — it is passed through untouched in both
  directions, which is what lets the game do the coordinate conversion.
  (Older documents may have a `stage` field; nothing reads it.)
- Auth: email/password + Google provider (`src/firebase.js`), but the
  `Login`/`Register`/`GoogleLogin`/`Logout`/`AuthStatus` components are **not
  mounted** in `App.jsx` or `NavBar.jsx` — there is no sign-in UI on the routes.
  Pages only *observe* auth via `onAuthStateChanged`.

### Analytics collections
Two write-only collections, both written from the client:

**`stage_opens`** — one row each time a stage is opened to play (`/play/:id`,
once the stage has actually loaded):

    { stageId, openedAt, signedIn, userId? }

**`stage_attempts`** — one row each time an attempt ends, and whether it was
won. An attempt is one launch of the ball: a failure restarts the scene, so one
scene instance is one attempt.

    { stageId, completed, durationMs, endedAt, signedIn, userId? }

How it gets there: the game has no Firebase and should keep it that way, so
`game/src/telemetry.js` posts the outcome to the hosting page over
**postMessage** and `src/analytics.js` writes it. `PlayPage` validates the
message with `parseAttemptMessage` (origin check, channel check, shape check)
and **takes the stage id from the route, never from the message** — the page
already knows which stage it loaded.

Only stages played by id are counted. The fixed training stages have no
document to count against, so `Game.recordAttempt` returns early unless the
scene is `standalone`. Counting those too would mean inventing synthetic ids.

**Privacy.** A signed-in player's `uid` is attached so distinct players can be
counted. **Nothing else about anybody is stored** — no email, no display name,
not even for signed-in users. Anonymous players are still counted (otherwise
most traffic would be invisible) but carry no identity at all; the `signedIn`
boolean separates the two groups without identifying anyone. There is a test
asserting the email and display name never reach the document.

Two things to know before trusting the numbers:
- `StrictMode` runs effects twice in development. `PlayPage` guards the open
  with a ref, or every local open would be counted twice. Keep that guard.
- These rules have to let **unauthenticated** clients create rows, which means
  anyone can post arbitrary ones and inflate the counts. Client-side analytics
  cannot avoid that. If the numbers ever need to be trustworthy, the real fixes
  are Firebase App Check or moving the write behind a Cloud Function.

### Who may edit a stage
**Only the author.** `/save/:id` is the editing screen and it is reachable by
URL, so it checks ownership itself:

- `SaveBuildPage` computes `editingSomeoneElses` and renders a refusal with a
  "play it instead" link rather than the form.
- It waits for `authReady` before deciding. Auth resolves asynchronously, so
  without that the page decides you are not the owner before Firebase has said
  who you are, and flashes a refusal at the real author on every reload. There
  is a test for exactly that.
- `AddStageForm` refuses an update whose `stage.userId` is not the current uid,
  as a second lock so a future page cannot reopen the hole by mounting the form.

**These are UX only. Firestore rules are the actual enforcement** — a client
check stops accidents, not a determined request. See the rules below.

Two bugs that produced this, both worth not repeating:
1. The in-game back button sent the hosting page to **`/save`** when a stage was
   played standalone. A stage played from the gallery can belong to anybody, so
   that offered every player — signed out included — an edit form for someone
   else's stage. It now goes to `/stages`.
2. Unifying `AddStageForm` and the old `EditStageForm` dropped the ownership
   check that `EditStageForm` had (`data.userId !== currentUserId`). Nothing
   replaced it until this was reported.

### Firestore rules these four collections need
Not written to `firestore.rules` on purpose — see the landmines below — but this
is the shape required:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /stages/{stage} {
          allow read: if true;
          allow create: if request.auth != null
                        && request.auth.uid == request.resource.data.userId;
          allow update, delete: if request.auth != null
                        && request.auth.uid == resource.data.userId;
        }
        // Write-only from the client: read them from the console or an admin
        // script, never from the site, or the uid list becomes public.
        match /stage_opens/{row}    { allow create: if true; allow read, update, delete: if false; }
        match /stage_attempts/{row} { allow create: if true; allow read, update, delete: if false; }
      }
    }

`stages` needs public **read** because `/stages` lists everyone's stages and
`/play/:id` loads one that may not be yours.

### ⚠️ Two deployment landmines

1. **`firestore.rules` in this repo denies everything**
   (`allow read, write: if false`), yet the live app reads and writes `stages`.
   The live rules were clearly changed elsewhere (console) and never synced back.
   **Do not deploy these rules — it would break the live site.** Fix the file to
   match reality *before* putting rules into any automated deploy.
2. **`firebase.json` has no `firestore` section**, so `firebase deploy` today
   only deploys hosting. That is currently what saves you from landmine #1.

When the rules file is eventually fixed, `/stages` sets the requirement: it
reads the whole `stages` collection, not just the signed-in user's documents,
and `/play/:id` reads a single stage that may belong to someone else. So the
rules need public (or at least signed-in) **read** on `stages`, with **write**
limited to `request.auth.uid == resource.data.userId`. Anything stricter on read
and the gallery shows its "not readable with the current rules" message.

---

## 4. Commands

### Node version
**Node 26 (the current LTS), npm 11.** Pinned in `.nvmrc`, declared as `engines`
in both `package.json` files, and enforced by `engine-strict=true` in `.npmrc`
(root and `game/`) so a wrong version fails at install with a clear message
instead of a confusing native-build or syntax error later. CI reads the same
`.nvmrc` via `node-version-file`, so CI and local cannot drift.

`nvm use` in either directory picks it up. Note that `engine-strict` also blocks
`npm install --package-lock-only`, so regenerating a lockfile must be done on
Node 26 — which is correct, because **the lockfiles must be generated by npm 11**
(see below).

### Two CI install failures, and what fixed them
Both were in dependency installation, not in any build:

1. **`canvas` failed to compile.** `game/package.json` carried a whole dead test
   stack — `canvas`, `jsdom`, `jsdom-global`, `mocha`, `chai`, `@babel/register`
   — supporting an `npm run unit` script that pointed at a `game/test/`
   directory **which does not exist**. `canvas` is a native module with no
   prebuilt binary for modern Node, so `npm ci` tried to build it from source
   and the runner has no cairo/pango. All of it is now removed, along with the
   `unit` script, `babel-loader` (webpack-era; vite is the bundler) and `path`
   (a userland package that shadows the Node builtin). Jest covers `game/src`
   now, so nothing was lost.
   **Keep `@babel/core`, `@babel/preset-env` and `@babel/plugin-transform-runtime`:**
   `game/.babelrc` references preset-env and babel-jest resolves it from there
   when transforming `game/src/__tests__`.

2. **`npm ci` rejected the lockfiles under npm 11.** Both lockfiles had been
   generated by an older npm on macOS and were missing the cross-platform
   optional packages (`@esbuild/*`, `@rollup/rollup-*`) that npm 11 insists on:
   *"Missing: @esbuild/linux-x64 from lock file"*. The root one had 3 platform
   entries where it needs 45. npm 10 tolerated this, which is why the site
   install passed in CI while the game install failed. Both lockfiles are now
   regenerated with npm 11 (45 and 44 platform entries).
   **If you ever regenerate a lockfile with an older npm it will prune those
   entries again and CI will break.** That is the main reason the Node version
   is enforced rather than merely suggested.

npm 11 also prints an `allow-scripts` warning and skips dependency install
scripts by default. Nothing here needs them — the full pipeline was verified on
Node 26.5.0 / npm 11.17.0 (both installs, lint, 102 tests, both builds) — so the
warning is noise, not a failure.

**`yarn.lock` and `game/yarn.lock` also exist and are vestigial.** CI uses
`npm ci`. Worse, npm 7+ *rewrites* `yarn.lock` whenever it exists, so an
`npm install` produces a large unrelated diff in it. Deleting both would remove
the ambiguity.

Verified state as of 2026-11-22:

| Command | Result |
|---|---|
| `npm ci` (root and `game/`) | both lockfiles install cleanly |
| `npm test` | **71 tests in 6 suites pass** |
| `npm run lint` | **7 errors + 1 warning** (see below) — was 383 before the config fix |
| `npm run build:game` | builds (1.5 MB bundle, Phaser) |
| `npm run build` | builds (680 kB JS) |

If `npm test` says `jest: command not found`, dev dependencies were never
installed — run `npm ci` first.

```bash
# install (root site + game are separate)
npm ci                    # root
npm --prefix game ci      # game

# develop: starts BOTH dev servers (scripts/dev.mjs)
npm run dev               # site on :5173, game on :8000, /game/* proxied
npm run dev:site          # site only  (game then comes from stale public/game)
npm run dev:game          # game only  (http://localhost:8000/game/)

# quality gates
npm run lint              # eslint flat config, root app
cd game && npm run lint   # eslint 7 + standard, --fix, src/**/*.js test/**/*.js
npm test                  # jest + RTL, 4 smoke tests in src/__tests__

# build — ORDER MATTERS, see below
npm run build:all         # game then site, in the right order (use this)
npm run build:game        # game only: vite build -> ../public/game + cp assets/*
npm run build             # site only: vite build -> dist/ (copies public/, incl. game/)

# deploy (manual, today)
firebase deploy           # hosting only; needs `npm install -g firebase-tools` + `firebase login`
```

### How local dev serves the game (read this before debugging "my change did nothing")
In a production build the game compiles into `public/game/`, which Vite copies
into `dist/`. That directory is **committed**, so the site's dev server would
happily serve a months-old game bundle as static files and nothing you change
under `game/src/` would appear.

So the root dev server **proxies `/game/*` to the game's own dev server** on
port 8000 (`server.proxy` in `vite.config.js`), which serves it from source
with hot reload. The proxy middleware runs before Vite's static handler, so it
wins over `public/game/`. Verified end to end: modules, `assets/**` (images,
Tiled maps, audio, fonts) and the HMR websocket all come through it.

The proxy target is the IPv4 literal `http://127.0.0.1:8000`, **not**
`localhost`. The game server binds `0.0.0.0`, which is IPv4 only, while Node
resolves `localhost` to `::1` first — a `localhost` target therefore fails with
`ECONNREFUSED ::1:8000` and the iframe renders white. Do not "tidy" that back
into `localhost`.

If the game's dev server is not reachable, the proxy now serves a short HTML
page inside the iframe saying so and naming the command to start it, instead of
a blank frame with the only clue in the terminal.

Consequences worth knowing:
- `npm run dev` starts both servers; one dying stops the other, because a
  half-running pair just yields 502s inside the iframe.
- The game's port is `strictPort: true`. If 8000 is busy it fails loudly rather
  than drifting to 8001 and silently breaking the proxy.
- `npm run dev:site` alone is the *old* behaviour: `/game/*` falls back to the
  stale committed bundle. Useful only when working purely on the React side.
- `npm run preview` serves `dist/`, so it needs `npm run build:all` first or it
  too shows a stale game.

### Build-order footgun
`game/vite.config.js` builds to `../public/game` with `emptyOutDir: true`, and
the game's `build` script then copies `assets/*` on top. The root build copies
`public/` into `dist/`. Therefore **the game must be built before the site**, or
`dist/game/` is stale. `npm run build:all` encodes this ordering — prefer it
over calling the two builds by hand.

### Outstanding lint errors (why CI's lint step is not blocking yet)
- `src/Login.jsx` — **genuinely broken**: uses `useState` and `auth` without
  importing them. It would throw if rendered; it is never mounted, which is why
  nobody noticed. Fix: `import { useState } from 'react'` and
  `import { auth } from './firebase'`.
- `src/BuildPage.jsx`, `src/SaveBuildPage.jsx` — `user` state is set but never
  used (the `onAuthStateChanged` effect has no effect).
- `src/__tests__/NavBar.test.jsx` — unused `actualFirebase` / `actualAuth`.

Also note the game's build output in `public/game/` is **committed to git** (50
tracked files, hashed JS bundle name included). Every game rebuild shows up as a
binary-ish diff. Decide: keep committing it (simple, noisy) or gitignore it and
always build in CI (clean, requires CI before any deploy).

### Dead / stale scripts
- `game/package.json` → `unit` runs mocha against `game/test`, **which does not
  exist**. `publish`/`itchio` push to itch.io project `pello/lucky-shot` via
  `butler` — a different game's slug, left over from a template.
- Both projects carry **both** `yarn.lock` and `package-lock.json`; README says
  yarn, lockfiles say either. Pick one package manager before automating.

---

## 5. Editor / canvas layout

The canvas is **1024x800**: the 800x800 map plus a **112px gutter on each
side**, defined in `layout.js`. The maps have a one-tile wall all round, so the
gutters are the only place UI can sit outside the walls.

- **Left gutter** — one vertical column at x=56: the 12 palette buttons (ball,
  brick, 4 spikes, bell, bat, rotator, sliding platform, rising platform,
  eraser) plus the clear-stage bins at the bottom, 13 slots. Clicking the
  selected button again deselects it — except for a sized element, where it
  lengthens it instead (see below).
- **Clear stage** (the double-bin icon) wipes every placed element and takes
  **two clicks**: the first arms it, tints it red and prompts; the second
  clears. The arming lapses after 4s on its own. It is a `SpriteButton`, not a
  palette entry, because it acts rather than selects — hence `setLockedTint`,
  so the red survives hovering away.
  Deliberately *not* `window.confirm`: a blocking native dialog inside the
  canvas swallows the `pointerup`, leaving Phaser's pointer stuck `isDown` and
  placing bricks as soon as the mouse re-enters the playfield.
- **Right gutter** — save, play, exit, in a column at x=968.
- **Eraser** is a palette tool (`ERASER = "trash"`), not a placeable element:
  `canBuild` refuses it and `buildBlock` bails out, so clicks only delete.
  Its 32x32 icon is *generated at runtime* in `bootloader.createEraserTexture()`
  because there is no trash image in `assets/`.
- **Only the inside of the walls is buildable** — `isInsidePlayfield()` gates
  both placement and the ghost cursor, replacing an older "bottom 110px is the
  toolbar" check.
- Button labels appear *beside* the icon (`tooltipSide: "left" | "right"`),
  because a centred label in a 112px gutter runs off the canvas.
- The canvas is a **fixed size scaled with `Phaser.Scale.FIT`**. Do not go back
  to sizing it from `window.innerWidth`: the map and the button columns then
  overflow a narrow viewport.

### The element catalogue (`elements.js`)
`elements.js` is the **single source of truth** for what a stage can contain,
shared by the editor (which writes names) and the play scene (which reads them
back). It is pure — no Phaser — so it is unit tested. Add new elements here,
not in `game_builder.js`.

An entry is `{ name, description, texture?, width?, stores?, sized? }`:
- `name` — palette id, and the stored name when there is no `stores`
- `texture` — what to draw when it differs from the name (both platforms reuse
  the `rotator` tile, since there is no platform art)
- `width` — fixed footprint in px, for an element wider than one tile
- `stores` — the name written into the stage, carrying what the play scene
  needs to rebuild it
- `sized` — length is a **run of 32px sprites** the player cycles, so the entry
  has no fixed `width` or `stores`. The rotator and both platforms are sized.

### Sized elements (length 3–11)
Clicking a sized element's palette button when it is **already selected makes
it longer** — 3, 4, … 11, then back to 3 — instead of deselecting it (which is
what clicking again does for every other button). The current length lives in
`game_builder.brickSizes` and shows in the button's tooltip, since the ghost
width is otherwise the only cue.

Length is stored as a sprite count: `rotator:3`, `platform_h:7`. `clampSize`
forces anything out of range or unparseable back into 3–11, so a hand-edited or
legacy stage degrades instead of producing a NaN-wide body.

**Orientation is separate from travel direction.** `parsePlacedName` returns
both `width` and `height`: the run goes *down* the screen for a bar flagged
`vertical` and *across* for the rest, with the other dimension always one tile.
- `platform_h` — flat bar (`size`×1), travels on **x**
- `platform_v` — upright bar (1×`size`), travels on **y**
- `rotator` — flat bar (`size`×1), pinned and spinning

So never assume the run is in `width`; read the `vertical` flag. Two tests
originally got this wrong and had to be corrected rather than the code.

**Unit trap:** `Rotator` measures its own length in **64px** units, while the
editor counts **32px** sprites, so `game.js` converts with
`width / ROTATOR_UNIT` (which is fractional for odd lengths — fine, it only
feeds a width calculation). The fixed Tiled stages still put raw 64px units in
their object names, so `rotator:5` means 320px there and 160px in an editor
stage. The two never meet: `addObjectsFromTiledMap` and
`addObjectsFromCustomBricks` are separate paths, and only the latter uses
`parsePlacedName`.

Placeholders for sized elements are **TileSprites, not stretched Sprites**, so
a run of 3 reads as three discrete rotator sprites — matching the real entities,
which are tileSprites too. `createPlacedElement()` in `custom_brick.js` picks
the shape: `CustomBrick` (Sprite) for one tile, `CustomBar` (TileSprite) for a
run. Both share one set of hover/delete handlers.

Stored names are **not all texture keys**. Two helpers bridge that:
`resolvePlacedName(selected, rng)` (palette id → stored name) and
`parsePlacedName(stored)` → `{ kind, tiles, width, axis? }`, used by both the
play scene and the editor's `placeholderFor`.

Sizes: a **rotator** is measured in its own 64px units (`Rotator` builds a
tileSprite `64 * numTiles` wide); the **platforms** are measured in 32px map
tiles. `ROTATOR_UNIT` exists so that difference is explicit.

The **brick button is one button** that stores a random `brick0`–`brick3` on
each placement. The spikes are still four separate buttons, since each is a
different direction rather than a different look.

Wide elements are **centre-origin** as entities but the editor stores their
**top-left** corner, so `game.js` offsets them by half their width when
rebuilding — otherwise they land half a bar left of where they were placed.

### The ball's spring
`Ball` builds a Matter constraint between a static anchor and the fireball, and
Phaser's **debug** constraint renderer is what draws it — there is no spring
art. `Ball.renderSpring()` paints it every frame (the renderer draws a static
picture of wherever the two bodies are now).

That call site used to be commented out, so **the spring was never visible in
any stage**, fixed or custom — not just editor-built ones. Two things keep it
working:
- The constraint is created with `render: { visible: true, type: 'spring' }`.
  `visible` is what `renderConstraint` checks before drawing anything. `type`
  only *happens* to default to the coil because the stiffness (0.01) is under
  Matter's 0.9 threshold — raising the stiffness would silently turn the coil
  into a straight line, so it is stated explicitly.
- Firing sets `showSpring = false` and nulls the graphics. The constraint object
  outlives its removal from the world, so without that the coil trails the
  flying ball.

The old method was called `renderDebug()` and also held a "pulled further than
220px and you die" rule that **could never fire**: `springLength()` returns
`undefined` unless `fireball.ready` is set, and nothing ever sets it. That rule
was not reinstated — turning it on changes how the game plays.

**Loose end:** `Ball.springSprite` is a `rotator` sprite placed once at the
midpoint between the anchor and the ball, and never moved again. It looks like
an abandoned attempt at drawing the spring (`spring.js`, also unused, does the
same thing but keeps it updated). It is now a stray tile sitting across the
drawn coil. Either track the midpoint or hide it — needs a visual call.

### Platforms
`platform.js` is **dead code**: Arcade physics (`scene.physics`, while the game
runs Matter) and textures `chain`/`platform2` that are never loaded. `spike.js`
has the same Arcade problem and is also unused — spikes are painted as damage
tiles instead. Neither is imported anywhere that runs.

`moving_platform.js` replaces it: a Matter tileSprite with a static body, moved
by a tween on `x` or `y`. Phaser's Matter transform setters push the tween's
value straight into the body, so the collision shape travels with the sprite —
the same trick `Rotator` uses for its spin. Travel is clamped against the bar's
extent *along the axis it travels on* (its height when vertical), flipping
direction if there is no room forward; verified to stay inside the walls at
every length from both extremes.

### Site pages and styling
Routes (`src/App.jsx`):

| Route | Page | Notes |
|---|---|---|
| `/` | `HomePage` | the fixed stages + your stage list |
| `/build` | `BuildPage` | editor, empty |
| `/build?continue=1` | `BuildPage` | editor, resuming the draft |
| `/save` | `SaveBuildPage` | save the stage just built |
| `/save/:id` | `SaveBuildPage` | edit a stored stage (same component) |
| `/play/:id` | `PlayPage` | play a stored stage |
| `/stages` | `LatestStagesPage` | the newest stages from **all** users, playable |

`src/index.css` holds the theme as CSS variables on `:root` (`--sky` is the
builder's own camera colour, `0x62a2bf`); `src/App.css` holds layout. **The file
used to end with a `prefers-color-scheme: light` block setting `:root` to
`#ffffff`.** `:root` outranks the `html, body { background: black }` rule above
it, so on any machine in light mode the entire site rendered white around the
dark canvas. The theme is now dark in both schemes — don't reintroduce a light
override without giving `body` a matching background.

`StagePreview.jsx` draws a stage thumbnail from its `mapData` by importing
`parseStage` and `parsePlacedName` from `game/src/`, so the preview cannot
disagree with what the game builds. Elements are positioned in percentages of
the 800x800 map, and sprites are the game's real PNGs under
`/game/assets/images/`. `background-size` carries the sprite sheet's frame
count (`bell.png` is 5 frames, `bat.png` is 6) so only the first frame shows —
drop that factor and a 5-frame sheet gets squashed into one tile.

`LatestStagesPage.jsx` is the only place that reads **other people's** stages:
`orderBy('createdAt', 'desc')` with a limit. Every stage ever saved has
`createdAt` (the original save form set it too), so nothing is silently dropped
— but note that `orderBy` omits documents missing the field entirely, so if a
stage is ever written without `createdAt` it will vanish from this page rather
than appear last. It handles `permission-denied` separately from other errors,
because that is exactly what restrictive Firestore rules look like from the
client, and an empty gallery would otherwise look like "nobody has built
anything".

### Stage thumbnails (base64 PNG on the document)
`src/stageImage.js` renders a stage to a PNG data URL on an offscreen canvas and
`AddStageForm` stores it on the document as `thumbnail`. It is **not** a capture
of the running game: it draws the stage from its `mapData` with the game's own
sprites, so no Phaser instance has to boot and any stage can be imaged without
playing it.

Measured on the real sprites at 240x240 (`scripts/` has no copy of this; it was
a one-off composite using Node's zlib):

| stage | elements | PNG | base64 |
|---|---|---|---|
| typical hand-built | 17 | 1.0 KB | 1.4 KB |
| busy | 60 | 1.2 KB | 1.6 KB |
| every cell filled | 529 | 3.0 KB | 4.1 KB |

So the worst case is **0.4% of Firestore's 1 MiB document limit**, and a
24-stage gallery page carries under 100 KB of thumbnails. That is why base64 on
the document is fine here and Firebase Storage is not needed — Storage would add
a bucket, rules and CORS to manage, and would only start to pay off at much
larger images or much longer lists, since a base64 field cannot be lazy-loaded
or CDN-cached and rides along with every list query.

Rules that keep it safe:
- `MAX_THUMBNAIL_BYTES` (180 KB) is checked at runtime. Over it, the stage saves
  **without** a thumbnail rather than failing.
- `thumbnailFor()` never throws. A thumbnail must never stop a stage saving.
- On update the field is only written when a new image was produced, so a failed
  render leaves the old thumbnail rather than blanking it.
- `StagePreview` takes an optional `thumbnail` and falls back to drawing the
  stage live. **That fallback is why no migration is needed**: stages saved
  before this existed simply render live, and get a thumbnail next time they are
  saved.
- The save page always draws live, never from the stored image — it must show
  what is on the canvas right now.

### Icons
**`lucide-react`** (the Feather successor), used for every button, link, heading
and status message. Chosen for size: `sideEffects: false` plus per-icon named
exports means Vite tree-shakes it to only what is imported. Measured cost of 22
icons: **+17.9 KB raw, +4.3 KB gzipped** (696.34 → 714.27 KB raw, 185.29 →
189.55 KB gzipped), about 194 bytes gzipped per icon. The full set is thousands
of icons and megabytes, so if the bundle ever jumps, something has broken
tree-shaking — most likely a barrel file re-exporting them.

Conventions:
- Always `import { Play, Pencil } from 'lucide-react'` — named, direct. Never
  `import * as icons`, and do not add a module that re-exports them.
- Every icon gets `className="icon"` and `aria-hidden="true"`. They all sit
  beside their own text label, so they are decorative and must not contribute
  to the accessible name — the tests assert button names like `'Play'` exactly.
- `.icon` is sized in `em`, so it tracks whatever text it sits beside. Buttons
  and `.button-link` are `inline-flex` with a gap to keep icon and label on one
  line.
- A spinner is `<Loader2 className="icon spin" />`; `.spin` is disabled under
  `prefers-reduced-motion`.

The home page deliberately has **no page title**. The "Txokas / Hit the bell.
Drag the ball back and let go." heading was removed: the game is the first thing
on the page and speaks for itself.

`src/stageLayout.js` holds the sprite catalogue and `stageElements()`, shared by
the DOM preview and the canvas renderer so the two cannot drift.

### The game page's white background
`game/index.html` had **no doctype, `<head>` or `<body>`** — just a `<div>` and
a `<script>`. The browser therefore built a quirks-mode document with the
default white background *and* the default 8px body margin, which showed as a
white frame around the canvas inside the site's iframe. That was the "ugly white
background", and it was there on every page embedding the game.

It is now a real document whose `html, body` are `#0e1b21` (the site's `--ink`)
with no margin, and the Phaser config sets `backgroundColor` to the same value
so neither the gutters nor any `Scale.FIT` letterboxing reads as a different
surface. Remember this file is the game's vite entry point, so the built
`public/game/index.html` inherits whatever it says.

`MyStageList.jsx` gives each stage **Play / Edit / Delete**. Delete arms in
place rather than calling `window.confirm`, which browsers can suppress. Edit
opens `/save/:id`; the stage only reaches the editor when you press "open in
the editor" there, which writes it to `DRAFT_KEY` — so merely looking at a
stored stage never clobbers a draft in progress.

**Removed:** `src/EditStageForm.jsx`. It was never mounted and its `updateDoc`
wrote `mapData: stageData.description`, i.e. saving through it would have
replaced the stage layout with the description text. `AddStageForm` now handles
both create and update. `AddStageForm` was also mounted on `HomePage` with no
`mapData` at all, which stored stages with `mapData: undefined`; it is now only
on the save page, which has a stage.

### Jest and JSX
`babel.config.cjs` sets `['@babel/preset-react', { runtime: 'automatic' }]` to
match Vite's React plugin. Several components (`SaveBuildPage`, `BuildPage`,
`AuthStatus`, `Logout`, `main`) have no `import React`, which is fine with the
automatic runtime but threw **"React is not defined"** under Babel's classic
default — and only when a test first touched the file, so it looked like a test
bug rather than a config one. Leave the runtime on `automatic`.

## 6. Conventions

- **Site:** React 19 function components, default exports, one component per
  file, flat `src/`. Plain CSS (`App.css`, `index.css`), no CSS modules, no TS.
  Firebase accessed directly from components (no service/hook layer).
  Tests are `src/__tests__/<Component>.test.jsx`, Jest + Testing Library,
  `@testing-library/jest-dom` matchers; assets stubbed via `__mocks__/fileMock.js`.
- **Game:** one Phaser class per file, default export, ES modules, `Phaser` used
  as a global (provided via import in `init.js`, declared global in eslint).
  Scenes keyed by lowercase string (`"game"`, `"game_builder"`), entities are
  `Phaser.Physics.Matter.Sprite`/`Image` subclasses that register themselves in
  their constructor. Physics is **Matter**, with `phaser-matter-collision-plugin`
  for collision callbacks.
  Style is *not* consistent with the site: game eslint wants 4-space indent and
  double quotes; the site uses 2-space. Respect the local config of the folder
  you are editing.
- There is still debug `console.log` scattered through both halves, and a few
  commented-out calls (`playMusic`, `buildSmoke`). Not load-bearing.
- **`game/` lint is noise.** `cd game && npx eslint src/*.js` reports ~1050
  errors, of which ~725 predate any recent work: `game/.eslintrc.js` extends
  `standard` and demands 4-space indent and double quotes, which essentially no
  file in `game/src` follows. Any new code there adds more of the same. Either
  reformat the folder once or relax the config — until then do not treat this
  number as a signal, and do not run the `--fix` that `npm run lint` applies
  unless you mean to reformat 19 files.

---

## 7. Automating development and deployment — current state & plan

**Today: nothing is automated.** No `.github/` workflows, no CI, no hooks.
Deployment is a human running `npm run build && firebase deploy` locally, and
the game half is rebuilt by hand before that (or forgotten).

### Step 1 — CI on push/PR (done: `.github/workflows/ci.yml`)
Runs on pushes to `master`, on every PR, and manually. Node 22, npm cache keyed
on both lockfiles. Installs both projects with `npm ci`, lints, tests, builds
game then site, uploads `dist/` as an artifact.
- The **lint step is `continue-on-error: true`** because of the 7 pre-existing
  errors listed in §4. Fix those, then remove that line to make lint blocking.
- The site build reads `VITE_FIREBASE_*` from repo secrets; it builds without
  them (the values just inline as `undefined`), so CI is green before you set
  them, but the artifact will not be deployable until you do.

Also fixed along the way: root eslint now ignores `game/`, `public/game/`,
`build/` and `dist/` and knows about Jest globals (383 → 7 errors), and
`jest.config.js` ignores `game/` to silence the haste module-name collision
caused by both `package.json` files being named `txokas`.

### Step 2 — encode the build order (done)
Root `package.json` now has `build:game` and `build:all`, so the site can no
longer be built against a stale game bundle. CI uses the explicit two-step form
so the game and site build steps show up separately in the log. `README.md`
deploys with `npm run build:all && firebase deploy` — deploying after a plain
`npm run build` ships whatever game bundle happens to be committed.

### Step 3 — automated deploy to Firebase Hosting
Needs a GitHub secret holding a **service-account JSON** with the
*Firebase Hosting Admin* role on project `cafe-126bd`:
```bash
firebase init hosting:github      # generates the workflow + sets the secret
```
Recommended shape:
- PRs → `FirebaseExtended/action-hosting-deploy` with `channelId: pr-<n>` for a
  **preview channel** URL per PR.
- Push to `master` → deploy to `live`.
- The `VITE_FIREBASE_*` values must be present at **build** time (they are
  inlined into the bundle by Vite), so they belong in CI as repo secrets/vars,
  mirroring `.env-sample`. They are public-by-design client config, but keep
  them in secrets anyway so the repo stays clean.
- **Keep the deploy hosting-only** until `firestore.rules` is fixed (§3).

### Step 4 — once CI is trusted
- Gitignore `public/game/` and let CI be the only thing that builds it.
- Delete dead code: `src/index.js`, `public/index.html`, `build/`, the
  `itchio`/`publish`/`unit` scripts in `game/package.json`.
- ~~Add real tests for the map round-trip~~ — done: `game/src/__tests__`
  covers `layout.js` and `elements.js` (the editor/play-scene name contract,
  grid snapping, storage coordinates, palette fits). Root Jest runs them; the
  game's package is named `txokas-game` so the two `package.json` files no
  longer collide in jest-haste-map. Everything else in the game needs Phaser
  booted, which is not possible here (see below).
- A headless smoke test that boots both scenes would catch the runtime errors
  that unit tests cannot. Blocked: `game/node_modules/canvas` is a prebuilt
  binary for an older Node ABI and fails to load on Node 22. Needs
  `brew install pkg-config cairo pango libpng jpeg giflib librsvg` then
  `npm --prefix game rebuild canvas`.
- Unify on one package manager and delete the other lockfile.
