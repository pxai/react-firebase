// Canvas geometry: the button columns must stay outside the map walls, and the
// grid helpers must agree with the tilemap the stages are drawn on.
import * as L from '../layout.js';

const ICON = 32;

describe('gutters', () => {
  test('the canvas is the map plus one gutter each side', () => {
    expect(L.CANVAS_WIDTH).toBe(L.MAP_WIDTH + (L.GUTTER * 2));
    expect(L.CANVAS_HEIGHT).toBe(L.MAP_HEIGHT);
  });

  test('the map is centred, so canvas centre is map centre', () => {
    expect(L.MAP_OFFSET_X + (L.MAP_WIDTH / 2)).toBe(L.CANVAS_WIDTH / 2);
  });

  test('a left-column button sits clear of the map', () => {
    expect(L.LEFT_COLUMN_X - (ICON / 2)).toBeGreaterThanOrEqual(0);
    expect(L.LEFT_COLUMN_X + (ICON / 2)).toBeLessThanOrEqual(L.MAP_OFFSET_X);
  });

  test('a right-column button sits clear of the map', () => {
    expect(L.RIGHT_COLUMN_X - (ICON / 2)).toBeGreaterThanOrEqual(L.MAP_OFFSET_X + L.MAP_WIDTH);
    expect(L.RIGHT_COLUMN_X + (ICON / 2)).toBeLessThanOrEqual(L.CANVAS_WIDTH);
  });
});

describe('playfield', () => {
  test('is the map inset by the one-tile wall', () => {
    expect(L.PLAYFIELD.left).toBe(L.MAP_OFFSET_X + L.TILE);
    expect(L.PLAYFIELD.right).toBe(L.MAP_OFFSET_X + L.MAP_WIDTH - L.TILE);
    expect(L.PLAYFIELD.top).toBe(L.TILE);
    expect(L.PLAYFIELD.bottom).toBe(L.MAP_HEIGHT - L.TILE);
  });

  test('rejects the gutters, so clicking a button never places a brick', () => {
    expect(L.isInsidePlayfield(L.LEFT_COLUMN_X, L.CANVAS_HEIGHT / 2)).toBe(false);
    expect(L.isInsidePlayfield(L.RIGHT_COLUMN_X, L.CANVAS_HEIGHT / 2)).toBe(false);
  });

  test('rejects the walls', () => {
    expect(L.isInsidePlayfield(L.MAP_OFFSET_X, 400)).toBe(false);                      // left wall
    expect(L.isInsidePlayfield(L.MAP_OFFSET_X + (24 * L.TILE), 400)).toBe(false);       // right wall
    expect(L.isInsidePlayfield(400, 0)).toBe(false);                                    // top wall
    expect(L.isInsidePlayfield(400, L.MAP_HEIGHT - L.TILE)).toBe(false);                // bottom wall
  });

  test('accepts every interior tile', () => {
    for (let tx = 1; tx <= 23; tx++) {
      for (let ty = 1; ty <= 23; ty++) {
        expect(L.isInsidePlayfield(L.MAP_OFFSET_X + (tx * L.TILE), ty * L.TILE)).toBe(true);
      }
    }
  });
});

describe('grid', () => {
  test('snapping lands on the map grid and resolves to the hovered tile', () => {
    for (let tx = 1; tx <= 23; tx++) {
      for (let ty = 1; ty <= 23; ty++) {
        const x = L.MAP_OFFSET_X + (tx * L.TILE);
        const y = ty * L.TILE;
        const snapped = L.snapToGrid(x + 1, y + 1);
        expect(snapped).toEqual({ x, y });
        expect(L.toTileX(snapped.x)).toBe(tx);
        expect(L.toTileY(snapped.y)).toBe(ty);
      }
    }
  });
});

describe('storage coordinates', () => {
  test('round-trip through map coordinates is lossless', () => {
    for (let tx = 1; tx <= 23; tx++) {
      const x = L.MAP_OFFSET_X + (tx * L.TILE);
      expect(L.fromMapX(L.toMapX(x))).toBe(x);
    }
    for (let ty = 1; ty <= 23; ty++) {
      const y = ty * L.TILE;
      expect(L.fromMapY(L.toMapY(y))).toBe(y);
    }
  });

  test('stored coordinates are relative to the map, not the canvas', () => {
    // The top-left playable cell is canvas x=144 but must store as x=32,
    // so a stage survives a change to the gutter width.
    expect(L.toMapX(L.PLAYFIELD.left)).toBe(L.TILE);
    expect(L.toMapX(L.PLAYFIELD.left)).not.toBe(L.PLAYFIELD.left);
  });
});
