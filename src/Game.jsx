import React from 'react';

export default function Game() {
  return (
    <div style={{ width: '100%', height: '100%', border: 'none' }}>
      <iframe
        src="/game/index.html"
        title="txokas game"
        width="1000px"
        height="800px"
        style={{ border: 'none' }}
      />
    </div>
  );
}