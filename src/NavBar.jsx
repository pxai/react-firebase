import { useState, useEffect } from 'react'
import { Link } from "react-router-dom";
import GoogleLogin from './GoogleLogin'
import AuthStatus from './AuthStatus'
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Logout from './Logout'

function NavBar () {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <nav className="top-bar">
      <Link to="/">XOKAS</Link> | <Link to="/about">About</Link> |&nbsp;
        { !user
          ? <GoogleLogin />
          : <><AuthStatus /> | <Logout /></>
        }
    </nav>
  )
}

export default NavBar;