import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

function StagesList() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const snapshot = await getDocs(collection(db, "stages"));
        const stageData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStages(stageData);
      } catch (error) {
        console.error("Error fetching stages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, []);

  if (loading) return <p>Loading stages...</p>;

  return (
    <div>
      <h2>Stages</h2>
      {stages.length === 0 ? (
        <p>No stages found.</p>
      ) : (
        <ul>
          {stages.map(stage => (
            <li key={stage.id}>
              <strong>{stage.name}</strong> — {stage.stage}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StagesList;
