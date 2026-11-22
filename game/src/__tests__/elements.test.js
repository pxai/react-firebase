// The editor writes element names into a stage; the play scene reads them back
// and rebuilds the stage from them. These are the two ends of that contract,
// and nothing else in the game is unit testable without booting Phaser — so
// this is where a mismatch gets caught.
import * as E from '../elements.js';
import * as L from '../layout.js';

// What game.js's addObjectsFromCustomBricks actually knows how to build.
const playSceneHandles = (name) =>
  name === 'bat' || name === 'bell' || name === 'fireball' ||
  name.startsWith('rotator') || name.startsWith('platform_') ||
  name.startsWith('brick') || name.startsWith('spike');

// Textures bootloader.js loads or generates.
const loadedTextures = new Set([
  'fireball', 'bell', 'bat', 'rotator', 'pello', 'play', 'save', 'back', 'map',
  'trash', 'trash_all',
  ...Array.from({ length: 4 }, (_, i) => `brick${i}`),
  ...Array.from({ length: 4 }, (_, i) => `spike${i}`),
]);

const placeable = E.PALETTE.filter((entry) => !E.isTool(entry.name));

describe('palette', () => {
  test('every button has a texture the bootloader provides', () => {
    for (const entry of E.PALETTE) {
      expect(loadedTextures).toContain(entry.texture || entry.name);
    }
  });

  test('both required elements can actually be placed', () => {
    for (const name of E.ONLY_ONCE) {
      expect(E.paletteByName[name]).toBeDefined();
    }
  });

  test('the column fits on the canvas, including the clear-stage button', () => {
    const spacing = 48;
    const slots = E.PALETTE.length + 1; // + the clear-stage bins
    const top = (L.CANVAS_HEIGHT - ((slots - 1) * spacing)) / 2;
    const bottom = top + ((slots - 1) * spacing);
    expect(top - 16).toBeGreaterThanOrEqual(0);
    expect(bottom + 16).toBeLessThanOrEqual(L.CANVAS_HEIGHT);
  });

  test('no element is wider than the playfield', () => {
    const playfield = L.PLAYFIELD.right - L.PLAYFIELD.left;
    for (const entry of E.PALETTE) {
      const width = entry.sized ? E.widthForSize(E.MAX_SPRITES) : (entry.width || L.TILE);
      expect(width).toBeLessThanOrEqual(playfield);
    }
  });
});

describe('placing an element', () => {
  test.each(placeable.map((e) => [e.name]))(
    '%s stores a name the play scene can rebuild',
    (name) => {
      const stored = E.resolvePlacedName(name, () => 0);
      expect(playSceneHandles(stored)).toBe(true);
    }
  );

  test.each(placeable.map((e) => [e.name]))(
    '%s stores a name the editor can redraw',
    (name) => {
      const stored = E.resolvePlacedName(name, () => 0);
      const placeholder = E.placeholderFor(stored);
      expect(loadedTextures).toContain(placeholder.texture);

      if (!E.isSized(name)) {
        expect(placeholder.width).toBe(E.paletteByName[name].width || 0);
        return;
      }

      // The run is the tall dimension for a vertical bar, the wide one
      // otherwise; the other dimension is always a single tile.
      const run = E.widthForSize(E.MIN_SPRITES);
      const vertical = E.isVertical(name);
      expect(vertical ? placeholder.height : placeholder.width).toBe(run);
      expect(vertical ? placeholder.width : placeholder.height).toBe(L.TILE);
    }
  );
});

describe('the random brick button', () => {
  test('can produce every brick sprite, and only brick sprites', () => {
    const rolled = Array.from(
      { length: E.BRICK_SPRITES },
      (_, i) => E.resolvePlacedName(E.BRICK_ANY, () => i)
    );
    expect(new Set(rolled).size).toBe(E.BRICK_SPRITES);
    for (const name of rolled) expect(name).toMatch(/^brick\d+$/);
  });

  test('stays within the available sprites over many rolls', () => {
    const allowed = new Set(
      Array.from({ length: E.BRICK_SPRITES }, (_, i) => `brick${i}`)
    );
    for (let i = 0; i < 400; i++) {
      expect(allowed).toContain(E.resolvePlacedName(E.BRICK_ANY));
    }
  });
});

const sized = E.PALETTE.filter((e) => e.sized);

