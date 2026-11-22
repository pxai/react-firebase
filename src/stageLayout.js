// How a stage is laid out, and which sprite draws each element.
//
// Shared by the DOM preview (StagePreview) and the canvas renderer that makes
// the stored thumbnails (stageImage), so the two cannot disagree. It reads the
// game's own modules, so neither can disagree with what the game builds either.
import { parsePlacedName } from '../game/src/elements.js';
import { parseStage } from '../game/src/stage_io.js';
import { toMapX, toMapY } from '../game/src/layout.js';

// Served from /game/assets/ in both dev (proxied to the game's dev server) and
// production (built into public/game/).
export const SPRITE_BASE = '/game/assets/images/';

// `frames` is how many 32px frames the file holds; only the first is drawn.
export const SPRITES = {
  fireball: { file: 'fireball.png', frames: 1 },
  bell: { file: 'bell.png', frames: 5 },
  bat: { file: 'bat.png', frames: 6 },
  rotator: { file: 'rotator.png', frames: 1 },
  brick0: { file: 'brick0.png', frames: 1 },
  brick1: { file: 'brick1.png', frames: 1 },
  brick2: { file: 'brick2.png', frames: 1 },
  brick3: { file: 'brick3.png', frames: 1 },
  spike0: { file: 'spike0.png', frames: 1 },
  spike1: { file: 'spike1.png', frames: 1 },
  spike2: { file: 'spike2.png', frames: 1 },
  spike3: { file: 'spike3.png', frames: 1 },
};

// Colours taken from the theme, for the canvas renderer (which cannot read CSS
// variables) and as the fallback for an element with no art.
export const COLOURS = {
  sky: '#62a2bf',
  wall: '#3e6875',
  unknown: '#ffd166',
};

export const spriteFor = (name) => {
  const { kind } = parsePlacedName(name);

  // The platforms have no art of their own; they are built from rotator tiles.
  if (kind === 'platform_h' || kind === 'platform_v' || kind === 'rotator') {
    return SPRITES.rotator;
  }

  return SPRITES[name] || null;
};

// A stage's elements in MAP coordinates (0,0 = the map's top-left), each with
// the footprint it occupies and the sprite that draws it.
//
// parseStage returns canvas coordinates, which include the UI gutter offset;
// converting back keeps the preview independent of the gutters, so it can be
// positioned as a percentage of the 800x800 map at any display size.
export const stageElements = (mapData) =>
  parseStage(mapData).map((element, index) => {
    const { width, height } = parsePlacedName(element.name);

    return {
      key: `${index}-${element.name}`,
      name: element.name,
      x: toMapX(element.x),
      y: toMapY(element.y),
      width,
      height,
      sprite: spriteFor(element.name),
    };
  });
