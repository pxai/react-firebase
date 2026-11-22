import React from 'react';
import { parsePlacedName } from '../game/src/elements.js';
import { parseStage } from '../game/src/stage_io.js';
import { MAP_WIDTH, MAP_HEIGHT, toMapX, toMapY } from '../game/src/layout.js';

// A thumbnail of a stage, drawn from its stored mapData.
//
// It reads the game's own modules so the preview cannot disagree with what the
// game builds: parseStage for the coordinates, parsePlacedName for how long a
// sized element is. Those three modules are pure (no Phaser), which is what
// makes them safe to import into the React bundle.
//
// Elements are positioned as percentages of the 800x800 map, so the preview
// works at any size.

// Sprites live under /game/assets/ in both dev (proxied to the game's dev
// server) and production (built into public/game/). `frames` is how many 32px
// frames the file holds, which is how the first one gets cropped out.
const SPRITES = {
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

const spriteFor = (name) => {
  const { kind } = parsePlacedName(name);
  // The platforms have no art of their own; they are built from rotator tiles.
  if (kind === 'platform_h' || kind === 'platform_v' || kind === 'rotator') {
    return SPRITES.rotator;
  }
  return SPRITES[name] || null;
};

const percent = (value, total) => `${(value / total) * 100}%`;

export function stageElements(mapData) {
  // parseStage gives canvas coordinates; convert back to map coordinates so
  // positions are relative to the 800x800 map the preview draws.
  return parseStage(mapData).map((element, index) => {
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
}

function StagePreview({ mapData, caption, size }) {
  const elements = stageElements(mapData);
  const style = size ? { width: size, maxWidth: '100%' } : undefined;

  if (!elements.length) {
    return (
      <div>
        <div className="stage-preview is-empty" style={style}>
          Nothing placed yet
        </div>
        {caption && <p className="preview-caption">{caption}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="stage-preview" style={style}>
        <div className="wall" />
        {elements.map((element) => (
          <div
            key={element.key}
            className="element"
            title={element.name}
            style={{
              left: percent(element.x, MAP_WIDTH),
              top: percent(element.y, MAP_HEIGHT),
              width: percent(element.width, MAP_WIDTH),
              height: percent(element.height, MAP_HEIGHT),
              ...(element.sprite
                ? {
                    backgroundImage: `url(/game/assets/images/${element.sprite.file})`,
                    // Scale the sheet so ONE 32px frame covers one tile of the
                    // element, then repeat along a sized element's run. The
                    // frame count has to be in the width or a 5-frame sheet
                    // like bell.png gets squashed into a single tile.
                    backgroundSize: `${((element.sprite.frames * 32) / element.width) * 100}% ${(32 / element.height) * 100}%`,
                    backgroundRepeat: 'repeat',
                  }
                : { background: 'var(--accent)' }),
            }}
          />
        ))}
      </div>
      {caption && <p className="preview-caption">{caption}</p>}
    </div>
  );
}

export default StagePreview;