describe('sized elements', () => {
  test('the rotator and both platforms are sizeable', () => {
    expect(sized.map((e) => e.name)).toEqual(['rotator', 'platform_h', 'platform_v']);
  });

  test('default to three sprites', () => {
    for (const entry of sized) {
      const stored = E.resolvePlacedName(entry.name, undefined, E.MIN_SPRITES);
      expect(stored).toBe(`${entry.name}:3`);
      expect(E.parsePlacedName(stored).sprites).toBe(3);
    }
  });

  test('a sprite run is that many tiles long, at every length', () => {
    for (let size = E.MIN_SPRITES; size <= E.MAX_SPRITES; size++) {
      expect(E.widthForSize(size)).toBe(size * L.TILE);
      for (const entry of sized) {
        const stored = E.resolvePlacedName(entry.name, undefined, size);
        const parsed = E.parsePlacedName(stored);
        const run = size * L.TILE;
        expect(parsed.sprites).toBe(size);
        // The run goes down the screen for a vertical bar, across otherwise.
        expect(parsed.vertical ? parsed.height : parsed.width).toBe(run);
        expect(parsed.vertical ? parsed.width : parsed.height).toBe(L.TILE);
        const placeholder = E.placeholderFor(stored);
        expect(placeholder.width).toBe(parsed.width);
        expect(placeholder.height).toBe(parsed.height);
      }
    }
  });

  test('clicking through the sizes walks 3..11 then wraps to 3', () => {
    const walk = [];
    let size = E.MIN_SPRITES;
    for (let click = 0; click < E.MAX_SPRITES - E.MIN_SPRITES + 1; click++) {
      walk.push(size);
      size = E.nextSize(size);
    }
    expect(walk).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(size).toBe(E.MIN_SPRITES);
  });

  test('platforms slide on the axis their name implies', () => {
    expect(E.parsePlacedName('platform_h:5').axis).toBe('x');
    expect(E.parsePlacedName('platform_v:5').axis).toBe('y');
  });

  test('only the rising platform is a vertical bar', () => {
    expect(E.isVertical('platform_v')).toBe(true);
    expect(E.isVertical('platform_h')).toBe(false);
    expect(E.isVertical('rotator')).toBe(false);
  });

  test('the rising platform is one tile wide and `size` tall', () => {
    for (let size = E.MIN_SPRITES; size <= E.MAX_SPRITES; size++) {
      const parsed = E.parsePlacedName(`platform_v:${size}`);
      expect(parsed.width).toBe(L.TILE);
      expect(parsed.height).toBe(size * L.TILE);
      expect(parsed.axis).toBe('y');
    }
  });

  test('the sliding platform is `size` wide and one tile tall', () => {
    for (let size = E.MIN_SPRITES; size <= E.MAX_SPRITES; size++) {
      const parsed = E.parsePlacedName(`platform_h:${size}`);
      expect(parsed.width).toBe(size * L.TILE);
      expect(parsed.height).toBe(L.TILE);
      expect(parsed.axis).toBe('x');
    }
  });

  test('a rotator length converts to whole or half rotator units', () => {
    // Rotator measures length in 64px units, so a sprite count has to divide
    // cleanly enough to produce the exact pixel width back.
    for (let size = E.MIN_SPRITES; size <= E.MAX_SPRITES; size++) {
      const { width } = E.parsePlacedName(`rotator:${size}`);
      const units = width / E.ROTATOR_UNIT;
      expect(units * E.ROTATOR_UNIT).toBe(width);
    }
  });

  test.each([
    ['rotator'], ['rotator:'], ['rotator:abc'], ['platform_h'],
    ['platform_v:0'], ['rotator:-4'], ['rotator:999'], ['platform_h:2'],
  ])('%s clamps into the 3..11 range instead of breaking', (stored) => {
    const parsed = E.parsePlacedName(stored);
    expect(parsed.sprites).toBeGreaterThanOrEqual(E.MIN_SPRITES);
    expect(parsed.sprites).toBeLessThanOrEqual(E.MAX_SPRITES);
    expect(Number.isFinite(parsed.width)).toBe(true);
    expect(Number.isFinite(parsed.height)).toBe(true);
    const run = parsed.vertical ? parsed.height : parsed.width;
    expect(run).toBe(parsed.sprites * L.TILE);
  });

  test('no length at any size overflows the playfield, either way up', () => {
    const across = L.PLAYFIELD.right - L.PLAYFIELD.left;
    const down = L.PLAYFIELD.bottom - L.PLAYFIELD.top;
    const longest = E.widthForSize(E.MAX_SPRITES);
    expect(longest).toBeLessThanOrEqual(across);
    expect(longest).toBeLessThanOrEqual(down);
  });
});

describe('tools', () => {
  test('the eraser and the clear-stage bins are both tools, not elements', () => {
    expect(E.isTool(E.ERASER)).toBe(true);
    expect(E.isTool(E.CLEAR_ALL)).toBe(true);
    for (const entry of placeable) expect(E.isTool(entry.name)).toBe(false);
  });

  test('neither tool is placeable', () => {
    expect(placeable.map((e) => e.name)).not.toContain(E.ERASER);
    expect(placeable.map((e) => e.name)).not.toContain(E.CLEAR_ALL);
  });

  test('the clear-stage icon is distinct from the eraser', () => {
    expect(E.CLEAR_ALL).not.toBe(E.ERASER);
  });
});
