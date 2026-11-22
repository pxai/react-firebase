import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pencil, Trash2, X, Layers, LogIn, CircleAlert, Loader2 } from "lucide-react";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { stageElements } from "./StagePreview";

// The signed-in user's stages, with the three things you can do to one:
// play it, edit it, or delete it.
function MyStageList() {
  const navigate = useNavigate();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  // Delete is armed in place rather than through window.confirm, which the
  // browser can suppress and which reads as a crash in an iframe-heavy page.
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);

  const loadStages = useCallback(async (currentUser) => {
    if (!currentUser) {
      setStages([]);
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getDocs(
        query(collection(db, "stages"), where("userId", "==", currentUser.uid))
      );
      setStages(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      setError(null);
    } catch (loadError) {
      console.error("Error fetching stages:", loadError);
      setError("Could not load your stages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      loadStages(currentUser);
    });

    return () => unsubscribe();
  }, [loadStages]);

  const handleDelete = async (id) => {
    setBusy(id);

    try {
      await deleteDoc(doc(db, "stages", id));
      setStages((previous) => previous.filter((stage) => stage.id !== id));
      setConfirming(null);
    } catch (deleteError) {
      console.error("Error deleting stage:", deleteError);
      setError("Could not delete that stage.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <p className="hint">
        <Loader2 className="icon spin" aria-hidden="true" />{' '}Loading stages…
      </p>
    );
  }

  if (!user) {
    return (
      <p className="hint">
        <LogIn className="icon" aria-hidden="true" />{' '}Sign in to see your stages.
      </p>
    );
  }

  return (
    <div>
      <h2><Layers className="icon" aria-hidden="true" />Your stages</h2>

      {error && (
        <p className="status is-error">
          <CircleAlert className="icon" aria-hidden="true" />
          {error}
        </p>
      )}

      {stages.length === 0 ? (
        <p className="empty">No stages yet. Build one and save it.</p>
      ) : (
        <ul className="stage-list">
          {stages.map((stage) => {
            const count = stageElements(stage.mapData).length;
            const isConfirming = confirming === stage.id;

            return (
              <li key={stage.id} className={`stage-row ${isConfirming ? "is-confirming" : ""}`}>
                <div className="meta">
                  <span className="name">{stage.name || "Untitled stage"}</span>
                  <span className="sub">
                    {count} element{count === 1 ? "" : "s"}
                    {stage.description ? ` · ${stage.description}` : ""}
                  </span>
                </div>

                {isConfirming ? (
                  <div className="row-actions">
                    <span className="sub">Delete “{stage.name}” for good?</span>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(stage.id)}
                      disabled={busy === stage.id}
                    >
                      {busy === stage.id
                        ? <Loader2 className="icon spin" aria-hidden="true" />
                        : <Trash2 className="icon" aria-hidden="true" />}
                      {busy === stage.id ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button type="button" onClick={() => setConfirming(null)}>
                      <X className="icon" aria-hidden="true" />Cancel
                    </button>
                  </div>
                ) : (
                  <div className="row-actions">
                    <button type="button" className="primary" onClick={() => navigate(`/play/${stage.id}`)}>
                      <Play className="icon" aria-hidden="true" />Play
                    </button>
                    <button type="button" onClick={() => navigate(`/save/${stage.id}`)}>
                      <Pencil className="icon" aria-hidden="true" />Edit
                    </button>
                    <button type="button" className="danger" onClick={() => setConfirming(stage.id)}>
                      <Trash2 className="icon" aria-hidden="true" />Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MyStageList;
