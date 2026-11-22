import React from 'react';

// The game, in a same-origin iframe. The query string tells the game's
// bootloader which scene to start:
//
//   (none)           the fixed training stages
//   ?builder         the stage editor, empty
//   ?builder&draft   the stage editor, carrying on from the saved draft
//   ?play            a stored stage the site put in localStorage
const SEARCH = {
  build: '?builder',
  'build-draft': '?builder&draft',
  play: '?play',
};

export default function Game({ mode, draft = false }) {
  const key = mode === 'build' && draft ? 'build-draft' : mode;
  const search = SEARCH[key] || '';

  return (
    <div className="game-frame">
      <iframe
        src={`/game/index.html${search}`}
        title="txokas game"
        width="1024"
        height="800"
      />
    </div>
  );
}
