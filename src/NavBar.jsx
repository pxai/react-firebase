import React, { useState, useEffect } from 'react';
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
      <div><Link to="/">TXOKAS.com</Link></div>
        { !user
          ? <GoogleLogin />
          : <><AuthStatus /> | <Link to="/build">Build</Link><Logout /></>
        }
    </nav>
  )
}

export default NavBar;