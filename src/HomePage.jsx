import { useState, useEffect } from 'react'
import './App.css'
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import AddStageForm from './AddStageForm';
import MyStagesList from './MyStageList';
import Game from './Game';

function HomePage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Game />
      <div className="card">
        {user && <AddStageForm />}
      </div>
      <div className="read-the-docs">
        <MyStagesList />
      </div>
    </>
  )
}

export default HomePage
