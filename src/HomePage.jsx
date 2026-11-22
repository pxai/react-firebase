import React from 'react';
import { Link } from 'react-router-dom';
import './App.css'
import MyStagesList from './MyStageList';
import Game from './Game';

function HomePage() {
  return (
    <>
      <div className="page-head">
        <h1>Txokas</h1>
        <p className="hint">Hit the bell. Drag the ball back and let go.</p>
      </div>

      {/* The demo: the fixed training stages. */}
      <Game />

      <div className="panel home-links">
        <div>
          <h2>Stages by players</h2>
          <p className="hint">Play the newest stages people have built.</p>
        </div>
        <div className="actions">
          <Link className="button-link" to="/stages">Play latest stages</Link>
          <Link className="button-link ghost" to="/build">Build your own</Link>
        </div>
      </div>

      <div className="panel">
        <MyStagesList />
      </div>
    </>
  )
}

export default HomePage
