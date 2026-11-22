import { renderStageToDataUrl, thumbnailFor, MAX_THUMBNAIL_BYTES, THUMBNAIL_SIZE } from '../stageImage';
import { TILE, MAP_WIDTH } from '../../game/src/layout.js';

// jsdom has no 2D context, so the canvas is stubbed and the test asserts what
// was drawn: positions, the first-frame crop, and the tiling of sized runs.
const makeContext = () => ({
  calls: [],
  imageSmoothingEnabled: true,
  fillStyle: null,
  fillRect(...args) { this.calls.push(['fillRect', this.fillStyle, ...args]); },
  drawImage(...args) { this.calls.push(['drawImage', ...args]); },
});

let context;
let toDataUrl;

beforeEach(() => {
  context = makeContext();
  toDataUrl = jest.fn(() => 'data:image/png;base64,AAAA');

  // Only the canvas is faked. jsdom builds `new Image()` through
  // createElement too, so everything else must reach the real implementation
  // or the image never fires onload.
  const createElement = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tag, ...rest) => {
    if (tag !== 'canvas') return createElement(tag, ...rest);
    return { width: 0, height: 0, getContext: () => context, toDataURL: toDataUrl };
  });

  // Every sprite loads, at its real natural size. naturalWidth/naturalHeight
  // are read-only accessors on jsdom's image, so they have to be defined as own
  // properties — assigning to them throws in strict mode, which would make
  // every sprite look like a failed load.
  const sizes = { 'bell.png': [160, 32], 'bat.png': [192, 32], 'fireball.png': [16, 16] };
  Object.defineProperty(global.Image.prototype, 'src', {
    configurable: true,
    set(src) {
      const [width, height] = sizes[src.split('/').pop()] || [32, 32];
      Object.defineProperty(this, 'naturalWidth', { value: width, configurable: true });
      Object.defineProperty(this, 'naturalHeight', { value: height, configurable: true });
      setTimeout(() => this.onload && this.onload(), 0);
    },
  });

  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const drawn = () => context.calls.filter((c) => c[0] === 'drawImage');

describe('renderStageToDataUrl', () => {
  it('returns null for a stage with nothing in it', async () => {
    for (const input of [null, '', '[]', 'not json']) {
      expect(await renderStageToDataUrl(input)).toBeNull();
    }
  });

  it('produces a PNG data URL', async () => {
    const url = await renderStageToDataUrl('[{"x":64,"y":64,"name":"brick0"}]');

    expect(url).toMatch(/^data:image\/png;base64,/);
    expect(toDataUrl).toHaveBeenCalledWith('image/png');
  });

  it('keeps pixel art crisp', async () => {
    await renderStageToDataUrl('[{"x":64,"y":64,"name":"brick0"}]');

    expect(context.imageSmoothingEnabled).toBe(false);
  });

  it('scales map coordinates to the image', async () => {
    // 400 of 800 across is the middle of the image.
    await renderStageToDataUrl('[{"x":400,"y":0,"name":"brick0"}]', { size: 240 });

    const [, , , , , , destX, destY, destW] = drawn()[0];
    expect(destX).toBe(120);
    expect(destY).toBe(0);
    expect(destW).toBe(TILE * (240 / MAP_WIDTH));
  });

  it('crops a sprite sheet to its first frame', async () => {
    // bell.png is 160x32: five frames. Only the first 32px may be read.
    await renderStageToDataUrl('[{"x":0,"y":0,"name":"bell"}]');

    const [, , srcX, srcY, srcW, srcH] = drawn()[0];
    expect([srcX, srcY, srcW, srcH]).toEqual([0, 0, 32, 32]);
  });

  it('draws the ball from its own 16px art', async () => {
    await renderStageToDataUrl('[{"x":0,"y":0,"name":"fireball"}]');

    const [, , , , srcW, srcH] = drawn()[0];
    expect([srcW, srcH]).toEqual([16, 16]);
  });

  it('tiles a horizontal run once per tile', async () => {
    await renderStageToDataUrl('[{"x":0,"y":0,"name":"rotator:7"}]');

    expect(drawn()).toHaveLength(7);
    const xs = drawn().map((call) => call[6]);
    expect(new Set(xs).size).toBe(7);
    // All on one row.
    expect(new Set(drawn().map((call) => call[7])).size).toBe(1);
  });

  it('tiles a vertical run downwards', async () => {
    await renderStageToDataUrl('[{"x":0,"y":0,"name":"platform_v:5"}]');

    expect(drawn()).toHaveLength(5);
    expect(new Set(drawn().map((call) => call[6])).size).toBe(1);
    expect(new Set(drawn().map((call) => call[7])).size).toBe(5);
  });

  it('draws the wall border and the sky', async () => {
    await renderStageToDataUrl('[{"x":64,"y":64,"name":"brick0"}]');

    const rects = context.calls.filter((c) => c[0] === 'fillRect');
    // Sky, then the four sides of the wall.
    expect(rects).toHaveLength(5);
    expect(rects[0][1]).toBe('#62a2bf');
    expect(rects.slice(1).every((r) => r[1] === '#3e6875')).toBe(true);
  });

  it('falls back to a solid block for an element with no art', async () => {
    await renderStageToDataUrl('[{"x":64,"y":64,"name":"mystery"}]');

    const rects = context.calls.filter((c) => c[0] === 'fillRect');
    expect(rects[rects.length - 1][1]).toBe('#ffd166');
    expect(drawn()).toHaveLength(0);
  });

  it('survives a sprite that will not load', async () => {
    Object.defineProperty(global.Image.prototype, 'src', {
      configurable: true,
      set() { setTimeout(() => this.onerror && this.onerror(), 0); },
    });

    const url = await renderStageToDataUrl('[{"x":64,"y":64,"name":"brick0"}]');

    // Still an image, with the missing sprite drawn as a block.
    expect(url).toMatch(/^data:image\/png/);
    expect(drawn()).toHaveLength(0);
  });
});

describe('thumbnailFor', () => {
  it('returns the data URL when it is small enough', async () => {
    expect(await thumbnailFor('[{"x":0,"y":0,"name":"bell"}]'))
      .toMatch(/^data:image\/png;base64,/);
  });

  it('refuses one that would bloat the document', async () => {
    // Firestore caps a document at 1 MiB in total, thumbnail included.
    toDataUrl.mockReturnValue('data:image/png;base64,' + 'A'.repeat(MAX_THUMBNAIL_BYTES));

    expect(await thumbnailFor('[{"x":0,"y":0,"name":"bell"}]')).toBeNull();
  });

  it('is well under the Firestore document limit', () => {
    expect(MAX_THUMBNAIL_BYTES).toBeLessThan(1024 * 1024);
    expect(THUMBNAIL_SIZE).toBeLessThanOrEqual(320);
  });

  it('never throws, so a bad thumbnail cannot stop a stage being saved', async () => {
    toDataUrl.mockImplementation(() => { throw new Error('tainted canvas'); });

    await expect(thumbnailFor('[{"x":0,"y":0,"name":"bell"}]')).resolves.toBeNull();
  });
});
