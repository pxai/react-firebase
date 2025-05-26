
import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

function EditStageForm({ stageId, onUpdated, mapData }) {
  const [stageData, setStageData] = useState({ name: "", description: "", mapData });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const fetchStage = async () => {
      try {
        const ref = doc(db, "stages", stageId);
        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
          setStatus("Stage not found.");
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId || data.userId !== currentUserId) {
          setStatus("You are not authorized to edit this stage.");
          setLoading(false);
          return;
        }

        setStageData({
          name: data.name || "",
          description: data.description || "",
          mapData: data.mapData || ""
        });

        setStatus("");
      } catch (error) {
        console.error("Error loading stage:", error);
        setStatus("Failed to load stage.");
      } finally {
        setLoading(false);
      }
    };

    fetchStage();
  }, [stageId]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setStageData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Updating...");

    try {
      await updateDoc(doc(db, "stages", stageId), {
        name: stageData.name,
        description: stageData.description,
        mapData: stageData.description,
      });
      setStatus("Stage updated.");
      if (onUpdated) onUpdated(); // Optional callback
    } catch (error) {
      console.error("Error updating stage:", error);
      setStatus("Update failed.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (status) return <p>{status}</p>;

  return (
    <form onSubmit={handleSubmit}>
      <h3>Edit Stage</h3>
      <label>
        Name:
        <input
          type="text"
          name="name"
          value={stageData.name}
          onChange={handleChange}
        />
      </label>
      <br />
      <label>
        Description:
        <textarea
          name="description"
          value={stageData.description}
          onChange={handleChange}
        />
      </label>
      <br />
      <button type="submit">Update</button>
      <p>{status}</p>
    </form>
  );
}

export default EditStageForm;
