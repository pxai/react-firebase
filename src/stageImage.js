// Renders a stage to a PNG data URL on an offscreen canvas.
//
// This is the "screenshot": it is not a capture of the running game, it is the
// same stage drawn directly from its mapData with the game's own sprites. That
// means no Phaser instance has to be booted, it works for any stage without
// playing it, and it is deterministic.
//
// The result is stored on the stage document as a base64 string. Two limits
// matter and both are enforced below:
//
//   * a Firestore document is capped at 1 MiB *in total*, thumbnail included
//   * every document the gallery lists carries its thumbnail down the wire,
//     so the image is kept small rather than merely legal
import { MAP_WIDTH, TILE } from '../game/src/layout.js';
import { SPRITE_BASE, COLOURS, stageElements } from './stageLayout.js';

export const THUMBNAIL_SIZE = 240;

// Well under Firestore's 1 MiB document limit, leaving room for everything
// else on the document. A 240px PNG of blocky pixel art should come in far
// below this; the check is here so an unexpectedly large one is dropped rather
// than making the stage itself unsavable.
export const MAX_THUMBNAIL_BYTES = 180 * 1024;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

export async function renderStageToDataUrl(mapData, { size = THUMBNAIL_SIZE } = {}) {
  const elements = stageElements(mapData);
  if (!elements.length) return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) return null;

  // 32px pixel art drawn small; smoothing turns it to mush.
  context.imageSmoothingEnabled = false;

  const scale = size / MAP_WIDTH;
  const wall = TILE * scale;

  context.fillStyle = COLOURS.sky;
  context.fillRect(0, 0, size, size);

  // The one-tile wall border every stage has.
  context.fillStyle = COLOURS.wall;
  context.fillRect(0, 0, size, wall);
  context.fillRect(0, size - wall, size, wall);
  context.fillRect(0, 0, wall, size);
  context.fillRect(size - wall, 0, wall, size);

  // Each distinct file once, and a failed load must not lose the whole image.
  const files = [...new Set(elements.filter((e) => e.sprite).map((e) => e.sprite.file))];
  const images = new Map();

  await Promise.all(
    files.map(async (file) => {
      try {
        images.set(file, await loadImage(`${SPRITE_BASE}${file}`));
      } catch (error) {
        console.warn(error.message);
      }
    })
  );

  for (const element of elements) {
    const image = element.sprite ? images.get(element.sprite.file) : null;

    if (!image) {
      context.fillStyle = COLOURS.unknown;
      context.fillRect(
        element.x * scale, element.y * scale,
        element.width * scale, element.height * scale
      );
      continue;
    }

    // First frame only: a sheet is `frames` frames wide.
    const frameWidth = image.naturalWidth / element.sprite.frames;
    const frameHeight = image.naturalHeight;

    // Tiled along the run of a sized element, in either direction.
    for (let offsetX = 0; offsetX < element.width; offsetX += TILE) {
      for (let offsetY = 0; offsetY < element.height; offsetY += TILE) {
        context.drawImage(
          image,
          0, 0, frameWidth, frameHeight,
          (element.x + offsetX) * scale, (element.y + offsetY) * scale,
          TILE * scale, TILE * scale
        );
      }
    }
  }

  try {
    return canvas.toDataURL('image/png');
  } catch (error) {
    // Only happens if the canvas is tainted, i.e. a sprite was served
    // cross-origin without CORS headers.
    console.warn('Could not read the stage thumbnail:', error);
    return null;
  }
}

// Generates a thumbnail that is safe to put on a Firestore document, or null.
// Never throws: a stage must stay savable even if its thumbnail fails.
export async function thumbnailFor(mapData, options) {
  try {
    const dataUrl = await renderStageToDataUrl(mapData, options);
    if (!dataUrl) return null;

    if (dataUrl.length > MAX_THUMBNAIL_BYTES) {
      console.warn(
        `Stage thumbnail is ${dataUrl.length} bytes, over the ` +
        `${MAX_THUMBNAIL_BYTES} limit; saving without one.`
      );
      return null;
    }

    return dataUrl;
  } catch (error) {
    console.warn('Could not render the stage thumbnail:', error);
    return null;
  }
}
