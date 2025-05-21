import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

function MyStageList() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const q = query(
            collection(db, "stages"),
            where("userId", "==", currentUser.uid)
          );

          const snapshot = await getDocs(q);
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
      } else {
        setStages([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    try {
      const confirmed = window.confirm("Are you sure?")
      console.log("is it confirmed? ", confirmed)
      if (!confirmed) return

      await deleteDoc(doc(db, "stages", id));
      setStages(stages.filter(stage => stage.id !== id));
    } catch (error) {
      console.error("Error deleting stage:", error);
    }
  };

  if (loading) return <p>Loading stages...</p>;

  if (!user) return <p>Please sign in to view your stages.</p>;

  return (
    <div>
      <h2>Your Stages</h2>
      {stages.length === 0 ? (
        <p>No stages found for this user.</p>
      ) : (
        <ul>
          {stages.map(stage => (
            <li key={stage.id}>
              <strong>{stage.name}</strong> — {stage.stage}
              <button onClick={() => handleDelete(stage.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyStageList;
