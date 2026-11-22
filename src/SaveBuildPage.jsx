import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
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

  return (
    <>
      <div className="page-head">
        <h1>{id ? "Edit stage" : "Save your stage"}</h1>
        <p className="hint">
          {id
            ? "Rename it or change its description."
            : "Name it and it goes in your collection."}
        </p>
      </div>

      {loading && <p className="hint">Loading stage…</p>}
      {error && <p className="status is-error">{error}</p>}

      {!loading && !error && (
        <div className="panel">
          <div className="save-layout">
            <StagePreview
              mapData={mapData}
              caption={elementCount ? `${elementCount} element${elementCount === 1 ? "" : "s"}` : null}
            />
            <div>
              {!user && (
                <p className="status is-error">Sign in from the top bar to save a stage.</p>
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
        <Link to="/build?continue=1">Keep editing this stage</Link>
        {" · "}
        <Link to="/build">Start a new one</Link>
      </p>
    </>
  )
}

export default SaveBuildPage
