import {
  serializeStage,
  parseStage,
  readStage,
  writeStage,
  DRAFT_KEY,
  PLAY_KEY,
} from '../stage_io.js';
import { MAP_OFFSET_X, MAP_OFFSET_Y, PLAYFIELD } from '../layout.js';

describe('stage_io keys', () => {
  it('keeps the historic draft key so existing drafts still load', () => {
    expect(DRAFT_KEY).toBe('currentMap');
  });

  it('uses a separate key for a stage being played', () => {
    expect(PLAY_KEY).not.toBe(DRAFT_KEY);
  });
});

describe('serializeStage', () => {
  it('stores map coordinates, not canvas coordinates', () => {
    const bricks = [{ x: MAP_OFFSET_X + 64, y: MAP_OFFSET_Y + 96, name: 'brick0' }];

    expect(serializeStage(bricks)).toEqual([{ x: 64, y: 96, name: 'brick0' }]);
  });

  it('keeps only x, y and name', () => {
    const stage = serializeStage([
      { x: MAP_OFFSET_X, y: MAP_OFFSET_Y, name: 'bell', scene: {}, texture: {}, body: {} },
    ]);

    expect(Object.keys(stage[0]).sort()).toEqual(['name', 'x', 'y']);
  });

  it('drops destroyed or nameless entries', () => {
    expect(serializeStage([null, undefined, {}, { x: 1, y: 1 }])).toEqual([]);
  });

  it('handles no argument', () => {
    expect(serializeStage()).toEqual([]);
  });
});

describe('parseStage', () => {
  it('converts stored map coordinates back to canvas coordinates', () => {
    expect(parseStage('[{"x":64,"y":96,"name":"brick0"}]')).toEqual([
      { x: MAP_OFFSET_X + 64, y: MAP_OFFSET_Y + 96, name: 'brick0' },
    ]);
  });

  it('accepts an already-parsed array', () => {
    expect(parseStage([{ x: 0, y: 0, name: 'bell' }])).toHaveLength(1);
  });

  it('returns an empty stage for anything unusable', () => {
    // These all reach the scene in practice: a browser with no draft, a stage
    // saved before mapData existed, or a hand-edited Firestore document.
    for (const input of [null, undefined, '', 'not json', '{}', '42', '"text"', {}, 7]) {
      expect(parseStage(input)).toEqual([]);
    }
  });

  it('drops entries that would place an element at NaN', () => {
    const stage = parseStage([
      { x: 'left', y: 10, name: 'brick0' },
      { x: 10, y: null, name: 'brick0' },
      { x: 10, y: 10, name: '' },
      { x: 10, y: 10 },
      { x: 32, y: 32, name: 'bell' },
    ]);

    expect(stage).toEqual([{ x: MAP_OFFSET_X + 32, y: MAP_OFFSET_Y + 32, name: 'bell' }]);
  });
});

describe('round trip', () => {
  it('returns a stage to exactly where it was built', () => {
    const built = [
      { x: PLAYFIELD.left, y: PLAYFIELD.top, name: 'fireball' },
      { x: PLAYFIELD.right - 32, y: PLAYFIELD.bottom - 32, name: 'bell' },
      { x: MAP_OFFSET_X + 320, y: MAP_OFFSET_Y + 320, name: 'rotator:7' },
      { x: MAP_OFFSET_X + 96, y: MAP_OFFSET_Y + 160, name: 'platform_v:5' },
    ];

    expect(parseStage(JSON.stringify(serializeStage(built)))).toEqual(built);
  });

  it('survives a second trip through storage unchanged', () => {
    const built = [{ x: MAP_OFFSET_X + 64, y: MAP_OFFSET_Y + 64, name: 'spike2' }];
    const once = parseStage(JSON.stringify(serializeStage(built)));
    const twice = parseStage(JSON.stringify(serializeStage(once)));

    expect(twice).toEqual(built);
  });
});

describe('localStorage access', () => {
  // Note: jsdom's `window` is not replaceable by assigning global.window, so
  // these exercise the real localStorage and spy on it.
  beforeEach(() => {
    window.localStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it('reads and writes through the given key', () => {
    const bricks = [{ x: MAP_OFFSET_X + 32, y: MAP_OFFSET_Y + 32, name: 'bell' }];

    expect(writeStage(PLAY_KEY, bricks)).toBe(true);
    expect(readStage(PLAY_KEY)).toEqual(bricks);
    // Keys do not bleed into each other.
    expect(readStage(DRAFT_KEY)).toEqual([]);
  });

  it('writes the stored form, so the site can hand it to Firestore as is', () => {
    writeStage(DRAFT_KEY, [{ x: MAP_OFFSET_X + 64, y: MAP_OFFSET_Y, name: 'brick1' }]);

    expect(JSON.parse(window.localStorage.getItem(DRAFT_KEY)))
      .toEqual([{ x: 64, y: 0, name: 'brick1' }]);
  });

  it('survives storage that throws, as in private mode', () => {
    // jsdom's localStorage own properties are not configurable; the prototype
    // is where it can be made to fail.
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(readStage(DRAFT_KEY)).toEqual([]);
    expect(writeStage(DRAFT_KEY, [])).toBe(false);
  });
});
