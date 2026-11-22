import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, ArrowLeft, CircleAlert, Loader2 } from 'lucide-react';
import './App.css';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import Game from './Game';
import StagePreview from './StagePreview';
import { PLAY_KEY } from '../game/src/stage_io.js';
import { recordStageOpen, recordStageAttempt, parseAttemptMessage } from './analytics';

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

  // One open per stage actually loaded. The ref is needed because StrictMode
  // runs effects twice in development, which would double every count.
  const opened = useRef(null);

  useEffect(() => {
    if (state.status !== 'ready' || opened.current === id) return;

    opened.current = id;
    recordStageOpen(id);
  }, [id, state.status]);

  // Attempts are reported by the game over postMessage, because the game has
  // no Firebase of its own. The stage id comes from the route, never from the
  // message.
  useEffect(() => {
    if (!id) return undefined;

    const onMessage = (event) => {
      const attempt = parseAttemptMessage(event, window.location.origin);
      if (!attempt) return;

      recordStageAttempt({ stageId: id, ...attempt });
    };

    window.addEventListener('message', onMessage);

    return () => window.removeEventListener('message', onMessage);
  }, [id]);

  const { status, stage } = state;

  return (
    <>
      <div className="page-head">
        <h1>
          <Play className="icon" aria-hidden="true" />
          {stage?.name || 'Play stage'}
        </h1>
        <p className="hint">
          {stage?.description || 'Drag the ball back and let go.'}
        </p>
      </div>

      {status === 'loading' && (
        <p className="hint">
          <Loader2 className="icon spin" aria-hidden="true" />{' '}Loading stage…
        </p>
      )}

      {status === 'missing' && (
        <p className="status is-error">
          <CircleAlert className="icon" aria-hidden="true" />
          That stage no longer exists.
        </p>
      )}

      {status === 'error' && (
        <p className="status is-error">
          <CircleAlert className="icon" aria-hidden="true" />
          Could not load that stage.
        </p>
      )}

      {status === 'empty' && (
        <div className="panel">
          <p className="status is-error">
            <CircleAlert className="icon" aria-hidden="true" />
            This stage has no layout saved.
          </p>
          <StagePreview mapData={null} size={260} />
        </div>
      )}

      {/* Mounted only once the stage is in localStorage: the game reads it
          during boot, so an earlier iframe would load the previous stage. */}
      {status === 'ready' && <Game mode="play" />}

      <p className="hint">
        <Link to="/save"><ArrowLeft className="icon" aria-hidden="true" />Back to your stages</Link>
      </p>
    </>
  );
}

export default PlayPage;
