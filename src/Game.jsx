import React from 'react';

export default function Game({mode}) {
  const param = mode === "build" ? '?builder' : ''
  console.log("Loading game as: ", mode, param)
  return (
    <div style={{ width: '100%', height: '100%', border: 'none' }}>
      <iframe
        src={`/game/index.html${param}`}
        title="txokas game"
        width="1000px"
        height="800px"
        style={{ border: 'none' }}
      />
    </div>
  );
}