import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Play, Hammer, ArrowLeft, CircleAlert, Loader2, ImageOff } from 'lucide-react';
import './App.css';
import { db } from './firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import StagePreview, { stageElements } from './StagePreview';

// The newest stages from everyone, as a playable gallery.
//
// Every stage ever saved carries `createdAt` (the original save form set it
// too), so ordering on it will not silently drop older documents the way
// orderBy does when the field is missing.
const HOW_MANY = 24;

function LatestStagesPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', stages: [] });

  useEffect(() => {
    let cancelled = false;

    const loadStages = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'stages'), orderBy('createdAt', 'desc'), limit(HOW_MANY))
        );

        if (cancelled) return;

        setState({
          status: 'ready',
          stages: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
        });
      } catch (error) {
        console.error('Error loading the latest stages:', error);
        if (!cancelled) {
          // Reading other people's stages needs Firestore rules that allow it.
          // A denied read lands here, so say something useful rather than
          // showing an empty gallery.
          setState({
            status: error?.code === 'permission-denied' ? 'denied' : 'error',
            stages: [],
          });
        }
      }
    };

    loadStages();

    return () => { cancelled = true; };
  }, []);

  const { status, stages } = state;

  return (
    <>
      <div className="page-head">
        <h1><Sparkles className="icon" aria-hidden="true" />Latest stages</h1>
        <p className="hint">Made by players. Newest first.</p>
      </div>

      {status === 'loading' && (
        <p className="hint">
          <Loader2 className="icon spin" aria-hidden="true" />{' '}Loading stages…
        </p>
      )}

      {status === 'denied' && (
        <p className="status is-error">
          <CircleAlert className="icon" aria-hidden="true" />
          These stages are not readable with the current Firestore rules.
        </p>
      )}

      {status === 'error' && (
        <p className="status is-error">
          <CircleAlert className="icon" aria-hidden="true" />
          Could not load the latest stages.
        </p>
      )}

      {status === 'ready' && stages.length === 0 && (
        <div className="panel">
          <p className="empty">No stages have been shared yet.</p>
          <p className="hint" style={{ marginTop: '10px' }}>
            <Link to="/build"><Hammer className="icon" aria-hidden="true" />Be the first to build one</Link>
          </p>
        </div>
      )}

      {status === 'ready' && stages.length > 0 && (
        <ul className="stage-gallery">
          {stages.map((stage) => {
            const count = stageElements(stage.mapData).length;

            return (
              <li key={stage.id} className="stage-card">
                <StagePreview mapData={stage.mapData} thumbnail={stage.thumbnail} />

                <div className="stage-card-body">
                  <span className="name">{stage.name || 'Untitled stage'}</span>
                  <span className="sub">
                    {stage.userName ? `by ${stage.userName} · ` : ''}
                    {count} element{count === 1 ? '' : 's'}
                  </span>
                  {stage.description && <p className="sub">{stage.description}</p>}
                </div>

                <button
                  type="button"
                  className="primary"
                  disabled={count === 0}
                  onClick={() => navigate(`/play/${stage.id}`)}
                >
                  {count === 0
                    ? <ImageOff className="icon" aria-hidden="true" />
                    : <Play className="icon" aria-hidden="true" />}
                  {count === 0 ? 'No layout' : 'Play'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="hint">
        <Link to="/"><ArrowLeft className="icon" aria-hidden="true" />Back to the game</Link>
        {' · '}
        <Link to="/build"><Hammer className="icon" aria-hidden="true" />Build your own</Link>
      </p>
    </>
  );
}

export default LatestStagesPage;
