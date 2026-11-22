import React from 'react';
import { MAP_WIDTH, MAP_HEIGHT } from '../game/src/layout.js';
import { SPRITE_BASE, stageElements } from './stageLayout.js';

// Re-exported because several pages import it from here.
export { stageElements };

// A thumbnail of a stage, drawn from its stored mapData.
//
// It reads the game's own modules so the preview cannot disagree with what the
// game builds: parseStage for the coordinates, parsePlacedName for how long a
// sized element is. Those three modules are pure (no Phaser), which is what
// makes them safe to import into the React bundle.
//
// Elements are positioned as percentages of the 800x800 map, so the preview
// works at any size.

const percent = (value, total) => `${(value / total) * 100}%`;

function StagePreview({ mapData, caption, size, thumbnail }) {
  const elements = stageElements(mapData);
  const style = size ? { width: size, maxWidth: '100%' } : undefined;

  // A stage saved recently carries a rendered PNG. Older stages do not, so the
  // live render below is both the fallback and the reason no migration is
  // needed.
  if (thumbnail) {
    return (
      <div>
        <img className="stage-preview" src={thumbnail} alt="" style={style} />
        {caption && <p className="preview-caption">{caption}</p>}
      </div>
    );
  }

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
                    backgroundImage: `url(${SPRITE_BASE}${element.sprite.file})`,
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
