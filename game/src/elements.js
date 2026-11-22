// The catalogue of things a stage can contain.
//
// Single source of truth, shared by the editor (which writes these names) and
// the play scene (which reads them back). Keeping it in one pure module means
// the two cannot drift apart on a name or a size, and it can be tested without
// booting Phaser.
// Explicit extension so this module also loads in plain Node (for tests).
import { TILE } from './layout.js';

export const ERASER = "trash";
export const CLEAR_ALL = "trash_all";

// One palette button for solid bricks: each placement rolls a random sprite.
export const BRICK_ANY = "brick";
export const BRICK_SPRITES = 4;
export const SPIKE_SPRITES = 4;

// Sized elements (the rotator and both platforms) are built from a run of
// 32px sprites. The editor stores that sprite count, and clicking the palette
// button again cycles the length.
export const MIN_SPRITES = 3;
export const MAX_SPRITES = 11;

// Rotator measures its own length in 64px units internally, so a sprite count
// converts with this. (The fixed Tiled stages still use those raw units in
// their object names — see addObjectsFromTiledMap, which is a separate path.)
export const ROTATOR_UNIT = 64;

export const clampSize = (size) => {
  const n = Math.floor(Number(size));
  if (!Number.isFinite(n) || n < MIN_SPRITES) return MIN_SPRITES;
  return Math.min(n, MAX_SPRITES);
};

// Width in px of a run of `size` sprites.
export const widthForSize = (size) => TILE * clampSize(size);

// Click-again cycling: 3, 4, ... 11, back to 3.
export const nextSize = (size) => {
  const current = clampSize(size);
  return current >= MAX_SPRITES ? MIN_SPRITES : current + 1;
};

// Elements that may appear at most once in a stage, and are both required for
// it to be playable: something to shoot, and something to hit.
export const ONLY_ONCE = ["bell", "fireball"];

// `name`    palette id, and the stored name when there is no `stores`
// `texture` what to draw, when it differs from the name
// `width`   real footprint in px, for elements wider than one tile
// `stores`  the name written into the stage, carrying any size
export const PALETTE = [
  { name: "fireball", description: "Ball" },
  { name: BRICK_ANY, description: "Solid brick", texture: "brick0" },
  ...Array.from({ length: SPIKE_SPRITES }, (_, i) => ({
    name: `spike${i}`, description: `Deadly spike ${i}`
  })),
  { name: "bell", description: "Bell to ring" },
  { name: "bat", description: "Bat" },
  // `sized`: built from a run of sprites whose length the palette button
  // cycles, so these carry no fixed width or stored name.
  { name: "rotator", description: "Rotating platform", sized: true },
  { name: "platform_h", description: "Sliding platform", texture: "rotator", sized: true },
  // The rising platform is a VERTICAL bar: one tile wide, `size` tall. Its run
  // of sprites stacks instead of lying flat.
  { name: "platform_v", description: "Rising platform", texture: "rotator", sized: true, vertical: true },
  { name: ERASER, description: "Erase element" },
];

export const paletteByName = Object.fromEntries(PALETTE.map((e) => [e.name, e]));

// Tools act or select a mode rather than placing something.
export const isTool = (name) => name === ERASER || name === CLEAR_ALL;

// Does this palette entry have a cycleable length?
export const isSized = (name) => !!paletteByName[name]?.sized;

// Does its run of sprites stack vertically rather than lie flat?
export const isVertical = (name) => !!paletteByName[name]?.vertical;

const defaultRandomSprite = (count) => Math.floor(Math.random() * count);

// What a palette selection is stored as. Sized elements carry their current
// sprite count; the brick button rolls a sprite.
export const resolvePlacedName = (selected, randomSprite = defaultRandomSprite, size = MIN_SPRITES) => {
  if (selected === BRICK_ANY) return `brick${randomSprite(BRICK_SPRITES)}`;
  if (isSized(selected)) return `${selected}:${clampSize(size)}`;
  return paletteByName[selected]?.stores || selected;
};

// Read a stored name back: `{ kind, tiles, width }`. `tiles` and `width` are
// only meaningful for the sized elements.
export const parsePlacedName = (name) => {
  const [kind, size] = String(name).split(":");

  if (isSized(kind)) {
    const sprites = clampSize(size);
    const run = widthForSize(sprites);
    const vertical = isVertical(kind);

    return {
      kind,
      sprites,
      tiles: sprites,
      vertical,
      // The run goes down the screen for a vertical bar, across for the rest.
      width: vertical ? TILE : run,
      height: vertical ? run : TILE,
      axis: kind === "platform_v" ? "y" : "x"
    };
  }

  return { kind, sprites: 1, tiles: 1, vertical: false, width: TILE, height: TILE };
};

// How to draw a stored element in the editor. Stored names are not all texture
// keys: the sized ones carry a size and reuse the rotator tile.
export const placeholderFor = (name) => {
  const { kind, width, height } = parsePlacedName(name);

  if (isSized(kind)) return { texture: "rotator", width, height };

  return { texture: name, width: 0, height: 0 };
};
