import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Play, Hammer } from 'lucide-react';
import './App.css'
import MyStagesList from './MyStageList';
import Game from './Game';

function HomePage() {
  return (
    <>
      {/* The demo: the fixed training stages. It speaks for itself, so there
          is no page title above it. */}
      <Game />

      <div className="panel home-links">
        <div>
          <h2><Gamepad2 className="icon" aria-hidden="true" />Stages by players</h2>
          <p className="hint">Play the newest stages people have built.</p>
        </div>
        <div className="actions">
          <Link className="button-link" to="/stages">
            <Play className="icon" aria-hidden="true" />Play latest stages
          </Link>
          <Link className="button-link ghost" to="/build">
            <Hammer className="icon" aria-hidden="true" />Build your own
          </Link>
        </div>
      </div>

      <div className="panel">
        <MyStagesList />
      </div>
    </>
  )
}

export default HomePage
