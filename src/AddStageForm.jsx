import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Tag, AlignLeft, Pencil, CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { db, auth } from "./firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { DRAFT_KEY } from "../game/src/stage_io.js";
import { thumbnailFor } from "./stageImage";

// Saves the stage the editor just built, or updates one that already exists.
//
// This replaces the old EditStageForm, which was never mounted and whose
// updateDoc wrote `mapData: stageData.description` — saving a stage through it
// would have overwritten the layout with the description text.
function AddStageForm({ mapData, stage, onSaved }) {
  const navigate = useNavigate();
  const editing = !!stage?.id;

  const [formData, setFormData] = useState({
    name: stage?.name || "",
    description: stage?.description || "",
  });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  // The editor starts from the draft in localStorage, so hand this stage over
  // before going there. For a stage just built this rewrites the same data; for
  // a stored stage it is what makes "edit" open the stage rather than a blank
  // canvas. Only ever called from the button, so viewing a stored stage does
  // not quietly replace a draft in progress.
  const openEditor = () => {
    try {
      if (mapData) window.localStorage.setItem(DRAFT_KEY, mapData);
    } catch (error) {
      console.warn("Could not hand the stage to the editor:", error);
    }
    navigate("/build?continue=1");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      setStatus({ kind: "error", text: "You must be signed in to save a stage." });
      return;
    }

    if (!formData.name.trim()) {
      setStatus({ kind: "error", text: "Give the stage a name." });
      return;
    }

    if (!mapData) {
      setStatus({ kind: "error", text: "There is no stage to save. Build one first." });
      return;
    }

    // Only the author may change a stored stage. SaveBuildPage already refuses
    // to render this form for someone else's stage; this is the second lock, so
    // that a future page cannot reintroduce the hole by mounting the form.
    if (editing && stage.userId && stage.userId !== user.uid) {
      setStatus({ kind: "error", text: "This stage belongs to another player." });
      return;
    }

    setSaving(true);
    setStatus({ kind: "info", text: editing ? "Updating…" : "Saving…" });

    // A base64 PNG of the stage, stored on the document. Returns null rather
    // than throwing if the sprites fail to load or the image comes out too
    // large, so a thumbnail problem can never stop a stage being saved.
    const thumbnail = await thumbnailFor(mapData);

    try {
      if (editing) {
        // mapData is deliberately included: editing a stage keeps whatever
        // layout is on screen, which is the one being previewed.
        await updateDoc(doc(db, "stages", stage.id), {
          name: formData.name.trim(),
          description: formData.description,
          mapData,
          // Only written when we have one, so a failed render leaves the
          // existing thumbnail in place rather than blanking it.
          ...(thumbnail ? { thumbnail } : {}),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "stages"), {
          name: formData.name.trim(),
          description: formData.description,
          mapData,
          ...(thumbnail ? { thumbnail } : {}),
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName,
          createdAt: serverTimestamp(),
        });
      }

      setStatus({ kind: "ok", text: editing ? "Stage updated." : "Stage saved." });
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving stage:", error);
      setStatus({ kind: "error", text: "Could not save the stage. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="stage-name">
          <Tag className="icon" aria-hidden="true" />Stage name
        </label>
        <input
          id="stage-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Castle of doom"
          maxLength={60}
        />
      </div>

      <div className="field">
        <label htmlFor="stage-description">
          <AlignLeft className="icon" aria-hidden="true" />Description
        </label>
        <textarea
          id="stage-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="How should this stage be played?"
          maxLength={400}
        />
      </div>

      <div className="actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving
            ? <Loader2 className="icon spin" aria-hidden="true" />
            : <Save className="icon" aria-hidden="true" />}
          {editing ? "Update stage" : "Save stage"}
        </button>
        <button type="button" onClick={openEditor}>
          <Pencil className="icon" aria-hidden="true" />
          {editing ? "Open in the editor" : "Back to editing"}
        </button>
      </div>

      {status && (
        <p className={`status ${status.kind === "error" ? "is-error" : status.kind === "ok" ? "is-ok" : ""}`}>
          {status.kind === "error" && <CircleAlert className="icon" aria-hidden="true" />}
          {status.kind === "ok" && <CircleCheck className="icon" aria-hidden="true" />}
          {status.kind === "info" && <Loader2 className="icon spin" aria-hidden="true" />}
          {status.text}
        </p>
      )}
    </form>
  );
}

export default AddStageForm;
