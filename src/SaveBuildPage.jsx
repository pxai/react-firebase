import { useState, useEffect } from 'react'
import './App.css'
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import AddStageForm from './AddStageForm';
import MyStagesList from './MyStageList';

function SaveBuildPage() {
  const [user, setUser] = useState(null)
  const mapData = window.localStorage.getItem("currentMap")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <AddStageForm mapData={mapData}/>
      <div className="read-the-docs">
        <MyStagesList />
      </div>
    </>
  )
}

export default SaveBuildPage
