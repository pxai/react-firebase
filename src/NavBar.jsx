import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { Bell, Hammer } from 'lucide-react';
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
      <div>
        <Link to="/"><Bell className="icon" aria-hidden="true" />TXOKAS.com</Link>
      </div>
        { !user
          ? <GoogleLogin />
          : <><AuthStatus /> | <Link to="/build"><Hammer className="icon" aria-hidden="true" />Build</Link><Logout /></>
        }
    </nav>
  )
}

export default NavBar;