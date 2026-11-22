import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Save, SquarePen, FilePlus2, Pencil, CircleAlert, Loader2, Lock, Play } from 'lucide-react'
import './App.css'
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AddStageForm from './AddStageForm';
import MyStagesList from './MyStageList';
import StagePreview, { stageElements } from './StagePreview';
import { DRAFT_KEY } from '../game/src/stage_io.js';

const readDraft = () => {
  try {
    return window.localStorage.getItem(DRAFT_KEY);
  } catch (error) {
    console.warn("Could not read the saved stage:", error);
    return null;
  }
};

function SaveBuildPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  // Auth resolves asynchronously. Without this the page would decide you are
  // not the owner before Firebase has said who you are, and flash a refusal at
  // the actual author on every reload.
  const [authReady, setAuthReady] = useState(false);
  // With an :id this page edits that stored stage; otherwise it saves the
  // stage the editor just handed over through localStorage.
  const [stage, setStage] = useState(null);
  const [mapData, setMapData] = useState(() => (id ? null : readDraft()));
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!id) {
      setStage(null);
      setMapData(readDraft());
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStage = async () => {
      setLoading(true);
      setError(null);

      try {
        const snapshot = await getDoc(doc(db, "stages", id));

        if (cancelled) return;

        if (!snapshot.exists()) {
          setError("That stage no longer exists.");
          return;
        }

        const data = snapshot.data();
        setStage({ id: snapshot.id, ...data });
        setMapData(data.mapData || null);
      } catch (loadError) {
        console.error("Error loading stage:", loadError);
        if (!cancelled) setError("Could not load that stage.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStage();

    return () => { cancelled = true; };
  }, [id]);

  const elementCount = stageElements(mapData).length;

  // Only the author may edit a stored stage. A stage played from the gallery
  // can belong to anybody, so without this check /save/<any id> handed out an
  // edit form for someone else's stage — and to signed-out visitors too.
  //
  // This is the UX half only. Firestore rules are what actually prevent a
  // write; see AGENTS.md.
  const editingSomeoneElses = !!id && !!stage && (!user || stage.userId !== user.uid);
  const settling = loading || (!!id && !authReady);

  return (
    <>
      <div className="page-head">
        <h1>
          {id
            ? <SquarePen className="icon" aria-hidden="true" />
            : <Save className="icon" aria-hidden="true" />}
          {id ? "Edit stage" : "Save your stage"}
        </h1>
        <p className="hint">
          {id
            ? "Rename it or change its description."
            : "Name it and it goes in your collection."}
        </p>
      </div>

      {settling && (
        <p className="hint">
          <Loader2 className="icon spin" aria-hidden="true" />{' '}Loading stage…
        </p>
      )}
      {error && (
        <p className="status is-error">
          <CircleAlert className="icon" aria-hidden="true" />
          {error}
        </p>
      )}

      {!settling && !error && editingSomeoneElses && (
        <div className="panel">
          <div className="save-layout">
            <StagePreview mapData={mapData} thumbnail={stage.thumbnail} />
            <div>
              <h2><Lock className="icon" aria-hidden="true" />{stage.name || 'This stage'}</h2>
              <p className="status is-error">
                <CircleAlert className="icon" aria-hidden="true" />
                {user
                  ? 'This stage belongs to another player, so it cannot be edited here.'
                  : 'Only the author can edit a stage. Sign in from the top bar if it is yours.'}
              </p>
              <div className="actions">
                <Link className="button-link" to={`/play/${id}`}>
                  <Play className="icon" aria-hidden="true" />Play it instead
                </Link>
                <Link className="button-link ghost" to="/stages">
                  Browse stages
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {!settling && !error && !editingSomeoneElses && (
        <div className="panel">
          <div className="save-layout">
            {/* Drawn live, not from the stored thumbnail: this is the
                stage you are about to save, so it must show what is on the
                canvas now. */}
            <StagePreview
              mapData={mapData}
              caption={elementCount ? `${elementCount} element${elementCount === 1 ? "" : "s"}` : null}
            />
            <div>
              {!user && (
                <p className="status is-error">
                  <CircleAlert className="icon" aria-hidden="true" />
                  Sign in from the top bar to save a stage.
                </p>
              )}
              <AddStageForm
                mapData={mapData}
                stage={stage}
                onSaved={() => setReloadKey((key) => key + 1)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <MyStagesList key={reloadKey} />
      </div>

      <p className="hint">
        <Link to="/build?continue=1">
          <Pencil className="icon" aria-hidden="true" />Keep editing this stage
        </Link>
        {" · "}
        <Link to="/build"><FilePlus2 className="icon" aria-hidden="true" />Start a new one</Link>
      </p>
    </>
  )
}

export default SaveBuildPage
