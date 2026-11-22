import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './App.css';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import Game from './Game';
import StagePreview from './StagePreview';
import { PLAY_KEY } from '../game/src/stage_io.js';

// Plays a stored stage.
//
// This is the half of the loop that was missing: stages were saved to Firestore
// and never read back. The stage is handed to the game through localStorage,
// which works because the game runs in a same-origin iframe — the same channel
// the editor already uses to hand a stage to the save page. The game converts
// the stored map coordinates itself.
function PlayPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading', stage: null });

  useEffect(() => {
    let cancelled = false;

    const loadStage = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'stages', id));
        if (cancelled) return;

        if (!snapshot.exists()) {
          setState({ status: 'missing', stage: null });
          return;
        }

        const stage = { id: snapshot.id, ...snapshot.data() };

        if (!stage.mapData) {
          setState({ status: 'empty', stage });
          return;
        }

        // Written before the iframe mounts, so the game finds it on boot.
        window.localStorage.setItem(PLAY_KEY, stage.mapData);
        setState({ status: 'ready', stage });
      } catch (error) {
        console.error('Error loading stage:', error);
        if (!cancelled) setState({ status: 'error', stage: null });
      }
    };

    loadStage();

    return () => { cancelled = true; };
  }, [id]);

  const { status, stage } = state;

  return (
    <>
      <div className="page-head">
        <h1>{stage?.name || 'Play stage'}</h1>
        <p className="hint">
          {stage?.description || 'Drag the ball back and let go.'}
        </p>
      </div>

      {status === 'loading' && <p className="hint">Loading stage…</p>}

      {status === 'missing' && (
        <p className="status is-error">That stage no longer exists.</p>
      )}

      {status === 'error' && (
        <p className="status is-error">Could not load that stage.</p>
      )}

      {status === 'empty' && (
        <div className="panel">
          <p className="status is-error">This stage has no layout saved.</p>
          <StagePreview mapData={null} size={260} />
        </div>
      )}

      {/* Mounted only once the stage is in localStorage: the game reads it
          during boot, so an earlier iframe would load the previous stage. */}
      {status === 'ready' && <Game mode="play" />}

      <p className="hint">
        <Link to="/save">Back to your stages</Link>
      </p>
    </>
  );
}

export default PlayPage;
