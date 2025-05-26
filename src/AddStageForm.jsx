import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "./firebase";

function AddStageForm({mapData}) {
  const [formData, setFormData] = useState({ name: "", message: "", mapData });
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Sending...");

    const user = auth.currentUser;

    if (!user) {
      setStatus("You must be logged in to submit.");
      return;
    }

    try {
      await addDoc(collection(db, "stages"), {
        name: formData.name,
        stage: formData.stage,
        mapData: formData.mapData,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        createdAt: serverTimestamp(),
      });

      setStatus("Message sent!");
      setFormData({ name: "", message: "" });
    } catch (error) {
      console.error("Error adding document:", error);
      setStatus("Failed to send message.");
    }
  };

  return (
    <div>
    {!status &&
      <form onSubmit={handleSubmit}>
        <div>
          <label>Stage Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
          />
        </div>
        <div>
          <label>Stage:</label>
          <textarea
            name="stage"
            value={formData.stage}
            onChange={handleChange}
            placeholder="Your stage"
          />
        </div>
        <button type="submit">Submit</button>
      </form>
      }
      {status && <p>{status}</p>}
      {status && <button onClick={() => setStatus("")}>Again</button>}
    </div>
  );
}

export default AddStageForm;
