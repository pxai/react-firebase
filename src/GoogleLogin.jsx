// GoogleLogin.js
import React from 'react';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

function GoogleLogin() {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Logged in, User Info:", result, result.user);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return <button onClick={handleLogin}>Sign in with Google</button>;
}

export default GoogleLogin;
