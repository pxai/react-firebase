import { useState, useEffect } from 'react'
import './App.css'
import GoogleLogin from './GoogleLogin'
import AuthStatus from './AuthStatus'
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Logout from './Logout'
import AddStageForm from './AddStageForm';
import MyStagesList from './MyStageList';
import Game from './Game';

function HomePage() {
  const [count, setCount] = useState(0)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <div>
        { !user
          ? <GoogleLogin />
          : <div><AuthStatus /><Logout /></div>
        }
      </div>
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
